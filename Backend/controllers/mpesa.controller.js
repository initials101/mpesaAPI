import mpesaService from '../services/mpesa.service.js';
import logger from '../utils/logger.js';
import { ApiError, catchAsync } from '../middleware/errorHandler.js';
import { formatPhoneNumber } from '../utils/helpers.js';
import Transaction from '../models/transaction.model.js'; // Import MongoDB model

/**
 * Controller for M-Pesa API endpoints
 */
export const mpesaController = {
  /**
   * Initiate STK Push payment
   */
  initiateSTKPush: catchAsync(async (req, res) => {
    const { phoneNumber, amount, accountReference, transactionDesc } = req.body;

    logger.info('STK Push request received', {
      phoneNumber,
      amount,
      accountReference
    });

    const result = await mpesaService.initiateSTKPush({
      phoneNumber: formatPhoneNumber(phoneNumber),
      amount,
      accountReference,
      transactionDesc
    });

    if (result.ResponseCode === '0') {
      return res.status(200).json({
        status: 'success',
        message: 'STK Push initiated successfully',
        data: {
          checkoutRequestID: result.CheckoutRequestID,
          merchantRequestID: result.MerchantRequestID,
          responseCode: result.ResponseCode,
          responseDescription: result.ResponseDescription
        }
      });
    } else {
      throw new ApiError(400, `STK Push failed: ${result.ResponseDescription}`);
    }
  }),

  /**
   * Send B2C payment
   */
  sendB2CPayment: catchAsync(async (req, res) => {
    const { phoneNumber, amount, commandID, remarks, occassion } = req.body;

    logger.info('B2C payment request received', {
      phoneNumber,
      amount,
      commandID
    });

    try {
      const result = await mpesaService.sendB2CPayment({
        phoneNumber: formatPhoneNumber(phoneNumber),
        amount,
        commandID,
        remarks,
        occassion
      });

      if (result.ResponseCode === '0') {
        return res.status(200).json({
          status: 'success',
          message: 'B2C payment initiated successfully',
          data: {
            conversationID: result.ConversationID,
            originatorConversationID: result.OriginatorConversationID,
            responseCode: result.ResponseCode,
            responseDescription: result.ResponseDescription
          }
        });
      } else {
        throw new ApiError(400, `B2C payment failed: ${result.ResponseDescription}`);
      }
    } catch (error) {
      // Create a clean error message
      const errorMessage = typeof error.message === 'string' 
        ? error.message 
        : 'Unknown error occurred during B2C payment';

      // Log the error with context
      logger.error('B2C payment controller error:', {
        error: errorMessage,
        phoneNumber,
        amount,
        commandID
      });

      // Return a clean error response
      throw new ApiError(
        error.statusCode || 500,
        errorMessage
      );
    }
  }),

  /**
   * Query transaction status
   */
  queryTransactionStatus: catchAsync(async (req, res) => {
    const { transactionID, identifierType } = req.body;

    logger.info('Transaction status query received', {
      transactionID,
      identifierType
    });

    const result = await mpesaService.queryTransactionStatus({
      transactionID,
      identifierType
    });

    if (result.ResponseCode === '0') {
      return res.status(200).json({
        status: 'success',
        message: 'Transaction status query initiated successfully',
        data: {
          conversationID: result.ConversationID,
          originatorConversationID: result.OriginatorConversationID,
          responseCode: result.ResponseCode,
          responseDescription: result.ResponseDescription
        }
      });
    } else {
      throw new ApiError(400, `Transaction status query failed: ${result.ResponseDescription}`);
    }
  }),

  /**
   * Query STK Push status
   */
  queryStkStatus: catchAsync(async (req, res) => {
    const { checkoutRequestID } = req.body;

    if (!checkoutRequestID) {
      throw new ApiError(400, 'Checkout request ID is required');
    }

    logger.info('STK status query received', { checkoutRequestID });

    try {
      const result = await mpesaService.queryStkStatus(checkoutRequestID);

      // Get transaction from database
      const transaction = await Transaction.findOne({ checkoutRequestID });

      return res.status(200).json({
        status: 'success',
        message: 'STK status query completed',
        data: {
          responseCode: result.ResultCode,
          responseDescription: result.ResultDesc,
          inProgress: result.inProgress || false,
          transaction: transaction ? {
            id: transaction._id,
            status: transaction.status,
            amount: transaction.amount,
            phoneNumber: transaction.phoneNumber,
            referenceId: transaction.referenceId,
            failureReason: transaction.failureReason,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
          } : null
        }
      });
    } catch (error) {
      // Special handling for "transaction is being processed"
      if (error.response && 
          error.response.data && 
          error.response.data.errorMessage && 
          error.response.data.errorMessage.includes("transaction is being processed")) {

        // Get transaction from database
        const transaction = await Transaction.findOne({ checkoutRequestID });

        // Return a 200 response with in-progress status
        return res.status(200).json({
          status: 'success',
          message: 'Transaction is still being processed',
          data: {
            responseCode: -1, // Custom code for in-progress
            responseDescription: "The transaction is being processed",
            inProgress: true,
            transaction: transaction ? {
              id: transaction._id,
              status: transaction.status,
              amount: transaction.amount,
              phoneNumber: transaction.phoneNumber,
              referenceId: transaction.referenceId,
              createdAt: transaction.createdAt,
              updatedAt: transaction.updatedAt
            } : null
          }
        });
      }

      // For other errors, throw normally
      throw new ApiError(
        error.statusCode || 500,
        `STK status query failed: ${error.message}`
      );
    }
  }),

  /**
   * Handle STK Push callback
   */
  handleStkCallback: catchAsync(async (req, res) => {
    // Respond immediately to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

    // Process the callback asynchronously
    try {
      const callbackData = req.body.Body.stkCallback;

      logger.info('STK callback received', {
        requestId: callbackData.CheckoutRequestID,
        resultCode: callbackData.ResultCode
      });

      // Log the full callback data for debugging
      logger.debug('Full STK callback data:', JSON.stringify(callbackData));

      // Process the callback
      const updatedTransaction = await mpesaService.handleStkCallback(callbackData);

      if (updatedTransaction) {
        logger.info('STK callback processed successfully', {
          transactionId: updatedTransaction._id,
          status: updatedTransaction.status,
          resultCode: callbackData.ResultCode,
          resultDesc: callbackData.ResultDesc
        });
      } else {
        logger.warn('STK callback processing completed but no transaction was updated');
      }
    } catch (error) {
      logger.error('Error processing STK callback:', error.message);
    }
  }),

  /**
   * Handle B2C result callback
   */
  handleB2CResultCallback: catchAsync(async (req, res) => {
    // Respond immediately to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

    // Process the callback asynchronously
    try {
      const resultData = req.body.Result;

      logger.info('B2C result callback received', {
        conversationId: resultData.ConversationID,
        resultCode: resultData.ResultCode
      });

      if (resultData.ResultCode === 0) {
        // Payment successful
        logger.info('B2C payment successful', {
          conversationId: resultData.ConversationID,
          transactionId: resultData.TransactionID
        });

        // Update transaction in database
        const transaction = await Transaction.findOne({ conversationId: resultData.ConversationID });

        if (transaction) {
          // Update transaction fields
          transaction.status = 'success';
          transaction.transactionId = resultData.TransactionID;
          transaction.resultCode = resultData.ResultCode.toString();
          transaction.resultDesc = resultData.ResultDesc;
          transaction.metadata = {
            ...transaction.metadata,
            completedAt: Math.floor(Date.now() / 1000),
            resultParameters: resultData.ResultParameters
          };
          transaction.updatedAt = Math.floor(Date.now() / 1000);
          
          await transaction.save();
          logger.info(`Transaction ${resultData.ConversationID} marked as successful`);
        } else {
          logger.warn(`No transaction found for conversation ID: ${resultData.ConversationID}`);
        }
      } else {
        // Payment failed
        logger.warn('B2C payment failed', {
          conversationId: resultData.ConversationID,
          resultCode: resultData.ResultCode,
          resultDesc: resultData.ResultDesc
        });

        // Update transaction in database
        const transaction = await Transaction.findOne({ conversationId: resultData.ConversationID });

        if (transaction) {
          // Update transaction fields
          transaction.status = 'failed';
          transaction.resultCode = resultData.ResultCode.toString();
          transaction.resultDesc = resultData.ResultDesc;
          transaction.failureReason = resultData.ResultDesc;
          transaction.metadata = {
            ...transaction.metadata,
            completedAt: Math.floor(Date.now() / 1000)
          };
          transaction.updatedAt = Math.floor(Date.now() / 1000);
          
          await transaction.save();
          logger.info(`Transaction ${resultData.ConversationID} marked as failed`);
        } else {
          logger.warn(`No transaction found for conversation ID: ${resultData.ConversationID}`);
        }
      }
    } catch (error) {
      logger.error('Error processing B2C result callback:', error.message);
    }
  }),

  /**
   * Handle B2C timeout callback
   */
  handleB2CTimeoutCallback: catchAsync(async (req, res) => {
    // Respond immediately to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

    // Process the callback asynchronously
    try {
      // Log the timeout
      logger.warn('B2C timeout callback received', {
        requestData: req.body
      });

      // Update transaction in database if possible
      if (req.body.ConversationID || req.body.OriginatorConversationID) {
        const conversationId = req.body.ConversationID || req.body.OriginatorConversationID;

        const transaction = await Transaction.findOne({ conversationId });

        if (transaction) {
          // Update transaction fields
          transaction.status = 'cancelled';
          transaction.failureReason = 'Timeout - No Response';
          transaction.metadata = {
            ...transaction.metadata,
            completedAt: Math.floor(Date.now() / 1000),
            timeoutData: req.body
          };
          transaction.updatedAt = Math.floor(Date.now() / 1000);
          
          await transaction.save();
          logger.info(`Transaction ${conversationId} marked as cancelled due to timeout`);
        } else {
          logger.warn(`No transaction found for conversation ID: ${conversationId}`);
        }
      }
    } catch (error) {
      logger.error('Error processing B2C timeout callback:', error.message);
    }
  }),

  /**
   * Get transaction by ID
   */
  getTransactionById: catchAsync(async (req, res) => {
    const { id } = req.params;

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }

    return res.status(200).json({
      status: 'success',
      data: transaction
    });
  }),

  /**
   * Get transactions by reference
   */
  getTransactionsByReference: catchAsync(async (req, res) => {
    const { reference } = req.params;

    const transactions = await Transaction.find({ referenceId: reference });

    return res.status(200).json({
      status: 'success',
      results: transactions.length,
      data: transactions
    });
  }),

  /**
   * Get all transactions
   */
  getAllTransactions: catchAsync(async (req, res) => {
    const { status, type, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status.toLowerCase();
    }
    
    if (type) {
      query.transactionType = type.toUpperCase();
    }

    // Count total documents
    const total = await Transaction.countDocuments(query);
    
    // Get paginated results
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    return res.status(200).json({
      status: 'success',
      results: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: transactions
    });
  })
};