import { Router } from 'express';
import { apiRateLimiter } from '@middleware/rateLimiter';
import { env } from '@config/env';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import setupRoutes from './setupRoutes';
import accountRoutes from './accountRoutes';
import categoryRoutes from './categoryRoutes';
import transactionRoutes from './transactionRoutes';
import budgetRoutes from './budgetRoutes';
import reportRoutes from './reportRoutes';
import debtRoutes from './debtRoutes';
import savingsGoalRoutes from './savingsGoalRoutes';
import simplefinRoutes from './simplefinRoutes';
import exchangeRateRoutes from './exchangeRateRoutes';
import syncRoutes from './syncRoutes';
import budgetLineRoutes from './budgetLineRoutes';
import budgetViewRoutes from './budgetViewRoutes';
import recurringTransactionRoutes from './recurringTransactionRoutes';
import dashboardRoutes from './dashboardRoutes';
import pushRoutes from './pushRoutes';
import householdRoutes from './householdRoutes';
import categorizationRuleRoutes from './categorizationRuleRoutes';

const router = Router();

// Auth routes first — they have their own per-endpoint rate limiters for
// sensitive actions (login, register, WebAuthn). The general apiRateLimiter
// must NOT cover /auth/refresh: that endpoint has its own refreshRateLimiter,
// and if the general limit is exhausted the refresh call would also fail,
// triggering a logout on the client.
router.use('/setup', setupRoutes);
router.use('/auth', authRoutes);

// Apply general rate limiting to all remaining API routes
router.use(apiRateLimiter);
router.use('/accounts', accountRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budgets', budgetRoutes);
router.use('/reports', reportRoutes);
router.use('/debt', debtRoutes);
router.use('/savings-goals', savingsGoalRoutes);
router.use('/simplefin', simplefinRoutes);
router.use('/exchange-rates', exchangeRateRoutes);
router.use('/sync', syncRoutes);
router.use('/budget-lines', budgetLineRoutes);
router.use('/budget-view', budgetViewRoutes);
router.use('/recurring-transactions', recurringTransactionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/push', pushRoutes);
router.use('/household', householdRoutes);
router.use('/categorization-rules', categorizationRuleRoutes);

// Staging-only admin routes — not registered in production or development.
// The reset-seeds endpoint is gated by both this check AND an X-Reset-Token header.
if (env.isStaging) {
  router.use('/admin', adminRoutes);
}

export default router;
