/**
 * Validation Middleware - Zod schema validation for Express routes
 */
import { ZodError } from 'zod';

/**
 * Create validation middleware from Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Request property to validate (body, query, params)
 * @returns {Function} Express middleware
 */
export function validateMiddleware(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        const messages = Object.entries(errors).flatMap(([field, msgs]) =>
          msgs.map(msg => `${field}: ${msg}`)
        );

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: messages,
        });
      }

      // Attach validated data to request
      req.validated = result.data;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Validation error',
      });
    }
  };
}

/**
 * Validate request body
 */
export function validateBody(schema) {
  return validateMiddleware(schema, 'body');
}

/**
 * Validate query parameters
 */
export function validateQuery(schema) {
  return validateMiddleware(schema, 'query');
}

/**
 * Validate route parameters
 */
export function validateParams(schema) {
  return validateMiddleware(schema, 'params');
}

/**
 * Handle ZodError globally
 */
export function zodErrorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const errors = err.flatten().fieldErrors;
    const messages = Object.entries(errors).flatMap(([field, msgs]) =>
      msgs.map(msg => `${field}: ${msg}`)
    );

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: messages,
    });
  }
  next(err);
}

export default { validateMiddleware, validateBody, validateQuery, validateParams, zodErrorHandler };