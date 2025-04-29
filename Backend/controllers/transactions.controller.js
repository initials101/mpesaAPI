import { fine } from '../lib/fine.js'; // Changed from @/lib/fine.js
import logger from '../utils/logger.js';
import { ApiError, catchAsync } from '../middleware/errorHandler.js';
import mpesaService from '../services/mpesa.service.js';

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
    const timedOutTransactions = await fine.table("transactions")
      .select()
      .eq("status", "pending")
      .eq("timeoutHandled", false)
      .lt("timeoutAt", now);
    
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
            const updatedTransactions = await fine.table("transactions")
              .select()
              .eq("id", transaction.id);
            
            if (updatedTransactions.length > 0 && 
                updatedTransactions[0].status !== 'pending') {
              processedTransactions.push({
                id: transaction.id,
                status: updatedTransactions[0].status,
                action: 'status_query'
              });
              continue;
            }
          } catch (error) {
            logger.error(`Error querying STK status for ${transaction.checkoutRequestID}:`, error.message);
          }
        }
        
        // Mark as cancelled due to timeout
        await fine.table("transactions")
          .update({
            status: 'cancelled',
            failureReason: 'Timeout - No Response',
            timeoutHandled: true,
            updatedAt: now
          })
          .eq("id", transaction.id);
        
        processedTransactions.push({
          id: transaction.id,
          status: 'cancelled',
          action: 'timeout'
        });
        
        logger.info(`Transaction ${transaction.id} marked as cancelled due to timeout`);
      } catch (error) {
        logger.error(`Error processing timed out transaction ${transaction.id}:`, error.message);
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
    
    const transactions = await fine.table("transactions").select().eq("id", parseInt(id));
    
    if (!transactions || transactions.length === 0) {
      throw new ApiError(404, 'Transaction not found');
    }
    
    const transaction = transactions[0];
    
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
        transactionDesc: JSON.parse(transaction.metadata || '{}').transactionDesc || 'Payment'
      });
    } else if (transaction.transactionType === 'B2C') {
      // Retry B2C payment
      const metadata = JSON.parse(transaction.metadata || '{}');
      
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
    // Get counts by status
    const pendingCount = (await fine.table("transactions")
      .select("COUNT(*) as count")
      .eq("status", "pending"))[0].count;
    
    const successCount = (await fine.table("transactions")
      .select("COUNT(*) as count")
      .eq("status", "success"))[0].count;
    
    const failedCount = (await fine.table("transactions")
      .select("COUNT(*) as count")
      .eq("status", "failed"))[0].count;
    
    const cancelledCount = (await fine.table("transactions")
      .select("COUNT(*) as count")
      .eq("status", "cancelled"))[0].count;
    
    // Get counts by type
    const stkPushCount = (await fine.table("transactions")
      .select("COUNT(*) as count")
      .eq("transactionType", "STK_PUSH"))[0].count;
    
    const b2cCount = (await fine.table("transactions")
      .select("COUNT(*) as count")
      .eq("transactionType", "B2C"))[0].count;
    
    // Get total amount for successful transactions
    const successfulTransactions = await fine.table("transactions")
      .select("amount")
      .eq("status", "success");
    
    const totalAmount = successfulTransactions.reduce(
      (sum, transaction) => sum + parseFloat(transaction.amount),
      0
    );
    
    return res.status(200).json({
      status: 'success',
      data: {
        totalTransactions: parseInt(pendingCount) + parseInt(successCount) + parseInt(failedCount) + parseInt(cancelledCount),
        byStatus: {
          pending: parseInt(pendingCount),
          success: parseInt(successCount),
          failed: parseInt(failedCount),
          cancelled: parseInt(cancelledCount)
        },
        byType: {
          stkPush: parseInt(stkPushCount),
          b2c: parseInt(b2cCount)
        },
        totalAmount: totalAmount.toFixed(2)
      }
    });
  })
};