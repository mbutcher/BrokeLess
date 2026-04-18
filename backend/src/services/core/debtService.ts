import { debtRepository } from '@repositories/debtRepository';
import { accountRepository } from '@repositories/accountRepository';
import { transactionRepository } from '@repositories/transactionRepository';
import { AppError } from '@middleware/errorHandler';
import logger from '@utils/logger';
import type {
  DebtSchedule,
  MinimumPaymentType,
  TransactionSplit,
  UpsertDebtScheduleData,
  AmortizationRow,
  AmortizationSchedule,
  WhatIfResult,
} from '@typings/core.types';

const round2 = (n: number): number => Math.round(n * 100) / 100;

// ─── Fixed-term amortization (loans / mortgages) ──────────────────────────────

const PERIODS_PER_YEAR: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

function buildAmortizationRows(
  principal: number,
  annualRate: number,
  termMonths: number,
  paymentAmount: number,
  frequency: string = 'monthly'
): AmortizationRow[] {
  const periodsPerYear = PERIODS_PER_YEAR[frequency] ?? 12;
  const periodicRate = annualRate / periodsPerYear;
  const totalPeriods = Math.round((termMonths * periodsPerYear) / 12);
  let balance = principal;
  const rows: AmortizationRow[] = [];

  for (let period = 1; period <= totalPeriods && balance > 0.005; period++) {
    const interest = round2(balance * periodicRate);
    const principalPaid = round2(Math.min(paymentAmount - interest, balance));
    balance = round2(balance - principalPaid);
    rows.push({
      month: period,
      payment: round2(principalPaid + interest),
      principal: principalPaid,
      interest,
      balance,
    });
  }

  return rows;
}

// ─── Revolving credit payoff (CC / LOC) ──────────────────────────────────────

function computeMinPayment(
  balance: number,
  type: MinimumPaymentType | null,
  amount: number | null,
  percent: number | null
): number {
  const fixedAmt = amount ?? 25;
  const pct = percent ?? 0.02;

  switch (type) {
    case 'fixed':
      return fixedAmt;
    case 'percentage':
      return round2(balance * pct);
    case 'greater_of':
      return Math.max(fixedAmt, round2(balance * pct));
    case 'lesser_of':
      return Math.min(fixedAmt, round2(balance * pct));
    default:
      return fixedAmt;
  }
}

/** Iterative payoff simulation for CC / LOC accounts. */
function buildCCPayoffRows(
  startBalance: number,
  annualRate: number,
  minPaymentType: MinimumPaymentType | null,
  minPaymentAmount: number | null,
  minPaymentPercent: number | null,
  extraMonthly: number = 0
): AmortizationRow[] {
  const monthlyRate = annualRate / 12;
  let balance = startBalance;
  const rows: AmortizationRow[] = [];
  const MAX_MONTHS = 999; // safety cap against 0-rate / no-payment edge cases

  for (let month = 1; month <= MAX_MONTHS && balance > 0.005; month++) {
    const interest = round2(balance * monthlyRate);
    const minPay = computeMinPayment(balance, minPaymentType, minPaymentAmount, minPaymentPercent);
    // Total payment must at least cover interest + $0.01 principal to make progress
    const totalPay = round2(
      Math.min(Math.max(minPay + extraMonthly, interest + 0.01), balance + interest)
    );
    const principalPaid = round2(totalPay - interest);
    balance = round2(Math.max(balance - principalPaid, 0));

    rows.push({
      month,
      payment: totalPay,
      principal: principalPaid,
      interest,
      balance,
    });
  }

  return rows;
}

function addPeriods(dateStr: string, periods: number, frequency: string = 'monthly'): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  switch (frequency) {
    case 'weekly':
      d.setUTCDate(d.getUTCDate() + periods * 7);
      break;
    case 'biweekly':
      d.setUTCDate(d.getUTCDate() + periods * 14);
      break;
    case 'semimonthly':
      // 24 periods ≈ 1 year (365.25 days)
      d.setUTCDate(d.getUTCDate() + Math.round((periods * 365.25) / 24));
      break;
    default: // monthly
      d.setUTCMonth(d.getUTCMonth() + periods);
      break;
  }
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** True for CC / LOC schedules (no fixed term). */
function isRevolving(schedule: DebtSchedule): boolean {
  return schedule.termMonths == null;
}

class DebtService {
  async getSchedule(userId: string, accountId: string): Promise<DebtSchedule | null> {
    return debtRepository.findByUserAndAccount(userId, accountId);
  }

  async upsertSchedule(userId: string, data: UpsertDebtScheduleData): Promise<DebtSchedule> {
    const account = await accountRepository.findById(data.accountId, userId);
    if (!account) throw new AppError('Account not found', 404);
    const schedule = await debtRepository.upsert(userId, data);
    // Sync purchase APR to accounts.annual_rate so cards display it immediately
    await accountRepository.update(data.accountId, userId, { annualRate: data.annualRate });
    return schedule;
  }

  async deleteSchedule(userId: string, accountId: string): Promise<void> {
    const existing = await debtRepository.findByUserAndAccount(userId, accountId);
    if (!existing) throw new AppError('Debt schedule not found', 404);
    await debtRepository.delete(userId, accountId);
  }

  async getAmortizationSchedule(userId: string, accountId: string): Promise<AmortizationSchedule> {
    const schedule = await debtRepository.findByUserAndAccount(userId, accountId);
    if (!schedule) throw new AppError('Debt schedule not found', 404);

    let rows: AmortizationRow[];
    let payoffDate: string;

    if (isRevolving(schedule)) {
      // CC / LOC — start from current account balance
      const account = await accountRepository.findById(accountId, userId);
      if (!account) throw new AppError('Account not found', 404);
      const balance = Math.abs(account.currentBalance);
      rows = buildCCPayoffRows(
        balance,
        schedule.annualRate,
        schedule.minimumPaymentType,
        schedule.minimumPaymentAmount,
        schedule.minimumPaymentPercent
      );
      payoffDate = addPeriods(todayIso(), rows.length);
    } else {
      // Loan / Mortgage
      const principal = schedule.principal ?? 0;
      const termMonths = schedule.termMonths ?? 0;
      const paymentAmount = schedule.paymentAmount ?? 0;
      const frequency = schedule.paymentFrequency ?? 'monthly';
      rows = buildAmortizationRows(
        principal,
        schedule.annualRate,
        termMonths,
        paymentAmount,
        frequency
      );
      const startDate = schedule.originationDate ?? schedule.asOfDate ?? todayIso();
      payoffDate = addPeriods(startDate, rows.length, frequency);
    }

    const totalInterest = round2(rows.reduce((sum, r) => sum + r.interest, 0));

    return { schedule: rows, totalInterest, payoffDate };
  }

  async whatIfExtraPayment(
    userId: string,
    accountId: string,
    extraMonthly: number
  ): Promise<WhatIfResult> {
    const schedule = await debtRepository.findByUserAndAccount(userId, accountId);
    if (!schedule) throw new AppError('Debt schedule not found', 404);

    let originalRows: AmortizationRow[];
    let newRows: AmortizationRow[];
    let startDate: string;
    let payFrequency = 'monthly';

    if (isRevolving(schedule)) {
      // CC / LOC — simulate from current balance (always monthly periods)
      const account = await accountRepository.findById(accountId, userId);
      if (!account) throw new AppError('Account not found', 404);
      const balance = Math.abs(account.currentBalance);
      startDate = todayIso();
      originalRows = buildCCPayoffRows(
        balance,
        schedule.annualRate,
        schedule.minimumPaymentType,
        schedule.minimumPaymentAmount,
        schedule.minimumPaymentPercent,
        0
      );
      newRows = buildCCPayoffRows(
        balance,
        schedule.annualRate,
        schedule.minimumPaymentType,
        schedule.minimumPaymentAmount,
        schedule.minimumPaymentPercent,
        extraMonthly
      );
    } else {
      // Loan / Mortgage — convert monthly extra to per-period extra
      const principal = schedule.principal ?? 0;
      const termMonths = schedule.termMonths ?? 0;
      const paymentAmount = schedule.paymentAmount ?? 0;
      payFrequency = schedule.paymentFrequency ?? 'monthly';
      const frequency = payFrequency;
      const periodsPerYear = PERIODS_PER_YEAR[frequency] ?? 12;
      const extraPerPeriod = round2((extraMonthly * 12) / periodsPerYear);
      startDate = schedule.originationDate ?? schedule.asOfDate ?? todayIso();
      originalRows = buildAmortizationRows(
        principal,
        schedule.annualRate,
        termMonths,
        paymentAmount,
        frequency
      );
      newRows = buildAmortizationRows(
        principal,
        schedule.annualRate,
        termMonths,
        paymentAmount + extraPerPeriod,
        frequency
      );
    }

    const originalPayoffDate = addPeriods(startDate, originalRows.length, payFrequency);
    const newPayoffDate = addPeriods(startDate, newRows.length, payFrequency);
    const monthsSaved = originalRows.length - newRows.length;
    const originalInterest = round2(originalRows.reduce((sum, r) => sum + r.interest, 0));
    const newInterest = round2(newRows.reduce((sum, r) => sum + r.interest, 0));
    const interestSaved = round2(originalInterest - newInterest);

    return { originalPayoffDate, newPayoffDate, monthsSaved, interestSaved };
  }

  /**
   * Called after a payment transaction is committed against a debt account.
   * Computes principal/interest split and records it. Errors are logged but non-fatal.
   */
  async autoSplitPayment(
    transactionId: string,
    accountId: string,
    userId: string,
    transactionAmount: number
  ): Promise<TransactionSplit | null> {
    try {
      const schedule = await debtRepository.findByUserAndAccount(userId, accountId);
      if (!schedule) return null;

      const account = await accountRepository.findById(accountId, userId);
      if (!account) return null;

      // Use current balance as remaining debt for interest calculation
      const runningBalance = Math.abs(account.currentBalance);
      const monthlyRate = schedule.annualRate / 12;
      const interest = round2(runningBalance * monthlyRate);
      const payment = Math.abs(transactionAmount);
      const principalPaid = round2(Math.max(payment - interest, 0));
      const interestPaid = round2(Math.min(interest, payment));

      return await debtRepository.createSplit({
        transactionId,
        principalAmount: principalPaid,
        interestAmount: interestPaid,
      });
    } catch (err) {
      logger.error('autoSplitPayment failed (non-fatal)', { transactionId, accountId, err });
      return null;
    }
  }

  async getSplitForTransaction(
    userId: string,
    transactionId: string
  ): Promise<TransactionSplit | null> {
    // Verify the transaction belongs to the user
    const tx = await transactionRepository.findById(transactionId, userId);
    if (!tx) throw new AppError('Transaction not found', 404);
    return debtRepository.findSplitByTransaction(transactionId);
  }
}

export const debtService = new DebtService();
