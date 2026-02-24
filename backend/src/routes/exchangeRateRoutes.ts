import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { exchangeRateController } from '@controllers/exchangeRateController';

const router = Router();

// All exchange rate endpoints require authentication
router.get('/', authenticate, exchangeRateController.getRate);

export default router;
