import Joi from 'joi';
import { ApiError } from './errorHandler.js';

/**
 * Middleware factory for request validation
 * 
 * @param {Object} schema - Joi validation schema
 * @returns {Function} - Express middleware function
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Include all errors
      allowUnknown: true, // Ignore unknown props
      stripUnknown: true // Remove unknown props
    };

    // Validate request against schema
    const { error, value } = schema.validate(
      {
        body: req.body || {},  // Prevent errors if body is undefined
        query: req.query || {},  // Prevent errors if query is undefined
        params: req.params || {}  // Prevent errors if params are undefined
      },
      validationOptions
    );
    
    if (error) {
      // Extract and format validation errors
      const errors = error.details.map(detail => ({
        path: detail.path.join('.'),
        message: detail.message
      }));

      return next(new ApiError(400, 'Validation Error', true, { errors }));
    }
    
    // Update req with validated values
    req.body = value.body;
    req.query = value.query;
    req.params = value.params;
    
    return next();
  };
};

/**
 * Validation schemas for different API endpoints
 */
export const validationSchemas = {
  // STK Push validation schema
  stkPush: Joi.object({
    body: Joi.object({
      phoneNumber: Joi.string().required().min(10).max(12)
        .messages({
          'string.base': 'Phone number must be a string',
          'string.min': 'Phone number must be at least 10 digits',
          'string.max': 'Phone number must not exceed 12 digits',
          'any.required': 'Phone number is required'
        }),
      amount: Joi.number().required().min(1)
        .messages({
          'number.base': 'Amount must be a number',
          'number.min': 'Amount must be at least 1',
          'any.required': 'Amount is required'
        }),
      accountReference: Joi.string().required().max(12)
        .messages({
          'string.base': 'Account reference must be a string',
          'string.max': 'Account reference must not exceed 12 characters',
          'any.required': 'Account reference is required'
        }),
      transactionDesc: Joi.string().default('Payment')
        .messages({
          'string.base': 'Transaction description must be a string'
        })
    }).required()
  }),
  
  // B2C payment validation schema
  b2c: Joi.object({
    body: Joi.object({
      phoneNumber: Joi.string().required().min(10).max(12)
        .messages({
          'string.base': 'Phone number must be a string',
          'string.min': 'Phone number must be at least 10 digits',
          'string.max': 'Phone number must not exceed 12 digits',
          'any.required': 'Phone number is required'
        }),
      amount: Joi.number().required().min(1)
        .messages({
          'number.base': 'Amount must be a number',
          'number.min': 'Amount must be at least 1',
          'any.required': 'Amount is required'
        }),
      occassion: Joi.string().default('')
        .messages({
          'string.base': 'Occasion must be a string'
        }),
      remarks: Joi.string().default('Payment')
        .messages({
          'string.base': 'Remarks must be a string'
        }),
      commandID: Joi.string().valid('SalaryPayment', 'BusinessPayment', 'PromotionPayment')
        .default('BusinessPayment')
        .messages({
          'any.only': 'Command ID must be one of SalaryPayment, BusinessPayment, or PromotionPayment',
          'string.base': 'Command ID must be a string'
        })
    }).required()
  }),
  
  // C2B URL registration validation schema
  c2bRegister: Joi.object({
    body: Joi.object({
      shortCode: Joi.string()
        .messages({
          'string.base': 'Shortcode must be a string'
        }),
      responseType: Joi.string().valid('Completed', 'Cancelled').default('Completed')
        .messages({
          'any.only': 'ResponseType must be either Completed or Cancelled',
          'string.base': 'ResponseType must be a string'
        }),
      confirmationURL: Joi.string().uri()
        .messages({
          'string.uri': 'Confirmation URL must be a valid URI',
          'string.base': 'Confirmation URL must be a string'
        }),
      validationURL: Joi.string().uri()
        .messages({
          'string.uri': 'Validation URL must be a valid URI',
          'string.base': 'Validation URL must be a string'
        })
    }).required()
  }),
  
  // C2B transaction simulation validation schema
  c2bSimulate: Joi.object({
    body: Joi.object({
      phoneNumber: Joi.string().required().min(10).max(12)
        .messages({
          'string.base': 'Phone number must be a string',
          'string.min': 'Phone number must be at least 10 digits',
          'string.max': 'Phone number must not exceed 12 digits',
          'any.required': 'Phone number is required'
        }),
      amount: Joi.number().required().min(1)
        .messages({
          'number.base': 'Amount must be a number',
          'number.min': 'Amount must be at least 1',
          'any.required': 'Amount is required'
        }),
      billRefNumber: Joi.string().default('TEST')
        .messages({
          'string.base': 'Bill reference number must be a string'
        }),
      commandID: Joi.string().valid('CustomerPayBillOnline', 'CustomerBuyGoodsOnline')
        .default('CustomerPayBillOnline')
        .messages({
          'any.only': 'Command ID must be either CustomerPayBillOnline or CustomerBuyGoodsOnline',
          'string.base': 'Command ID must be a string'
        })
    }).required()
  }),
  
  // Transaction status validation schema
  transactionStatus: Joi.object({
    body: Joi.object({
      transactionID: Joi.string().required()
        .messages({
          'string.base': 'Transaction ID must be a string',
          'any.required': 'Transaction ID is required'
        }),
      identifierType: Joi.number().valid(1, 2, 4).default(1)
        .messages({
          'any.only': 'Identifier type must be 1, 2, or 4',
          'number.base': 'Identifier type must be a number'
        })
    }).required()
  })
};
