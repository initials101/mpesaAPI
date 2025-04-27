import express from 'express';
import { mpesaController } from '../controllers/mpesa.controller.js';
import { validateRequest, validationSchemas } from '../middleware/validator.js';

const router = express.Router();

/**
 * @route   POST /api/v1/mpesa/stk-push
 * @desc    Initiate STK Push payment
 * @access  Public
 */
router.post(
  '/stk-push',
  validateRequest(validationSchemas.stkPush),
  mpesaController.initiateSTKPush
);

/**
 * @route   POST /api/v1/mpesa/b2c
 * @desc    Send B2C payment
 * @access  Public
 */
router.post(
  '/b2c',
  validateRequest(validationSchemas.b2c),
  mpesaController.sendB2CPayment
);

/**
 * @route   POST /api/v1/mpesa/c2b/register
 * @desc    Register C2B URLs
 * @access  Public
 */
router.post(
  '/c2b/register',
  validateRequest(validationSchemas.c2bRegister),
  mpesaController.registerC2BUrls
);

/**
 * @route   POST /api/v1/mpesa/c2b/simulate
 * @desc    Simulate C2B transaction (sandbox only)
 * @access  Public
 */
router.post(
  '/c2b/simulate',
  validateRequest(validationSchemas.c2bSimulate),
  mpesaController.simulateC2BTransaction
);

/**
 * @route   POST /api/v1/mpesa/transaction-status
 * @desc    Query transaction status
 * @access  Public
 */
router.post(
  '/transaction-status',
  validateRequest(validationSchemas.transactionStatus),
  mpesaController.queryTransactionStatus
);

/**
 * @route   GET /api/v1/mpesa/transactions
 * @desc    Get all transactions
 * @access  Public
 */
router.get(
  '/transactions',
  mpesaController.getAllTransactions
);

/**
 * @route   GET /api/v1/mpesa/transactions/:id
 * @desc    Get transaction by ID
 * @access  Public
 */
router.get(
  '/transactions/:id',
  mpesaController.getTransactionById
);

/**
 * @route   GET /api/v1/mpesa/transactions/reference/:reference
 * @desc    Get transactions by reference
 * @access  Public
 */
router.get(
  '/transactions/reference/:reference',
  mpesaController.getTransactionsByReference
);

/**
 * @route   POST /api/v1/mpesa/callbacks/stk
 * @desc    STK Push callback URL
 * @access  Public
 */
router.post(
  '/callbacks/stk',
  mpesaController.handleStkCallback
);

/**
 * @route   POST /api/v1/mpesa/callbacks/b2c/result
 * @desc    B2C result callback URL
 * @access  Public
 */
router.post(
  '/callbacks/b2c/result',
  mpesaController.handleB2CResultCallback
);

/**
 * @route   POST /api/v1/mpesa/callbacks/b2c/timeout
 * @desc    B2C timeout callback URL
 * @access  Public
 */
router.post(
  '/callbacks/b2c/timeout',
  mpesaController.handleB2CTimeoutCallback
);

/**
 * @route   POST /api/v1/mpesa/callbacks/c2b/validation
 * @desc    C2B validation callback URL
 * @access  Public
 */
router.post(
  '/callbacks/c2b/validation',
  mpesaController.handleC2BValidation
);

/**
 * @route   POST /api/v1/mpesa/callbacks/c2b/confirmation
 * @desc    C2B confirmation callback URL
 * @access  Public
 */
router.post(
  '/callbacks/c2b/confirmation',
  mpesaController.handleC2BConfirmation
);

export default router;