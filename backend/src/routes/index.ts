import { Router } from 'express';
import { apiRateLimiter } from '@middleware/rateLimiter';
import authRoutes from './authRoutes';
import accountRoutes from './accountRoutes';
import categoryRoutes from './categoryRoutes';
import transactionRoutes from './transactionRoutes';
import budgetRoutes from './budgetRoutes';

const router = Router();

// Apply general rate limiting to all API routes
router.use(apiRateLimiter);

// Feature routers
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budgets', budgetRoutes);

export default router;
