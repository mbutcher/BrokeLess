import type { Request, Response, NextFunction } from 'express';
import type Joi from 'joi';
import { ValidationError } from './errorHandler';

/**
 * Factory that returns a middleware validating req.body against a Joi schema.
 * Throws ValidationError (400) with a human-readable message on failure.
 *
 * Usage:
 *   router.post('/register', validateRequest(registerSchema), controller.register)
 */
export const validateRequest =
  (schema: Joi.ObjectSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // collect all errors, not just the first
      stripUnknown: true, // remove fields not in schema
      convert: true, // coerce types where possible
    });

    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(new ValidationError(message));
    }

    // Replace req.body with the validated + sanitised value
    req.body = value;
    next();
  };
