import Joi from 'joi';

const ACCOUNT_TYPES = ['checking', 'savings', 'credit_card', 'loan', 'mortgage', 'investment', 'other'];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Account Validators ───────────────────────────────────────────────────────

export const createAccountSchema = Joi.object({
  name: Joi.string().max(255).required().messages({
    'any.required': 'Account name is required',
    'string.max': 'Account name must be 255 characters or fewer',
  }),
  type: Joi.string().valid(...ACCOUNT_TYPES).required().messages({
    'any.required': 'Account type is required',
    'any.only': `Account type must be one of: ${ACCOUNT_TYPES.join(', ')}`,
  }),
  isAsset: Joi.boolean().required().messages({
    'any.required': 'isAsset is required',
  }),
  startingBalance: Joi.number().precision(2).default(0),
  currency: Joi.string().length(3).uppercase().default('USD'),
  color: Joi.string().pattern(HEX_COLOR).optional().allow(null).messages({
    'string.pattern.base': 'Color must be a valid hex color (e.g. #3b82f6)',
  }),
  institution: Joi.string().max(255).optional().allow(null, ''),
});

export const updateAccountSchema = Joi.object({
  name: Joi.string().max(255),
  color: Joi.string().pattern(HEX_COLOR).allow(null).messages({
    'string.pattern.base': 'Color must be a valid hex color (e.g. #3b82f6)',
  }),
  institution: Joi.string().max(255).allow(null, ''),
}).min(1);

// ─── Category Validators ──────────────────────────────────────────────────────

export const createCategorySchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'any.required': 'Category name is required',
  }),
  color: Joi.string().pattern(HEX_COLOR).optional().allow(null),
  icon: Joi.string().max(50).optional().allow(null, ''),
  isIncome: Joi.boolean().default(false),
  parentId: Joi.string().uuid().optional().allow(null),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().max(100),
  color: Joi.string().pattern(HEX_COLOR).allow(null),
  icon: Joi.string().max(50).allow(null, ''),
}).min(1);

// ─── Transaction Validators ───────────────────────────────────────────────────

export const createTransactionSchema = Joi.object({
  accountId: Joi.string().uuid().required().messages({
    'any.required': 'Account ID is required',
    'string.guid': 'Account ID must be a valid UUID',
  }),
  amount: Joi.number().precision(2).not(0).required().messages({
    'any.required': 'Amount is required',
    'number.base': 'Amount must be a number',
  }),
  description: Joi.string().max(1000).optional().allow(null, ''),
  payee: Joi.string().max(512).optional().allow(null, ''),
  notes: Joi.string().max(5000).optional().allow(null, ''),
  date: Joi.string().pattern(ISO_DATE).required().messages({
    'any.required': 'Date is required',
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
  }),
  categoryId: Joi.string().uuid().optional().allow(null),
});

export const updateTransactionSchema = Joi.object({
  accountId: Joi.string().uuid(),
  amount: Joi.number().precision(2).not(0),
  description: Joi.string().max(1000).allow(null, ''),
  payee: Joi.string().max(512).allow(null, ''),
  notes: Joi.string().max(5000).allow(null, ''),
  date: Joi.string().pattern(ISO_DATE),
  categoryId: Joi.string().uuid().allow(null),
  isCleared: Joi.boolean(),
}).min(1);

export const transactionFiltersSchema = Joi.object({
  accountId: Joi.string().uuid(),
  categoryId: Joi.string().uuid(),
  startDate: Joi.string().pattern(ISO_DATE),
  endDate: Joi.string().pattern(ISO_DATE),
  search: Joi.string().max(255),
  isTransfer: Joi.boolean(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

export const linkTransactionSchema = Joi.object({
  targetTransactionId: Joi.string().uuid().required().messages({
    'any.required': 'targetTransactionId is required',
    'string.guid': 'targetTransactionId must be a valid UUID',
  }),
  linkType: Joi.string().valid('transfer', 'payment', 'refund').default('transfer'),
});

// ─── Budget Validators ────────────────────────────────────────────────────────

export const createBudgetSchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'any.required': 'Budget name is required',
  }),
  startDate: Joi.string().pattern(ISO_DATE).required().messages({
    'any.required': 'Start date is required',
    'string.pattern.base': 'Start date must be in YYYY-MM-DD format',
  }),
  endDate: Joi.string().pattern(ISO_DATE).required().messages({
    'any.required': 'End date is required',
    'string.pattern.base': 'End date must be in YYYY-MM-DD format',
  }),
});

export const updateBudgetSchema = Joi.object({
  name: Joi.string().max(100),
  startDate: Joi.string().pattern(ISO_DATE),
  endDate: Joi.string().pattern(ISO_DATE),
  isActive: Joi.boolean(),
}).min(1);

export const budgetCategoriesSchema = Joi.object({
  categories: Joi.array()
    .items(
      Joi.object({
        categoryId: Joi.string().uuid().required(),
        allocatedAmount: Joi.number().precision(2).min(0).required(),
      })
    )
    .min(1)
    .required()
    .messages({
      'any.required': 'categories array is required',
      'array.min': 'At least one category allocation is required',
    }),
});
