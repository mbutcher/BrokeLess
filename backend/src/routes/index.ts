import { Router } from 'express';
import { apiRateLimiter } from '@middleware/rateLimiter';
import authRoutes from './authRoutes';
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

const router = Router();

// Apply general rate limiting to all API routes
router.use(apiRateLimiter);

// Feature routers
router.use('/auth', authRoutes);
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

export default router;
