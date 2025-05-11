import logger from '../utils/logger.js';
import { ApiError, catchAsync } from '../middleware/errorHandler.js';
import mpesaService from '../services/mpesa.service.js';
import Transaction from '../models/transaction.model.js'; // Import MongoDB model

/**
 * Controller for transaction-related operations
 */
export const transactionsController = {
  /**
   * Get pending transactions that might have timed out
   */
  checkPendingTransactions: catchAsync(async (req, res) => {
    const now = Math.floor(Date.now() / 1000);
    
    // Find transactions that have timed out but not been handled
    const timedOutTransactions = await Transaction.find({
      status: "pending",
      timeoutHandled: false,
      timeoutAt: { $lt: now }
    });
    
    logger.info(`Found ${timedOutTransactions.length} timed out transactions`);
    
    // Process each timed out transaction
    const processedTransactions = [];
    
    for (const transaction of timedOutTransactions) {
      try {
        // For STK Push transactions, try to query status first
        if (transaction.transactionType === 'STK_PUSH' && transaction.checkoutRequestID) {
          try {
            await mpesaService.queryStkStatus(transaction.checkoutRequestID);
            
            // Re-fetch transaction to see if status was updated by the query
            const updatedTransaction = await Transaction.findById(transaction._id);
            
            if (updatedTransaction && updatedTransaction.status !== 'pending') {
              processedTransactions.push({
                id: transaction._id,
                status: updatedTransaction.status,
                action: 'status_query'
              });
              continue;
            }
          } catch (error) {
            logger.error(`Error querying STK status for ${transaction.checkoutRequestID}:`, error.message);
          }
        }
        
        // Mark as cancelled due to timeout
        transaction.status = 'cancelled';
        transaction.failureReason = 'Timeout - No Response';
        transaction.timeoutHandled = true;
        transaction.updatedAt = now;
        await transaction.save();
        
        processedTransactions.push({
          id: transaction._id,
          status: 'cancelled',
          action: 'timeout'
        });
        
        logger.info(`Transaction ${transaction._id} marked as cancelled due to timeout`);
      } catch (error) {
        logger.error(`Error processing timed out transaction ${transaction._id}:`, error.message);
      }
    }
    
    return res.status(200).json({
      status: 'success',
      message: `Processed ${processedTransactions.length} timed out transactions`,
      data: processedTransactions
    });
  }),
  
  /**
   * Retry a failed transaction
   */
  retryTransaction: catchAsync(async (req, res) => {
    const { id } = req.params;
    
    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found');
    }
    
    // Only allow retrying failed or cancelled transactions
    if (transaction.status !== 'failed' && transaction.status !== 'cancelled') {
      throw new ApiError(400, `Cannot retry transaction with status: ${transaction.status}`);
    }
    
    let result;
    
    if (transaction.transactionType === 'STK_PUSH') {
      // Retry STK Push
      result = await mpesaService.initiateSTKPush({
        phoneNumber: transaction.phoneNumber,
        amount: transaction.amount,
        accountReference: transaction.referenceId,
        transactionDesc: transaction.metadata?.transactionDesc || 'Payment'
      });
    } else if (transaction.transactionType === 'B2C') {
      // Retry B2C payment
      const metadata = transaction.metadata || {};
      
      result = await mpesaService.sendB2CPayment({
        phoneNumber: transaction.phoneNumber,
        amount: transaction.amount,
        commandID: metadata.commandID || 'BusinessPayment',
        remarks: metadata.remarks || 'Payment',
        occassion: metadata.occassion || ''
      });
    } else {
      throw new ApiError(400, `Cannot retry transaction of type: ${transaction.transactionType}`);
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Transaction retry initiated',
      data: {
        originalTransaction: transaction,
        retryResult: result
      }
    });
  }),
  
  /**
   * Get transaction statistics
   */
  getTransactionStats: catchAsync(async (req, res) => {
    // Get counts by status using MongoDB aggregation
    const statusStats = await Transaction.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get counts by type using MongoDB aggregation
    const typeStats = await Transaction.aggregate([
      {
        $group: {
          _id: "$transactionType",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get total amount for successful transactions
    const totalAmountResult = await Transaction.aggregate([
      {
        $match: { status: "success" }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);
    
    // Convert aggregation results to the expected format
    const byStatus = {
      pending: 0,
      success: 0,
      failed: 0,
      cancelled: 0
    };
    
    statusStats.forEach(stat => {
      if (stat._id in byStatus) {
        byStatus[stat._id] = stat.count;
      }
    });
    
    const byType = {
      stkPush: 0,
      b2c: 0
    };
    
    typeStats.forEach(stat => {
      if (stat._id === 'STK_PUSH') {
        byType.stkPush = stat.count;
      } else if (stat._id === 'B2C') {
        byType.b2c = stat.count;
      }
    });
    
    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;
    const totalTransactions = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
    
    return res.status(200).json({
      status: 'success',
      data: {
        totalTransactions,
        byStatus,
        byType,
        totalAmount: totalAmount.toFixed(2)
      }
    });
  })
};