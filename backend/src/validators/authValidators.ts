import Joi from 'joi';
import { VALID_SCOPES } from '@services/auth/apiKeyService';

export const registerSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must be no more than 50 characters',
      'string.pattern.base': 'Username may only contain letters, numbers, underscores, and hyphens',
      'any.required': 'Username is required',
    }),
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
  username: Joi.string().max(50).trim().required().messages({
    'any.required': 'Username is required',
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

export const createApiKeySchema = Joi.object({
  label: Joi.string().min(1).max(255).required().messages({
    'string.min': 'Label must not be empty',
    'string.max': 'Label must be no more than 255 characters',
    'any.required': 'Label is required',
  }),
  scopes: Joi.array()
    .items(Joi.string().valid(...VALID_SCOPES))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one scope is required',
      'any.required': 'Scopes are required',
      'any.only': 'Invalid scope value',
    }),
  expiresAt: Joi.date().iso().greater('now').optional().messages({
    'date.greater': 'Expiry date must be in the future',
    'date.format': 'Expiry date must be a valid ISO 8601 date',
  }),
});
