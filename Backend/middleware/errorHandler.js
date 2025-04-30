import logger from '../utils/logger.js';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    // Ensure message is a string
    const cleanMessage = typeof message === 'string' 
      ? message 
      : (message && message.toString) 
        ? message.toString() 
        : 'Unknown error';
    
    super(cleanMessage);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  
  // Ensure message is a string
  err.message = typeof err.message === 'string' 
    ? err.message 
    : (err.message && err.message.toString) 
      ? err.message.toString() 
      : 'Internal Server Error';
  
  // Log the error
  if (err.statusCode >= 500) {
    logger.error({
      message: err.message,
      error: err,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  } else {
    logger.warn({
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method
    });
  }
  
  // Send response based on environment
  if (process.env.NODE_ENV === 'production') {
    // Don't expose error details in production
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: 'error',
        message: err.message
      });
    } else {
      // For non-operational errors, don't leak error details
      return res.status(500).json({
        status: 'error',
        message: 'Something went wrong'
      });
    }
  } else {
    // In development, send detailed error information
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      stack: err.stack,
      error: err
    });
  }
};

/**
 * Async error handler to avoid try-catch blocks in route handlers
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};