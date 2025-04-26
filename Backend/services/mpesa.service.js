import axios from 'axios';
import { mpesaConfig, getBaseUrl } from '../config/mpesa.config.js';

// In-memory token storage (in production, use Redis or another cache)
let accessToken = null;
let tokenExpiry = null;

export class MpesaService {
  /**
   * Get the OAuth token for authentication
   */
  static async getAccessToken() {
    // Check if we have a valid token
    if (accessToken && tokenExpiry && tokenExpiry > new Date()) {
      return accessToken;
    }

    try {
      // Encode consumer key and secret
      const auth = Buffer.from(`${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`).toString('base64');
      
      // Make request to get access token
      const response = await axios({
        method: 'get',
        url: `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      // Set token and expiry
      accessToken = response.data.access_token;
      // Token expires in 1 hour (3600 seconds)
      tokenExpiry = new Date(Date.now() + 3600 * 1000);

      return accessToken;
    } catch (error) {
      console.error('Error getting access token:', error.response?.data || error.message);
      throw new Error('Failed to get access token');
    }
  }

  /**
   * STK Push - Lipa Na M-Pesa Online
   */
  static async stkPush(params) {
    try {
      const token = await this.getAccessToken();
      
      // Format phone number (remove leading 0 or +254)
      let phoneNumber = params.phoneNumber.toString().trim();
      if (phoneNumber.startsWith('+254')) {
        phoneNumber = phoneNumber.substring(4);
      } else if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
      }
      phoneNumber = `254${phoneNumber}`;
      
      // Generate timestamp
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
      
      // Generate password
      const password = Buffer.from(`${mpesaConfig.shortCode}${mpesaConfig.passkey}${timestamp}`).toString('base64');
      
      // Prepare request data
      const data = {
        BusinessShortCode: mpesaConfig.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: params.amount,
        PartyA: phoneNumber,
        PartyB: mpesaConfig.shortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: params.callbackUrl || mpesaConfig.callbackUrl,
        AccountReference: params.accountReference,
        TransactionDesc: params.transactionDesc
      };
      
      // Make request
      const response = await axios({
        method: 'post',
        url: `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data
      });
      
      return response.data;
    } catch (error) {
      console.error('STK Push error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'STK Push failed');
    }
  }

  /**
   * Check STK Push transaction status
   */
  static async stkPushQuery(checkoutRequestId) {
    try {
      const token = await this.getAccessToken();
      
      // Generate timestamp
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
      
      // Generate password
      const password = Buffer.from(`${mpesaConfig.shortCode}${mpesaConfig.passkey}${timestamp}`).toString('base64');
      
      // Prepare request data
      const data = {
        BusinessShortCode: mpesaConfig.shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };
      
      // Make request
      const response = await axios({
        method: 'post',
        url: `${getBaseUrl()}/mpesa/stkpushquery/v1/query`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data
      });
      
      return response.data;
    } catch (error) {
      console.error('STK Push Query error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'STK Push query failed');
    }
  }

  /**
   * Register C2B URL
   */
  static async registerC2BUrl(params) {
    try {
      const token = await this.getAccessToken();
      
      // Prepare request data
      const data = {
        ShortCode: mpesaConfig.shortCode,
        ResponseType: params.responseType || 'Completed',
        ConfirmationURL: params.confirmationUrl || mpesaConfig.confirmationUrl,
        ValidationURL: params.validationUrl || mpesaConfig.validationUrl
      };
      
      // Make request
      const response = await axios({
        method: 'post',
        url: `${getBaseUrl()}/mpesa/c2b/v1/registerurl`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data
      });
      
      return response.data;
    } catch (error) {
      console.error('Register C2B URL error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'Register C2B URL failed');
    }
  }

  /**
   * C2B Simulation
   */
  static async c2bSimulation(params) {
    try {
      const token = await this.getAccessToken();
      
      // Format phone number (remove leading 0 or +254)
      let phoneNumber = params.phoneNumber.toString().trim();
      if (phoneNumber.startsWith('+254')) {
        phoneNumber = phoneNumber.substring(4);
      } else if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
      }
      phoneNumber = `254${phoneNumber}`;
      
      // Prepare request data
      const data = {
        ShortCode: mpesaConfig.shortCode,
        CommandID: params.commandId || 'CustomerPayBillOnline',
        Amount: params.amount,
        Msisdn: phoneNumber,
        BillRefNumber: params.billRefNumber || ''
      };
      
      // Make request
      const response = await axios({
        method: 'post',
        url: `${getBaseUrl()}/mpesa/c2b/v1/simulate`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data
      });
      
      return response.data;
    } catch (error) {
      console.error('C2B Simulation error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'C2B Simulation failed');
    }
  }

  /**
   * B2C Payment
   */
  static async b2cPayment(params) {
    try {
      const token = await this.getAccessToken();
      
      // Format phone number (remove leading 0 or +254)
      let phoneNumber = params.phoneNumber.toString().trim();
      if (phoneNumber.startsWith('+254')) {
        phoneNumber = phoneNumber.substring(4);
      } else if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
      }
      phoneNumber = `254${phoneNumber}`;
      
      // Prepare request data
      const data = {
        InitiatorName: mpesaConfig.initiatorName,
        SecurityCredential: mpesaConfig.securityCredential,
        CommandID: params.commandId || 'BusinessPayment',
        Amount: params.amount,
        PartyA: mpesaConfig.shortCode,
        PartyB: phoneNumber,
        Remarks: params.remarks || 'B2C Payment',
        QueueTimeOutURL: params.queueTimeoutUrl || mpesaConfig.b2cTimeoutUrl,
        ResultURL: params.resultUrl || mpesaConfig.b2cResultUrl,
        Occasion: params.occasion || ''
      };
      
      // Make request
      const response = await axios({
        method: 'post',
        url: `${getBaseUrl()}/mpesa/b2c/v1/paymentrequest`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data
      });
      
      return response.data;
    } catch (error) {
      console.error('B2C Payment error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.errorMessage || 'B2C Payment failed');
    }
  }

  /**
   * Process STK Push callback
   */
  static async processStkCallback(callbackData) {
    try {
      const body = callbackData.Body.stkCallback;
      
      // Log callback data
      console.log('STK Callback received:', JSON.stringify(body, null, 2));
      
      // In a real application, you would save this to a database
      // and update the transaction status
      
      return { success: true };
    } catch (error) {
      console.error('Process STK Callback error:', error);
      return { success: false, error: error.message };
    }
  }
}