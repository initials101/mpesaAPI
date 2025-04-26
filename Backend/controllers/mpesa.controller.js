import { MpesaService } from '../services/mpesa.service.js';

export const MpesaController = {
  /**
   * Get access token
   */
  getToken: async (req, res) => {
    try {
      const token = await MpesaService.getAccessToken();
      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * STK Push
   */
  stkPush: async (req, res) => {
    try {
      const { phoneNumber, amount, accountReference, transactionDesc } = req.body;
      
      if (!phoneNumber || !amount || !accountReference) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const result = await MpesaService.stkPush({
        phoneNumber,
        amount,
        accountReference,
        transactionDesc: transactionDesc || 'Payment'
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * STK Push Query
   */
  stkPushQuery: async (req, res) => {
    try {
      const { checkoutRequestId } = req.body;
      
      if (!checkoutRequestId) {
        return res.status(400).json({ error: 'Missing checkoutRequestId' });
      }
      
      const result = await MpesaService.stkPushQuery(checkoutRequestId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Register C2B URL
   */
  registerC2BUrl: async (req, res) => {
    try {
      const { confirmationUrl, validationUrl, responseType } = req.body;
      
      const result = await MpesaService.registerC2BUrl({
        confirmationUrl,
        validationUrl,
        responseType
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * C2B Simulation
   */
  c2bSimulate: async (req, res) => {
    try {
      const { phoneNumber, amount, billRefNumber, commandId } = req.body;
      
      if (!phoneNumber || !amount) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const result = await MpesaService.c2bSimulation({
        phoneNumber,
        amount,
        billRefNumber,
        commandId
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * B2C Payment
   */
  b2cPayment: async (req, res) => {
    try {
      const { phoneNumber, amount, commandId, remarks, occasion } = req.body;
      
      if (!phoneNumber || !amount) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const result = await MpesaService.b2cPayment({
        phoneNumber,
        amount,
        commandId,
        remarks,
        occasion
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * STK Push Callback
   */
  stkCallback: async (req, res) => {
    try {
      const callbackData = req.body;
      await MpesaService.processStkCallback(callbackData);
      
      // Always respond with success to M-PESA
      res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
      console.error('STK Callback error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * C2B Validation
   */
  c2bValidation: async (req, res) => {
    try {
      const validationData = req.body;
      
      // Log validation data
      console.log('C2B Validation received:', JSON.stringify(validationData, null, 2));
      
      // In a real application, you would validate the transaction
      // For sandbox, always accept
      res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
      console.error('C2B Validation error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * C2B Confirmation
   */
  c2bConfirmation: async (req, res) => {
    try {
      const confirmationData = req.body;
      
      // Log confirmation data
      console.log('C2B Confirmation received:', JSON.stringify(confirmationData, null, 2));
      
      // In a real application, you would save this to a database
      
      res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
      console.error('C2B Confirmation error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * B2C Result
   */
  b2cResult: async (req, res) => {
    try {
      const resultData = req.body;
      
      // Log result data
      console.log('B2C Result received:', JSON.stringify(resultData, null, 2));
      
      // In a real application, you would save this to a database
      
      res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
      console.error('B2C Result error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * B2C Timeout
   */
  b2cTimeout: async (req, res) => {
    try {
      const timeoutData = req.body;
      
      // Log timeout data
      console.log('B2C Timeout received:', JSON.stringify(timeoutData, null, 2));
      
      // In a real application, you would save this to a database
      
      res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (error) {
      console.error('B2C Timeout error:', error);
      res.status(500).json({ error: error.message });
    }
  }
};