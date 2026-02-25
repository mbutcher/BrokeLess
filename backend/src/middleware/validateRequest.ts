import type { Request, Response, NextFunction } from 'express';
import type Joi from 'joi';
import { ValidationError } from './errorHandler';

/**
 * Factory that returns a middleware validating req.body (or req.query) against a Joi schema.
 * Throws ValidationError (400) with a human-readable message on failure.
 *
 * Usage:
 *   router.post('/register', validateRequest(registerSchema), controller.register)
 *   router.get('/items', validateRequest(querySchema, 'query'), controller.list)
 */
export const validateRequest =
  (schema: Joi.ObjectSchema, target: 'body' | 'query' = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const source = target === 'query' ? req.query : req.body;
    const { error, value } = schema.validate(source, {
      abortEarly: false, // collect all errors, not just the first
      stripUnknown: true, // remove fields not in schema
      convert: true, // coerce types where possible
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(new ValidationError(message));
    }

    if (target === 'query') {
      // Write coerced values back so controllers see e.g. boolean true instead of string 'true'
      Object.assign(req.query, value);
    } else {
      req.body = value;
    }
    next();
  };
