import { Router } from 'express';
import { authenticateAny } from '@middleware/authenticate';
import { exchangeRateController } from '@controllers/exchangeRateController';

const router = Router();

// All exchange rate endpoints require authentication
router.get('/', authenticateAny, exchangeRateController.getRate);

export default router;
