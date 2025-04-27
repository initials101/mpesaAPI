import { ApiError } from './errorHandler.js';

/**
 * Middleware to handle 404 errors
 */
export const notFound = (req, res, next) => {
  next(new ApiError(404, `Not found - ${req.originalUrl}`));
};