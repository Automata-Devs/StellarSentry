/**
 * Validation Middleware - Zod schema validation for request bodies
 */
import { ZodError } from 'zod';

/**
 * Create validation middleware from Zod schema
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

        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: messages,
          });
        }

        // For form submissions, redirect back with errors
        req.flash('errors', messages);
        req.flash('formData', req.body);
        return res.redirect('back');
      }

      // Attach validated data
      req.validated = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
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

export default { validateMiddleware, validateQuery, validateParams, zodErrorHandler };