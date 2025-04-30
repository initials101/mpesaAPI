import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { 
  generateBasicAuthString, 
  generateStkPushPassword 
} from '../utils/encryption.js';
import { 
  generateTimestamp, 
  formatPhoneNumber, 
  generateTransactionReference 
} from '../utils/helpers.js';
import { setTransactionTimeout, clearTransactionTimeout } from '../utils/timer.js';
import { fine } from '../lib/fine.js'; // Changed from @/lib/fine.js

/**
 * M-Pesa API Service
 * Handles all interactions with the M-Pesa API
 */
class MpesaService {
  constructor() {
    this.baseUrl = config.mpesa.baseUrl;
    this.consumerKey = config.mpesa.consumerKey;
    this.consumerSecret = config.mpesa.consumerSecret;
    this.shortCode = config.mpesa.shortCode;
    this.passkey = config.mpesa.passkey;
    this.initiatorName = config.mpesa.initiatorName;
    this.securityCredential = config.mpesa.securityCredential;
    
    // Create axios instance with base URL
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add response interceptor for logging
    this.api.interceptors.response.use(
      response => {
        logger.debug('M-Pesa API Response:', {
          url: response.config.url,
          status: response.status,
          data: response.data
        });
        return response;
      },
      error => {
        logger.error('M-Pesa API Error:', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Get OAuth token for API authentication
   * 
   * @returns {Promise<string>} - Access token
   */
  async getAccessToken() {
    try {
      const auth = generateBasicAuthString(this.consumerKey, this.consumerSecret);
      
      const response = await this.api.get('/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });
      
      return response.data.access_token;
    } catch (error) {
      logger.error('Failed to get access token:', error.message);
      throw new Error('Failed to authenticate with M-Pesa API');
    }
  }
  
  /**
   * Initiate STK Push request (Lipa Na M-Pesa Online)
   * 
   * @param {Object} params - STK Push parameters
   * @param {string} params.phoneNumber - Customer phone number
   * @param {number} params.amount - Amount to charge
   * @param {string} params.accountReference - Account reference
   * @param {string} params.transactionDesc - Transaction description
   * @returns {Promise<Object>} - STK Push response
   */
  async initiateSTKPush({ phoneNumber, amount, accountReference, transactionDesc }) {
    try {
      const token = await this.getAccessToken();
      const timestamp = generateTimestamp();
      const password = generateStkPushPassword(
        this.shortCode, 
        this.passkey, 
        timestamp
      );
      
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const requestBody = {
        BusinessShortCode: this.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: this.shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: config.mpesa.stkPushCallbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc || 'Payment'
      };
      
      logger.info('Initiating STK Push:', {
        phoneNumber: formattedPhone,
        amount,
        reference: accountReference
      });
      
      const response = await this.api.post(
        '/mpesa/stkpush/v1/processrequest',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.ResponseCode === '0') {
        // Save transaction to database
        const now = Math.floor(Date.now() / 1000);
        const timeoutAt = now + 120; // 2 minutes timeout
        
        // Create transaction record
        const transaction = {
          transactionType: 'STK_PUSH',
          amount,
          phoneNumber: formattedPhone,
          referenceId: accountReference,
          status: 'pending',
          checkoutRequestID: response.data.CheckoutRequestID,
          merchantRequestID: response.data.MerchantRequestID,
          timeoutAt,
          timeoutHandled: false,
          metadata: JSON.stringify({
            timestamp,
            transactionDesc,
            initiatedAt: now
          })
        };
        
        // Save to database
        await fine.table("transactions").insert(transaction);
        
        // Set timeout for this transaction
        this.setTransactionTimeout(response.data.CheckoutRequestID);
        
        // Start polling for status after a short delay (5 seconds)
        setTimeout(() => {
          this.startStatusPolling(response.data.CheckoutRequestID);
        }, 5000);
      }
      
      return response.data;
    } catch (error) {
      logger.error('STK Push failed:', error.message);
      throw new Error(`Failed to initiate STK Push: ${error.message}`);
    }
  }
  
  /**
   * Start polling for STK Push status
   * 
   * @param {string} checkoutRequestID - The checkout request ID
   * @param {number} intervalSeconds - Polling interval in seconds
   * @param {number} maxAttempts - Maximum number of polling attempts
   */
  startStatusPolling(checkoutRequestID, intervalSeconds = 5, maxAttempts = 12) {
    let attempts = 0;
    
    const pollInterval = setInterval(async () => {
      attempts++;
      
      try {
        // Check if transaction is still pending
        const transactions = await fine.table("transactions")
          .select()
          .eq("checkoutRequestID", checkoutRequestID);
        
        if (!transactions || transactions.length === 0) {
          clearInterval(pollInterval);
          return;
        }
        
        const transaction = transactions[0];
        
        // If transaction is no longer pending, stop polling
        if (transaction.status !== 'pending') {
          clearInterval(pollInterval);
          return;
        }
        
        logger.info(`Polling STK status for ${checkoutRequestID} (attempt ${attempts}/${maxAttempts})`);
        
        // Query status from M-Pesa
        try {
          await this.queryStkStatus(checkoutRequestID);
        } catch (error) {
          // Check if this is a "transaction is being processed" error
          if (error.response && 
              error.response.data && 
              error.response.data.errorMessage && 
              error.response.data.errorMessage.includes("transaction is being processed")) {
            
            // This is normal - the transaction is still in progress
            logger.info(`Transaction ${checkoutRequestID} is still being processed`);
            
            // Continue polling - don't count this as an error
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              
              // Check if transaction is still pending after all attempts
              const updatedTransactions = await fine.table("transactions")
                .select()
                .eq("checkoutRequestID", checkoutRequestID);
              
              if (updatedTransactions.length > 0 && updatedTransactions[0].status === 'pending') {
                // Mark as cancelled due to timeout if still pending
                await fine.table("transactions")
                  .update({
                    status: 'cancelled',
                    failureReason: 'Timeout - No Response',
                    timeoutHandled: true,
                    updatedAt: Math.floor(Date.now() / 1000)
                  })
                  .eq("id", updatedTransactions[0].id);
                
                logger.info(`Transaction ${checkoutRequestID} marked as cancelled after ${maxAttempts} polling attempts`);
              }
            }
          } else {
            // This is an actual error, log it but continue polling
            logger.warn(`Error querying STK status for ${checkoutRequestID}: ${error.message}`);
          }
        }
      } catch (error) {
        logger.warn(`Error in polling cycle for ${checkoutRequestID}: ${error.message}`);
        
        // If we encounter an error and reached max attempts, stop polling
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
        }
      }
      
      // If we've reached max attempts, stop polling
      if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        
        // Check if transaction is still pending after all attempts
        try {
          const updatedTransactions = await fine.table("transactions")
            .select()
            .eq("checkoutRequestID", checkoutRequestID);
          
          if (updatedTransactions.length > 0 && updatedTransactions[0].status === 'pending') {
            // Mark as cancelled due to timeout if still pending
            await fine.table("transactions")
              .update({
                status: 'cancelled',
                failureReason: 'Timeout - No Response',
                timeoutHandled: true,
                updatedAt: Math.floor(Date.now() / 1000)
              })
              .eq("id", updatedTransactions[0].id);
            
            logger.info(`Transaction ${checkoutRequestID} marked as cancelled after ${maxAttempts} polling attempts`);
          }
        } catch (error) {
          logger.error(`Error updating transaction ${checkoutRequestID} after polling timeout: ${error.message}`);
        }
      }
    }, intervalSeconds * 1000);
    
    // Store the interval ID to clear it if needed
    this._pollingIntervals = this._pollingIntervals || new Map();
    this._pollingIntervals.set(checkoutRequestID, pollInterval);
  }
  
  /**
   * Stop polling for a specific transaction
   * 
   * @param {string} checkoutRequestID - The checkout request ID
   */
  stopStatusPolling(checkoutRequestID) {
    if (this._pollingIntervals && this._pollingIntervals.has(checkoutRequestID)) {
      clearInterval(this._pollingIntervals.get(checkoutRequestID));
      this._pollingIntervals.delete(checkoutRequestID);
      logger.info(`Stopped polling for transaction ${checkoutRequestID}`);
    }
  }
  
  /**
   * Set a timeout for an STK Push transaction
   * 
   * @param {string} checkoutRequestID - The checkout request ID
   * @param {number} timeoutSeconds - Timeout in seconds (default: 120)
   */
  setTransactionTimeout(checkoutRequestID, timeoutSeconds = 120) {
    setTransactionTimeout(
      checkoutRequestID,
      async (id) => {
        try {
          logger.info(`Transaction timeout reached for ${id}`);
          
          // Check if transaction already completed
          const transactions = await fine.table("transactions")
            .select()
            .eq("checkoutRequestID", id)
            .eq("timeoutHandled", false);
          
          if (!transactions || transactions.length === 0) {
            logger.info(`No pending transaction found for ${id} or already handled`);
            return;
          }
          
          const transaction = transactions[0];
          
          // Only update if status is still pending
          if (transaction.status === 'pending') {
            // Try to query the status first
            try {
              await this.queryStkStatus(id);
              
              // Re-fetch transaction to see if status was updated by the query
              const updatedTransactions = await fine.table("transactions")
                .select()
                .eq("checkoutRequestID", id);
              
              if (updatedTransactions.length > 0 && 
                  updatedTransactions[0].status !== 'pending') {
                logger.info(`Transaction ${id} status updated by query: ${updatedTransactions[0].status}`);
                return;
              }
            } catch (error) {
              // Check if this is a "transaction is being processed" error
              if (error.response && 
                  error.response.data && 
                  error.response.data.errorMessage && 
                  error.response.data.errorMessage.includes("transaction is being processed")) {
                
                // This is normal - the transaction is still in progress
                logger.info(`Transaction ${id} is still being processed at timeout check`);
                
                // Don't mark as cancelled yet, let the polling handle it
                return;
              }
              
              logger.warn(`Error querying STK status for ${id} during timeout check: ${error.message}`);
            }
            
            logger.info(`Marking transaction ${id} as cancelled due to timeout`);
            
            // Update transaction status
            await fine.table("transactions")
              .update({
                status: 'cancelled',
                failureReason: 'Timeout - No Response',
                timeoutHandled: true,
                updatedAt: Math.floor(Date.now() / 1000)
              })
              .eq("checkoutRequestID", id);
            
            logger.info(`Transaction ${id} marked as cancelled due to timeout`);
          } else {
            // Just mark timeout as handled
            await fine.table("transactions")
              .update({
                timeoutHandled: true,
                updatedAt: Math.floor(Date.now() / 1000)
              })
              .eq("checkoutRequestID", id);
            
            logger.info(`Transaction ${id} timeout handled, status was: ${transaction.status}`);
          }
        } catch (error) {
          logger.error(`Error handling transaction timeout for ${id}: ${error.message}`);
        }
      },
      timeoutSeconds * 1000
    );
    
    logger.info(`Set ${timeoutSeconds}s timeout for transaction ${checkoutRequestID}`);
  }
  
  /**
   * Handle STK Push callback
   * 
   * @param {Object} callbackData - The callback data from M-Pesa
   * @returns {Promise<Object>} - Updated transaction
   */
  async handleStkCallback(callbackData) {
    try {
      const checkoutRequestID = callbackData.CheckoutRequestID;
      const resultCode = callbackData.ResultCode;
      const resultDesc = callbackData.ResultDesc;
      
      logger.info(`Processing STK callback for ${checkoutRequestID}`, {
        resultCode,
        resultDesc
      });
      
      // Stop polling for this transaction
      this.stopStatusPolling(checkoutRequestID);
      
      // Clear timeout for this transaction
      clearTransactionTimeout(checkoutRequestID);
      
      // Get transaction from database
      const transactions = await fine.table("transactions")
        .select()
        .eq("checkoutRequestID", checkoutRequestID);
      
      if (!transactions || transactions.length === 0) {
        logger.warn(`No transaction found for checkout request ID: ${checkoutRequestID}`);
        return null;
      }
      
      const transaction = transactions[0];
      
      // Determine status and failure reason
      let status = 'failed';
      let failureReason = resultDesc;
      
      if (resultCode === 0) {
        status = 'success';
        failureReason = null;
        
        // Extract payment details from callback metadata
        const paymentData = callbackData.CallbackMetadata?.Item?.reduce((acc, item) => {
          if (item.Name && item.Value !== undefined) {
            acc[item.Name] = item.Value;
          }
          return acc;
        }, {}) || {};
        
        // Update transaction with payment details
        await fine.table("transactions")
          .update({
            status,
            resultCode: resultCode.toString(),
            resultDesc,
            mpesaReceiptNumber: paymentData.MpesaReceiptNumber,
            transactionId: paymentData.MpesaReceiptNumber,
            timeoutHandled: true,
            metadata: JSON.stringify({
              ...JSON.parse(transaction.metadata || '{}'),
              paymentData,
              completedAt: Math.floor(Date.now() / 1000)
            }),
            updatedAt: Math.floor(Date.now() / 1000)
          })
          .eq("id", transaction.id);
        
        logger.info(`Transaction ${checkoutRequestID} marked as successful`, {
          mpesaReceiptNumber: paymentData.MpesaReceiptNumber
        });
      } else {
        // Handle specific error codes
        if (resultCode === 1032) {
          status = 'cancelled';
          failureReason = 'Transaction cancelled by user';
          logger.info(`Transaction ${checkoutRequestID} was cancelled by the user`);
        } else if (resultCode === 1037) {
          status = 'cancelled';
          failureReason = 'Timeout in customer response';
        } else if (resultCode === 1001) {
          status = 'failed';
          failureReason = 'Incorrect PIN';
        } else if (resultCode === 1019) {
          status = 'failed';
          failureReason = 'Transaction already processed';
        } else if (resultCode === 1025) {
          status = 'failed';
          failureReason = 'Insufficient funds';
        }
        
        // Update transaction with failure details
        await fine.table("transactions")
          .update({
            status,
            resultCode: resultCode.toString(),
            resultDesc,
            failureReason,
            timeoutHandled: true,
            metadata: JSON.stringify({
              ...JSON.parse(transaction.metadata || '{}'),
              completedAt: Math.floor(Date.now() / 1000)
            }),
            updatedAt: Math.floor(Date.now() / 1000)
          })
          .eq("id", transaction.id);
        
        logger.info(`Transaction ${checkoutRequestID} marked as ${status}`, {
          resultCode,
          failureReason
        });
      }
      
      // Return updated transaction
      return (await fine.table("transactions").select().eq("id", transaction.id))[0];
    } catch (error) {
      logger.error('Error handling STK callback:', error.message);
      throw error;
    }
  }
  
  /**
   * Query STK Push transaction status
   * 
   * @param {string} checkoutRequestID - The checkout request ID
   * @returns {Promise<Object>} - Transaction status
   */
  async queryStkStatus(checkoutRequestID) {
    try {
      const token = await this.getAccessToken();
      const timestamp = generateTimestamp();
      const password = generateStkPushPassword(
        this.shortCode, 
        this.passkey, 
        timestamp
      );
      
      const requestBody = {
        BusinessShortCode: this.shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };
      
      logger.info(`Querying STK status for ${checkoutRequestID}`);
      
      const response = await this.api.post(
        '/mpesa/stkpushquery/v1/query',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // Update transaction based on query response
      if (response.data) {
        const resultCode = response.data.ResultCode;
        const resultDesc = response.data.ResultDesc;
        
        logger.info(`STK status query for ${checkoutRequestID} returned code ${resultCode}: ${resultDesc}`);
        
        // Get transaction from database
        const transactions = await fine.table("transactions")
          .select()
          .eq("checkoutRequestID", checkoutRequestID);
        
        if (transactions && transactions.length > 0) {
          const transaction = transactions[0];
          
          // Only update if status is still pending
          if (transaction.status === 'pending') {
            let status = 'pending'; // Default to pending unless we get a definitive result
            let failureReason = null;
            
            if (resultCode === 0) {
              status = 'success';
            } else if (resultCode === 1032) {
              status = 'cancelled';
              failureReason = 'Transaction cancelled by user';
            } else if (resultCode === 1037) {
              status = 'cancelled';
              failureReason = 'Timeout in customer response';
            } else if (resultCode === 1001) {
              status = 'failed';
              failureReason = 'Incorrect PIN';
            } else if (resultCode === 1025) {
              status = 'failed';
              failureReason = 'Insufficient funds';
            } else {
              // For other codes, we'll keep it as pending unless it's a definitive failure
              if (resultCode !== 1 && resultCode !== 2) { // 1 and 2 are often "in progress" codes
                status = 'failed';
                failureReason = resultDesc;
              }
            }
            
            // Only update if we have a definitive status change
            if (status !== 'pending') {
              // Update transaction
              await fine.table("transactions")
                .update({
                  status,
                  resultCode: resultCode.toString(),
                  resultDesc,
                  failureReason,
                  timeoutHandled: true,
                  updatedAt: Math.floor(Date.now() / 1000)
                })
                .eq("id", transaction.id);
              
              logger.info(`Updated transaction ${checkoutRequestID} status from query: ${status}`);
            } else {
              logger.info(`Transaction ${checkoutRequestID} is still pending after status query`);
            }
          }
        }
      }
      
      return response.data;
    } catch (error) {
      // Special handling for "transaction is being processed" error
      if (error.response && 
          error.response.data && 
          error.response.data.errorMessage && 
          error.response.data.errorMessage.includes("transaction is being processed")) {
        
        // This is not a real error, it's just M-Pesa telling us the transaction is still in progress
        logger.info(`Transaction ${checkoutRequestID} is still being processed`);
        
        // Return a standardized response for in-progress transactions
        return {
          ResultCode: -1, // Custom code for "in progress"
          ResultDesc: "The transaction is being processed",
          CheckoutRequestID: checkoutRequestID,
          inProgress: true
        };
      }
      
      // For other errors, log and rethrow
      logger.warn(`Error querying STK status for ${checkoutRequestID}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Send B2C payment (Business to Customer)
   * 
   * @param {Object} params - B2C parameters
   * @param {string} params.phoneNumber - Recipient phone number
   * @param {number} params.amount - Amount to send
   * @param {string} params.commandID - Command ID (SalaryPayment, BusinessPayment, PromotionPayment)
   * @param {string} params.remarks - Payment remarks
   * @param {string} params.occassion - Payment occasion
   * @returns {Promise<Object>} - B2C response
   */
  async sendB2CPayment({ phoneNumber, amount, commandID = 'BusinessPayment', remarks, occassion }) {
    try {
      const token = await this.getAccessToken();
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const transactionID = generateTransactionReference('B2C');
      
      const requestBody = {
        InitiatorName: this.initiatorName,
        SecurityCredential: this.securityCredential,
        CommandID: commandID,
        Amount: Math.round(amount),
        PartyA: this.shortCode,
        PartyB: formattedPhone,
        Remarks: remarks || 'B2C Payment',
        QueueTimeOutURL: config.mpesa.b2cQueueTimeoutUrl,
        ResultURL: config.mpesa.b2cResultUrl,
        Occassion: occassion || '',
        OriginatorConversationID: transactionID
      };
      
      logger.info('Sending B2C payment:', {
        phoneNumber: formattedPhone,
        amount,
        transactionID
      });
      
      try {
        const response = await this.api.post(
          '/mpesa/b2c/v1/paymentrequest',
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.data.ResponseCode === '0') {
          // Save transaction to database
          const transaction = {
            transactionType: 'B2C',
            amount,
            phoneNumber: formattedPhone,
            referenceId: transactionID,
            conversationId: response.data.ConversationID,
            originatorConversationId: response.data.OriginatorConversationID,
            status: 'pending',
            metadata: JSON.stringify({
              commandID,
              remarks,
              occassion,
              initiatedAt: Math.floor(Date.now() / 1000)
            })
          };
          
          // Save to database
          await fine.table("transactions").insert(transaction);
        }
        
        return response.data;
      } catch (error) {
        // Handle specific error cases
        if (error.response && error.response.data) {
          const errorData = error.response.data;
          
          // Log the detailed error information
          logger.error('B2C payment API error details:', {
            status: error.response.status,
            errorCode: errorData.errorCode,
            errorMessage: errorData.errorMessage || 'Unknown error',
            requestId: errorData.requestId
          });
          
          // Create a more user-friendly error message
          let errorMessage = 'B2C payment failed';
          
          if (errorData.errorMessage) {
            errorMessage += `: ${errorData.errorMessage}`;
          } else if (errorData.errorCode) {
            errorMessage += ` with error code ${errorData.errorCode}`;
          }
          
          // Save failed transaction to database for tracking
          const transaction = {
            transactionType: 'B2C',
            amount,
            phoneNumber: formattedPhone,
            referenceId: transactionID,
            status: 'failed',
            failureReason: errorMessage,
            metadata: JSON.stringify({
              commandID,
              remarks,
              occassion,
              initiatedAt: Math.floor(Date.now() / 1000),
              errorDetails: {
                errorCode: errorData.errorCode,
                errorMessage: errorData.errorMessage,
                requestId: errorData.requestId
              }
            })
          };
          
          try {
            // Save to database
            await fine.table("transactions").insert(transaction);
          } catch (dbError) {
            logger.error('Failed to save failed B2C transaction to database:', dbError.message);
          }
          
          throw new Error(errorMessage);
        }
        
        // For other errors, rethrow with a clearer message
        throw new Error(`Failed to send B2C payment: ${error.message}`);
      }
    } catch (error) {
      // Make sure we have a clean string error message
      const errorMessage = typeof error.message === 'string' 
        ? error.message 
        : 'Unknown error occurred during B2C payment';
      
      logger.error('B2C payment failed:', errorMessage);
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Query transaction status
   * 
   * @param {Object} params - Query parameters
   * @param {string} params.transactionID - Transaction ID to query
   * @param {number} params.identifierType - Identifier type (1: MSISDN, 2: Till Number, 4: Organization shortcode)
   * @returns {Promise<Object>} - Transaction status response
   */
  async queryTransactionStatus({ transactionID, identifierType = 1 }) {
    try {
      const token = await this.getAccessToken();
      const requestBody = {
        Initiator: this.initiatorName,
        SecurityCredential: this.securityCredential,
        CommandID: 'TransactionStatusQuery',
        TransactionID: transactionID,
        PartyA: this.shortCode,
        IdentifierType: identifierType,
        ResultURL: config.mpesa.b2cResultUrl,
        QueueTimeOutURL: config.mpesa.b2cQueueTimeoutUrl,
        Remarks: 'Transaction status query',
        Occasion: 'Transaction status query'
      };
      
      logger.info('Querying transaction status:', { transactionID });
      
      const response = await this.api.post(
        '/mpesa/transactionstatus/v1/query',
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      logger.error('Transaction status query failed:', error.message);
      throw new Error(`Failed to query transaction status: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new MpesaService();