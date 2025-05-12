import express from "express"
import { mpesaController } from "../controllers/mpesa.controller.js"
import { transactionsController } from "../controllers/transactions.controller.js"
import { validateRequest, validationSchemas } from "../middleware/validator.js"

const router = express.Router()

/**
 * @route   POST /api/mpesa/stk-push
 * @desc    Initiate STK Push payment
 * @access  Public
 */
router.post("/stk-push", validateRequest(validationSchemas.stkPush), mpesaController.initiateSTKPush)

/**
 * @route   POST /api/mpesa/stk-status
 * @desc    Query STK Push status
 * @access  Public
 */
router.post("/stk-status", validateRequest(validationSchemas.stkStatus), mpesaController.queryStkStatus)

/**
 * @route   POST /api/mpesa/b2c
 * @desc    Send B2C payment
 * @access  Public
 */
router.post("/b2c", validateRequest(validationSchemas.b2c), mpesaController.sendB2CPayment)

/**
 * @route   POST /api/mpesa/transaction-status
 * @desc    Query transaction status
 * @access  Public
 */
router.post(
  "/transaction-status",
  validateRequest(validationSchemas.transactionStatus),
  mpesaController.queryTransactionStatus,
)

/**
 * @route   GET /api/mpesa/transactions
 * @desc    Get all transactions
 * @access  Public
 */
router.get("/transactions", mpesaController.getAllTransactions)

/**
 * @route   GET /api/mpesa/transactions/:id
 * @desc    Get transaction by ID
 * @access  Public
 */
router.get("/transactions/:id", mpesaController.getTransactionById)

/**
 * @route   GET /api/mpesa/transactions/reference/:reference
 * @desc    Get transactions by reference
 * @access  Public
 */
router.get("/transactions/reference/:reference", mpesaController.getTransactionsByReference)

/**
 * @route   POST /api/mpesa/transactions/check-pending
 * @desc    Check and process pending transactions
 * @access  Public
 */
router.post("/transactions/check-pending", transactionsController.checkPendingTransactions)

/**
 * @route   POST /api/mpesa/transactions/:id/retry
 * @desc    Retry a failed transaction
 * @access  Public
 */
router.post("/transactions/:id/retry", transactionsController.retryTransaction)

/**
 * @route   GET /api/mpesa/transactions/stats
 * @desc    Get transaction statistics
 * @access  Public
 */
router.get("/transactions/stats", transactionsController.getTransactionStats)

/**
 * @route   POST /api/mpesa/callbacks/stk
 * @desc    STK Push callback URL
 * @access  Public
 */
router.post("/callbacks/stk", mpesaController.handleStkCallback)

/**
 * @route   POST /api/mpesa/callbacks/b2c/result
 * @desc    B2C result callback URL
 * @access  Public
 */
router.post("/callbacks/b2c/result", mpesaController.handleB2CResultCallback)

/**
 * @route   POST /api/mpesa/callbacks/b2c/timeout
 * @desc    B2C timeout callback URL
 * @access  Public
 */
router.post("/callbacks/b2c/timeout", mpesaController.handleB2CTimeoutCallback)

/**
 * @route   POST /api/mpesa/transactions/fix-incorrect
 * @desc    Fix transactions incorrectly marked as failed
 * @access  Public
 */
router.post("/transactions/fix-incorrect", transactionsController.fixIncorrectTransactions)

/**
 * @route   GET /api/mpesa/transactions/debug/:checkoutRequestID
 * @desc    Debug a specific transaction
 * @access  Public
 */
router.get("/transactions/debug/:checkoutRequestID", transactionsController.debugTransactionStatus)

export default router
