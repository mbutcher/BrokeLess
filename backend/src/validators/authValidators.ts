import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().max(254).lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.max': 'Email address is too long',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(12).max(128).required().messages({
    'string.min': 'Password must be at least 12 characters',
    'string.max': 'Password must be no more than 128 characters',
    'any.required': 'Password is required',
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().max(254).lowercase().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  // No min length on login — users should see "invalid credentials" not "too short"
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

export const totpTokenSchema = Joi.object({
  token: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': 'Verification code must be 6 digits',
      'string.pattern.base': 'Verification code must contain only digits',
      'any.required': 'Verification code is required',
    }),
});

export const totpConfirmSchema = Joi.object({
  token: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': 'Verification code must be 6 digits',
      'string.pattern.base': 'Verification code must contain only digits',
      'any.required': 'Verification code is required',
    }),
  pendingSecret: Joi.string().required().messages({
    'any.required': 'Pending secret is required',
  }),
});

export const backupCodeSchema = Joi.object({
  code: Joi.string()
    .min(8)
    .max(12)
    .pattern(/^[A-Za-z2-7\-\s]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid backup code format',
      'any.required': 'Backup code is required',
    }),
});

export const webAuthnDeviceNameSchema = Joi.object({
  deviceName: Joi.string().max(255).optional().allow('', null),
  response: Joi.object().required(),
});

export const challengeTokenSchema = Joi.object({
  challengeToken: Joi.string().required(),
  response: Joi.object().required(),
});
