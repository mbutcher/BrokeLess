import Joi from 'joi';

const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'credit_card',
  'loan',
  'line_of_credit',
  'mortgage',
  'investment',
  'other',
];
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Account Validators ───────────────────────────────────────────────────────

export const createAccountSchema = Joi.object({
  name: Joi.string().max(255).required().messages({
    'any.required': 'Account name is required',
    'string.max': 'Account name must be 255 characters or fewer',
  }),
  type: Joi.string()
    .valid(...ACCOUNT_TYPES)
    .required()
    .messages({
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
  annualRate: Joi.number().min(0).max(9.9999).precision(4).optional().allow(null),
});

export const updateAccountSchema = Joi.object({
  name: Joi.string().max(255),
  type: Joi.string()
    .valid(...ACCOUNT_TYPES)
    .messages({
      'any.only': `Account type must be one of: ${ACCOUNT_TYPES.join(', ')}`,
    }),
  isAsset: Joi.boolean(),
  startingBalance: Joi.number().precision(2),
  currency: Joi.string().length(3).uppercase(),
  color: Joi.string().pattern(HEX_COLOR).allow(null).messages({
    'string.pattern.base': 'Color must be a valid hex color (e.g. #3b82f6)',
  }),
  institution: Joi.string().max(255).allow(null, ''),
  annualRate: Joi.number().min(0).max(9.9999).precision(4).allow(null),
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
  tags: Joi.array().items(Joi.string().trim().lowercase().min(1).max(50)).max(20).optional(),
});

export const updateTransactionSchema = Joi.object({
  accountId: Joi.string().uuid(),
  amount: Joi.number().precision(2).not(0),
  description: Joi.string().max(1000).allow(null, ''),
  payee: Joi.string().max(512).allow(null, ''),
  notes: Joi.string().max(5000).allow(null, ''),
  date: Joi.string().pattern(ISO_DATE),
  categoryId: Joi.string().uuid().allow(null),
  budgetLineId: Joi.string().uuid().allow(null),
  isCleared: Joi.boolean(),
  tags: Joi.array().items(Joi.string().trim().lowercase().min(1).max(50)).max(20),
}).min(1);

export const transactionFiltersSchema = Joi.object({
  accountId: Joi.string().uuid(),
  categoryId: Joi.string().uuid(),
  startDate: Joi.string().pattern(ISO_DATE),
  endDate: Joi.string().pattern(ISO_DATE),
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

// ─── Debt Schedule Validators ─────────────────────────────────────────────────

export const upsertDebtScheduleSchema = Joi.object({
  // Required for all debt types
  annualRate: Joi.number().min(0).max(1).required().messages({
    'any.required': 'annualRate is required',
    'number.max': 'annualRate must be a decimal fraction (e.g. 0.065 for 6.5%)',
  }),

  // Loan / Mortgage fields (optional for CC/LOC)
  principal: Joi.number().positive().precision(2).optional().allow(null),
  termMonths: Joi.number().integer().min(1).max(600).optional().allow(null).messages({
    'number.max': 'termMonths cannot exceed 600',
  }),
  originationDate: Joi.string().pattern(ISO_DATE).optional().allow(null).messages({
    'string.pattern.base': 'originationDate must be in YYYY-MM-DD format',
  }),
  paymentAmount: Joi.number().positive().precision(2).optional().allow(null),

  // Simplified loan mode
  isSimplified: Joi.boolean().optional().default(false),
  asOfDate: Joi.string().pattern(ISO_DATE).optional().allow(null).messages({
    'string.pattern.base': 'asOfDate must be in YYYY-MM-DD format',
  }),

  // Payment frequency for loans (ignored for CC/LOC)
  paymentFrequency: Joi.string()
    .valid('weekly', 'biweekly', 'semimonthly', 'monthly')
    .optional()
    .allow(null),

  // CC / LOC fields
  cashAdvanceRate: Joi.number().min(0).max(2).optional().allow(null),
  minimumPaymentType: Joi.string()
    .valid('fixed', 'percentage', 'greater_of', 'lesser_of')
    .optional()
    .allow(null),
  minimumPaymentAmount: Joi.number().positive().precision(2).optional().allow(null),
  minimumPaymentPercent: Joi.number().min(0).max(1).optional().allow(null),
  creditLimit: Joi.number().positive().precision(2).optional().allow(null),
});

export const whatIfQuerySchema = Joi.object({
  extraMonthly: Joi.number().positive().precision(2).required().messages({
    'any.required': 'extraMonthly query param is required',
    'number.positive': 'extraMonthly must be a positive number',
  }),
});

// ─── Savings Goal Validators ──────────────────────────────────────────────────

export const createSavingsGoalSchema = Joi.object({
  accountId: Joi.string().uuid().required().messages({
    'any.required': 'accountId is required',
    'string.guid': 'accountId must be a valid UUID',
  }),
  name: Joi.string().max(255).required().messages({
    'any.required': 'name is required',
  }),
  targetAmount: Joi.number().positive().precision(2).required().messages({
    'any.required': 'targetAmount is required',
    'number.positive': 'targetAmount must be a positive number',
  }),
  targetDate: Joi.string().pattern(ISO_DATE).optional().allow(null),
  budgetLineId: Joi.string().uuid().optional().allow(null),
});

export const updateSavingsGoalSchema = Joi.object({
  name: Joi.string().max(255),
  targetAmount: Joi.number().positive().precision(2),
  targetDate: Joi.string().pattern(ISO_DATE).allow(null),
  budgetLineId: Joi.string().uuid().optional().allow(null),
}).min(1);

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

// ─── Budget Line Validators ───────────────────────────────────────────────────

const BUDGET_LINE_FREQUENCIES = [
  'weekly',
  'biweekly',
  'semi_monthly',
  'twice_monthly',
  'monthly',
  'every_n_days',
  'annually',
  'one_time',
] as const;

// 1–28 are always safe for every month; 31 is treated as "last day of month"
const DAY_OF_MONTH = Joi.number().integer().min(1).max(31);

export const createBudgetLineSchema = Joi.object({
  name: Joi.string().max(100).required().messages({
    'any.required': 'Budget line name is required',
  }),
  classification: Joi.string().valid('income', 'expense').required().messages({
    'any.required': 'classification is required',
    'any.only': 'classification must be income or expense',
  }),
  flexibility: Joi.string().valid('fixed', 'flexible').required().messages({
    'any.required': 'flexibility is required',
    'any.only': 'flexibility must be fixed or flexible',
  }),
  categoryId: Joi.string().uuid().required().messages({
    'any.required': 'categoryId is required',
    'string.guid': 'categoryId must be a valid UUID',
  }),
  subcategoryId: Joi.string().uuid().optional().allow(null),
  accountId: Joi.string().uuid().optional().allow(null),
  amount: Joi.number().positive().precision(2).required().messages({
    'any.required': 'amount is required',
    'number.positive': 'amount must be a positive number',
  }),
  frequency: Joi.string()
    .valid(...BUDGET_LINE_FREQUENCIES)
    .required()
    .messages({
      'any.required': 'frequency is required',
      'any.only': `frequency must be one of: ${BUDGET_LINE_FREQUENCIES.join(', ')}`,
    }),
  frequencyInterval: Joi.number()
    .integer()
    .min(1)
    .when('frequency', { is: 'every_n_days', then: Joi.required() })
    .optional()
    .allow(null)
    .messages({
      'any.required': 'frequencyInterval is required when frequency is every_n_days',
      'number.min': 'frequencyInterval must be at least 1',
    }),
  dayOfMonth1: DAY_OF_MONTH.when('frequency', { is: 'twice_monthly', then: Joi.required() })
    .optional()
    .allow(null)
    .messages({
      'any.required': 'dayOfMonth1 is required when frequency is twice_monthly',
    }),
  dayOfMonth2: DAY_OF_MONTH.when('frequency', { is: 'twice_monthly', then: Joi.required() })
    .optional()
    .allow(null)
    .messages({
      'any.required': 'dayOfMonth2 is required when frequency is twice_monthly',
    }),
  anchorDate: Joi.string().pattern(ISO_DATE).required().messages({
    'any.required': 'anchorDate is required',
    'string.pattern.base': 'anchorDate must be in YYYY-MM-DD format',
  }),
  isPayPeriodAnchor: Joi.boolean().default(false),
  notes: Joi.string().max(255).optional().allow(null, ''),
});

export const updateBudgetLineSchema = Joi.object({
  name: Joi.string().max(100),
  classification: Joi.string().valid('income', 'expense'),
  flexibility: Joi.string().valid('fixed', 'flexible'),
  categoryId: Joi.string().uuid(),
  subcategoryId: Joi.string().uuid().allow(null),
  accountId: Joi.string().uuid().optional().allow(null),
  amount: Joi.number().positive().precision(2),
  frequency: Joi.string().valid(...BUDGET_LINE_FREQUENCIES),
  frequencyInterval: Joi.number()
    .integer()
    .min(1)
    .when('frequency', { is: 'every_n_days', then: Joi.required() })
    .allow(null)
    .messages({
      'any.required': 'frequencyInterval is required when frequency is every_n_days',
      'number.min': 'frequencyInterval must be at least 1',
    }),
  dayOfMonth1: DAY_OF_MONTH.when('frequency', { is: 'twice_monthly', then: Joi.required() })
    .allow(null)
    .messages({
      'any.required': 'dayOfMonth1 is required when frequency is twice_monthly',
    }),
  dayOfMonth2: DAY_OF_MONTH.when('frequency', { is: 'twice_monthly', then: Joi.required() })
    .allow(null)
    .messages({
      'any.required': 'dayOfMonth2 is required when frequency is twice_monthly',
    }),
  anchorDate: Joi.string().pattern(ISO_DATE),
  isPayPeriodAnchor: Joi.boolean(),
  notes: Joi.string().max(255).allow(null, ''),
  isActive: Joi.boolean(),
}).min(1);

export const budgetViewQuerySchema = Joi.object({
  start: Joi.string().pattern(ISO_DATE).required().messages({
    'any.required': 'start query param is required (YYYY-MM-DD)',
    'string.pattern.base': 'start must be in YYYY-MM-DD format',
  }),
  end: Joi.string().pattern(ISO_DATE).required().messages({
    'any.required': 'end query param is required (YYYY-MM-DD)',
    'string.pattern.base': 'end must be in YYYY-MM-DD format',
  }),
}).custom((value, helpers) => {
  const v = value as { start: string; end: string };
  if (v.start > v.end) {
    return helpers.error('any.invalid', { message: 'start must be on or before end' });
  }
  return v;
});

export const upcomingExpensesSchema = Joi.object({
  start: Joi.string().pattern(ISO_DATE).required().messages({
    'any.required': 'start query param is required (YYYY-MM-DD)',
    'string.pattern.base': 'start must be in YYYY-MM-DD format',
  }),
  end: Joi.string().pattern(ISO_DATE).required().messages({
    'any.required': 'end query param is required (YYYY-MM-DD)',
    'string.pattern.base': 'end must be in YYYY-MM-DD format',
  }),
  includeFlexible: Joi.boolean().default(false),
}).custom((value, helpers) => {
  const v = value as { start: string; end: string; includeFlexible: boolean };
  if (v.start > v.end) {
    return helpers.error('any.invalid', { message: 'start must be on or before end' });
  }
  return v;
});

// ─── SimpleFIN Validators ─────────────────────────────────────────────────────

export const connectSimplefinSchema = Joi.object({
  setupToken: Joi.string().min(20).required().messages({
    'any.required': 'SimpleFIN setup token is required',
    'string.min': 'Setup token appears too short — paste the full token from SimpleFIN Bridge',
  }),
});

export const updateSimplefinScheduleSchema = Joi.object({
  autoSyncEnabled: Joi.boolean().required(),
  autoSyncIntervalHours: Joi.number().integer().valid(1, 2, 4, 6, 8, 12, 24).required().messages({
    'any.only': 'Sync interval must be one of: 1, 2, 4, 6, 8, 12, or 24 hours',
  }),
  autoSyncWindowStart: Joi.number().integer().min(0).max(23).required().messages({
    'number.min': 'Window start must be between 0 and 23',
    'number.max': 'Window start must be between 0 and 23',
  }),
  autoSyncWindowEnd: Joi.number().integer().min(0).max(23).required().messages({
    'number.min': 'Window end must be between 0 and 23',
    'number.max': 'Window end must be between 0 and 23',
  }),
});

export const resolveReviewSchema = Joi.object({
  action: Joi.string().valid('accept', 'merge', 'discard').required().messages({
    'any.required': 'action is required',
    'any.only': 'action must be one of: accept, merge, discard',
  }),
  targetTransactionId: Joi.string()
    .uuid()
    .when('action', { is: 'merge', then: Joi.required() })
    .messages({
      'any.required': 'targetTransactionId is required when action is merge',
    }),
});

export const mapAccountSchema = Joi.object({
  action: Joi.string().valid('create', 'link').required().messages({
    'any.required': 'action is required',
    'any.only': 'action must be one of: create, link',
  }),
  localAccountId: Joi.string()
    .uuid()
    .when('action', { is: 'link', then: Joi.required() })
    .messages({
      'any.required': 'localAccountId is required when action is link',
    }),
  newAccount: Joi.object({
    name: Joi.string().max(255).required(),
    type: Joi.string()
      .valid(
        'checking',
        'savings',
        'credit_card',
        'loan',
        'line_of_credit',
        'mortgage',
        'investment',
        'other'
      )
      .required(),
    isAsset: Joi.boolean().required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    color: Joi.string().pattern(HEX_COLOR).optional().allow(null),
  }).when('action', { is: 'create', then: Joi.required() }),
});

// ─── Report Validators ────────────────────────────────────────────────────────

export const spendingByCategorySchema = Joi.object({
  start: Joi.string().isoDate().required().messages({
    'any.required': 'start query param is required',
    'string.isoDate': 'start must be a valid ISO date',
  }),
  end: Joi.string().isoDate().required().messages({
    'any.required': 'end query param is required',
    'string.isoDate': 'end must be a valid ISO date',
  }),
  type: Joi.string().valid('expense', 'income').default('expense'),
});

export const netWorthHistorySchema = Joi.object({
  months: Joi.number().integer().min(1).max(60).default(12),
});

// ─── Recurring Transaction Validators ────────────────────────────────────────

const RECURRING_FREQUENCIES = [
  'weekly',
  'biweekly',
  'semi_monthly',
  'monthly',
  'every_n_days',
  'annually',
] as const;

export const createRecurringTransactionSchema = Joi.object({
  accountId: Joi.string().uuid().required().messages({
    'any.required': 'accountId is required',
    'string.guid': 'accountId must be a valid UUID',
  }),
  amount: Joi.number().precision(2).not(0).required().messages({
    'any.required': 'amount is required',
    'number.base': 'amount must be a number',
  }),
  description: Joi.string().max(1000).optional().allow(null, ''),
  payee: Joi.string().max(512).optional().allow(null, ''),
  notes: Joi.string().max(5000).optional().allow(null, ''),
  categoryId: Joi.string().uuid().optional().allow(null),
  frequency: Joi.string()
    .valid(...RECURRING_FREQUENCIES)
    .required()
    .messages({
      'any.required': 'frequency is required',
      'any.only': `frequency must be one of: ${RECURRING_FREQUENCIES.join(', ')}`,
    }),
  frequencyInterval: Joi.number()
    .integer()
    .min(1)
    .when('frequency', { is: 'every_n_days', then: Joi.required() })
    .optional()
    .allow(null)
    .messages({
      'any.required': 'frequencyInterval is required when frequency is every_n_days',
      'number.min': 'frequencyInterval must be at least 1',
    }),
  anchorDate: Joi.string().pattern(ISO_DATE).required().messages({
    'any.required': 'anchorDate is required',
    'string.pattern.base': 'anchorDate must be in YYYY-MM-DD format',
  }),
  endDate: Joi.string().pattern(ISO_DATE).optional().allow(null),
});

export const updateRecurringTransactionSchema = Joi.object({
  accountId: Joi.string().uuid(),
  amount: Joi.number().precision(2).not(0),
  description: Joi.string().max(1000).allow(null, ''),
  payee: Joi.string().max(512).allow(null, ''),
  notes: Joi.string().max(5000).allow(null, ''),
  categoryId: Joi.string().uuid().allow(null),
  frequency: Joi.string()
    .valid(...RECURRING_FREQUENCIES)
    .messages({
      'any.only': `frequency must be one of: ${RECURRING_FREQUENCIES.join(', ')}`,
    }),
  frequencyInterval: Joi.number()
    .integer()
    .min(1)
    .when('frequency', { is: 'every_n_days', then: Joi.required() })
    .allow(null)
    .messages({
      'any.required': 'frequencyInterval is required when frequency is every_n_days',
      'number.min': 'frequencyInterval must be at least 1',
    }),
  anchorDate: Joi.string().pattern(ISO_DATE),
  endDate: Joi.string().pattern(ISO_DATE).allow(null),
  isActive: Joi.boolean(),
}).min(1);

// ─── User Profile Validators ──────────────────────────────────────────────────

export const updateProfileSchema = Joi.object({
  displayName: Joi.string().max(100).allow(null, '').optional(),
  defaultCurrency: Joi.string().length(3).uppercase().messages({
    'string.length': 'defaultCurrency must be a 3-letter currency code (e.g. CAD)',
  }),
  locale: Joi.string().max(10),
  dateFormat: Joi.string().valid('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'),
  timeFormat: Joi.string().valid('12h', '24h'),
  timezone: Joi.string().max(100),
  weekStart: Joi.string().valid('sunday', 'monday', 'saturday'),
  theme: Joi.string().valid('default', 'slate', 'forest', 'warm', 'midnight'),
}).min(1);

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(12).max(128).required(),
  confirmNewPassword: Joi.valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
  }),
});

// ─── Household Validators ─────────────────────────────────────────────────────

export const onboardingSchema = Joi.object({
  region: Joi.string().valid('CA', 'US', 'EU').required().messages({
    'any.required': 'region is required',
    'any.only': 'region must be CA, US, or EU',
  }),
  isFreelancer: Joi.boolean().required(),
  hasPets: Joi.boolean().required(),
  hasKids: Joi.boolean().required(),
  isStudent: Joi.boolean().required(),
});

export const setupHouseholdSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'Household name is required',
    'string.min': 'Household name must not be empty',
    'string.max': 'Household name must be 100 characters or fewer',
  }),
});

export const updateHouseholdSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'Household name is required',
    'string.min': 'Household name must not be empty',
    'string.max': 'Household name must be 100 characters or fewer',
  }),
});

export const addMemberSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'any.required': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
  password: Joi.string().min(12).max(128).required().messages({
    'any.required': 'Password is required',
    'string.min': 'Password must be at least 12 characters',
  }),
  displayName: Joi.string().max(100).optional().allow(null, ''),
});

export const putSharesSchema = Joi.object({
  shares: Joi.array()
    .items(
      Joi.object({
        userId: Joi.string().uuid().required().messages({
          'any.required': 'userId is required',
          'string.guid': 'userId must be a valid UUID',
        }),
        accessLevel: Joi.string().valid('view', 'write').required().messages({
          'any.required': 'accessLevel is required',
          'any.only': 'accessLevel must be view or write',
        }),
      })
    )
    .required()
    .messages({ 'any.required': 'shares array is required' }),
});

export const patchShareSchema = Joi.object({
  accessLevel: Joi.string().valid('view', 'write').required().messages({
    'any.required': 'accessLevel is required',
    'any.only': 'accessLevel must be view or write',
  }),
});

// ─── Push Notification Validators ─────────────────────────────────────────────

export const subscribePushSchema = Joi.object({
  endpoint: Joi.string().uri().max(2048).required().messages({
    'any.required': 'endpoint is required',
    'string.uri': 'endpoint must be a valid URL',
    'string.max': 'endpoint is too long',
  }),
  keys: Joi.object({
    p256dh: Joi.string().required().messages({ 'any.required': 'keys.p256dh is required' }),
    auth: Joi.string().required().messages({ 'any.required': 'keys.auth is required' }),
  })
    .required()
    .messages({ 'any.required': 'keys is required' }),
  deviceName: Joi.string().max(255).optional().allow(null, ''),
});
