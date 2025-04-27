import mpesaService from '../services/mpesa.service.js';
import logger from '../utils/logger.js';
import { ApiError, catchAsync } from '../middleware/errorHandler.js';
import { formatPhoneNumber } from '../utils/helpers.js';
import Transaction from '../models/transaction.model.js';
import Callback from '../models/callback.model.js';

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
      // Save transaction to database
      await Transaction.create({
        transactionType: 'STK_PUSH',
        amount,
        phoneNumber: formatPhoneNumber(phoneNumber),
        accountReference,
        description: transactionDesc,
        merchantRequestID: result.MerchantRequestID,
        checkoutRequestID: result.CheckoutRequestID,
        status: 'PENDING'
      });
      
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
    
    const result = await mpesaService.sendB2CPayment({
      phoneNumber: formatPhoneNumber(phoneNumber),
      amount,
      commandID,
      remarks,
      occassion
    });
    
    if (result.ResponseCode === '0') {
      // Save transaction to database
      await Transaction.create({
        transactionType: 'B2C',
        amount,
        phoneNumber: formatPhoneNumber(phoneNumber),
        accountReference: result.OriginatorConversationID,
        description: remarks || 'B2C Payment',
        conversationID: result.ConversationID,
        originatorConversationID: result.OriginatorConversationID,
        status: 'PENDING',
        metadata: { occassion, commandID }
      });
      
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
  }),
  
  /**
   * Register C2B URLs
   */
  registerC2BUrls: catchAsync(async (req, res) => {
    const { shortCode, responseType, confirmationURL, validationURL } = req.body;
    
    logger.info('C2B URL registration request received', {
      shortCode,
      responseType,
      confirmationURL,
      validationURL
    });
    
    const result = await mpesaService.registerC2BUrls({
      shortCode,
      responseType,
      confirmationURL,
      validationURL
    });
    
    if (result.ResponseCode === '0') {
      return res.status(200).json({
        status: 'success',
        message: 'C2B URLs registered successfully',
        data: {
          responseCode: result.ResponseCode,
          responseDescription: result.ResponseDescription
        }
      });
    } else {
      throw new ApiError(400, `C2B URL registration failed: ${result.ResponseDescription}`);
    }
  }),
  
  /**
   * Simulate C2B transaction (sandbox only)
   */
  simulateC2BTransaction: catchAsync(async (req, res) => {
    const { phoneNumber, amount, billRefNumber, commandID } = req.body;
    
    logger.info('C2B transaction simulation request received', {
      phoneNumber,
      amount,
      billRefNumber
    });
    
    const result = await mpesaService.simulateC2BTransaction({
      phoneNumber: formatPhoneNumber(phoneNumber),
      amount,
      billRefNumber,
      commandID
    });
    
    if (result.ResponseCode === '0') {
      // Save transaction to database
      await Transaction.create({
        transactionType: 'C2B',
        amount,
        phoneNumber: formatPhoneNumber(phoneNumber),
        accountReference: billRefNumber,
        status: 'PENDING',
        metadata: { commandID }
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'C2B transaction simulated successfully',
        data: {
          responseCode: result.ResponseCode,
          responseDescription: result.ResponseDescription
        }
      });
    } else {
      throw new ApiError(400, `C2B transaction simulation failed: ${result.ResponseDescription}`);
    }
  }),
  
  /**
   * Handle C2B validation
   */
  handleC2BValidation: catchAsync(async (req, res) => {
    // Log the validation request
    logger.info('C2B validation request received', {
      transactionType: req.body.TransactionType,
      transID: req.body.TransID,
      billRefNumber: req.body.BillRefNumber
    });
    
    // Save callback data
    await Callback.create({
      callbackType: 'C2B_VALIDATION',
      transactionId: req.body.TransID,
      rawData: req.body,
      processed: true
    });
    
    // Here you would typically validate the transaction
    // For example, check if the account number exists, if the amount is correct, etc.
    // For this example, we'll accept all transactions
    
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  }),
  
  /**
   * Handle C2B confirmation
   */
  handleC2BConfirmation: catchAsync(async (req, res) => {
    // Respond immediately to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    
    // Process the confirmation asynchronously
    const transactionData = req.body;
    
    logger.info('C2B confirmation received', {
      transactionType: transactionData.TransactionType,
      transID: transactionData.TransID,
      transTime: transactionData.TransTime,
      amount: transactionData.TransAmount,
      phoneNumber: transactionData.MSISDN,
      accountReference: transactionData.BillRefNumber
    });
    
    try {
      // Save callback data
      await Callback.create({
        callbackType: 'C2B_CONFIRMATION',
        transactionId: transactionData.TransID,
        resultCode: '0',
        resultDesc: 'Success',
        rawData: transactionData,
        processed: true
      });
      
      // Find or create transaction
      const transaction = await Transaction.findOneAndUpdate(
        { 
          accountReference: transactionData.BillRefNumber,
          phoneNumber: transactionData.MSISDN
        },
        {
          $set: {
            transactionType: 'C2B',
            amount: parseFloat(transactionData.TransAmount),
            phoneNumber: transactionData.MSISDN,
            accountReference: transactionData.BillRefNumber,
            transactionID: transactionData.TransID,
            status: 'COMPLETED',
            metadata: transactionData
          }
        },
        { upsert: true, new: true }
      );
      
      logger.info('C2B transaction recorded', { transactionId: transaction._id });
    } catch (error) {
      logger.error('Error processing C2B confirmation', {
        error: error.message,
        transactionId: transactionData.TransID
      });
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
   * Handle STK Push callback
   */
  handleStkCallback: catchAsync(async (req, res) => {
    // Respond immediately to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    
    // Process the callback asynchronously
    const callbackData = req.body.Body.stkCallback;
    
    logger.info('STK callback received', {
      requestId: callbackData.CheckoutRequestID,
      resultCode: callbackData.ResultCode
    });
    
    try {
      // Save callback data
      await Callback.create({
        callbackType: 'STK',
        requestId: callbackData.CheckoutRequestID,
        resultCode: callbackData.ResultCode.toString(),
        resultDesc: callbackData.ResultDesc,
        rawData: req.body,
        processed: true
      });
      
      if (callbackData.ResultCode === 0) {
        // Payment successful
        const paymentData = callbackData.CallbackMetadata.Item.reduce((acc, item) => {
          if (item.Name && item.Value !== undefined) {
            acc[item.Name] = item.Value;
          }
          return acc;
        }, {});
        
        logger.info('STK payment successful', {
          requestId: callbackData.CheckoutRequestID,
          transactionId: paymentData.MpesaReceiptNumber,
          amount: paymentData.Amount
        });
        
        // Update transaction in database
        await Transaction.findOneAndUpdate(
          { checkoutRequestID: callbackData.CheckoutRequestID },
          {
            $set: {
              status: 'COMPLETED',
              mpesaReceiptNumber: paymentData.MpesaReceiptNumber,
              transactionID: paymentData.MpesaReceiptNumber,
              resultCode: callbackData.ResultCode.toString(),
              resultDesc: callbackData.ResultDesc,
              metadata: paymentData
            }
          }
        );
      } else {
        // Payment failed
        logger.warn('STK payment failed', {
          requestId: callbackData.CheckoutRequestID,
          resultCode: callbackData.ResultCode,
          resultDesc: callbackData.ResultDesc
        });
        
        // Update transaction in database
        await Transaction.findOneAndUpdate(
          { checkoutRequestID: callbackData.CheckoutRequestID },
          {
            $set: {
              status: 'FAILED',
              resultCode: callbackData.ResultCode.toString(),
              resultDesc: callbackData.ResultDesc
            }
          }
        );
      }
    } catch (error) {
      logger.error('Error processing STK callback', {
        error: error.message,
        checkoutRequestID: callbackData.CheckoutRequestID
      });
    }
  }),
  
  /**
   * Handle B2C result callback
   */
  handleB2CResultCallback: catchAsync(async (req, res) => {
    // Respond immediately to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    
    // Process the callback asynchronously
    const resultData = req.body.Result;
    
    logger.info('B2C result callback received', {
      conversationId: resultData.ConversationID,
      resultCode: resultData.ResultCode
    });
    
    try {
      // Save callback data
      await Callback.create({
        callbackType: 'B2C_RESULT',
        transactionId: resultData.TransactionID,
        resultCode: resultData.ResultCode.toString(),
        resultDesc: resultData.ResultDesc,
        rawData: req.body,
        processed: true
      });
      
      if (resultData.ResultCode === 0) {
        // Payment successful
        logger.info('B2C payment successful', {
          conversationId: resultData.ConversationID,
          transactionId: resultData.TransactionID,
          resultParameters: resultData.ResultParameters
        });
        
        // Update transaction in database
        await Transaction.findOneAndUpdate(
          { 
            $or: [
              { conversationID: resultData.ConversationID },
              { originatorConversationID: resultData.OriginatorConversationID }
            ]
          },
          {
            $set: {
              status: 'COMPLETED',
              transactionID: resultData.TransactionID,
              resultCode: resultData.ResultCode.toString(),
              resultDesc: resultData.ResultDesc,
              metadata: {
                ...resultData.ResultParameters,
                transactionCompletedDateTime: resultData.TransactionCompletedDateTime,
                receiverPartyPublicName: resultData.ReceiverPartyPublicName
              }
            }
          }
        );
      } else {
        // Payment failed
        logger.warn('B2C payment failed', {
          conversationId: resultData.ConversationID,
          resultCode: resultData.ResultCode,
          resultDesc: resultData.ResultDesc
        });
        
        // Update transaction in database
        await Transaction.findOneAndUpdate(
          { 
            $or: [
              { conversationID: resultData.ConversationID },
              { originatorConversationID: resultData.OriginatorConversationID }
            ]
          },
          {
            $set: {
              status: 'FAILED',
              resultCode: resultData.ResultCode.toString(),
              resultDesc: resultData.ResultDesc
            }
          }
        );
      }
    } catch (error) {
      logger.error('Error processing B2C result callback', {
        error: error.message,
        conversationId: resultData.ConversationID
      });
    }
  }),
  
  /**
   * Handle B2C timeout callback
   */
  handleB2CTimeoutCallback: catchAsync(async (req, res) => {
    // Respond immediately to M-Pesa
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
    
    // Log the timeout
    logger.warn('B2C timeout callback received', {
      requestData: req.body
    });
    
    try {
      // Save callback data
      await Callback.create({
        callbackType: 'B2C_TIMEOUT',
        rawData: req.body,
        processed: true
      });
      
      // Update transaction in database if possible
      if (req.body.ConversationID || req.body.OriginatorConversationID) {
        await Transaction.findOneAndUpdate(
          { 
            $or: [
              { conversationID: req.body.ConversationID },
              { originatorConversationID: req.body.OriginatorConversationID }
            ]
          },
          {
            $set: {
              status: 'TIMEOUT'
            }
          }
        );
      }
    } catch (error) {
      logger.error('Error processing B2C timeout callback', {
        error: error.message
      });
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
    
    const transactions = await Transaction.find({ accountReference: reference });
    
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
    
    const query = {};
    
    if (status) {
      query.status = status.toUpperCase();
    }
    
    if (type) {
      query.transactionType = type.toUpperCase();
    }
    
    const options = {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit: parseInt(limit)
    };
    
    const transactions = await Transaction.find(query, null, options);
    const total = await Transaction.countDocuments(query);
    
    return res.status(200).json({
      status: 'success',
      results: transactions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: transactions
    });
  })
};