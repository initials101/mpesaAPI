/**
 * M-Pesa API Endpoints Reference
 * 
 * This file contains all the API endpoints for the M-Pesa Payment API.
 * Use it as a reference when making requests to the API.
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

export const ENDPOINTS = {
  // Health check endpoint
  HEALTH: `${BASE_URL}/health`,
  
  // Payment endpoints
  PAYMENTS: {
    // STK Push (Lipa Na M-Pesa Online)
    STK_PUSH: `${BASE_URL}/api/payments/stk-push`,
    
    // Business to Customer (B2C) payment
    B2C: `${BASE_URL}/api/payments/b2c`,
    
    // Transaction status query
    TRANSACTION_STATUS: `${BASE_URL}/api/payments/transaction-status`,
    
    // Get all transactions with optional filtering
    GET_ALL_TRANSACTIONS: `${BASE_URL}/api/payments/transactions`,
    
    // Get transaction by ID
    GET_TRANSACTION_BY_ID: (id) => `${BASE_URL}/api/payments/transactions/${id}`,
    
    // Get transactions by reference
    GET_TRANSACTIONS_BY_REFERENCE: (reference) => `${BASE_URL}/api/payments/transactions/reference/${reference}`,
  },
  
  // Callback endpoints (for M-Pesa to call)
  CALLBACKS: {
    // STK Push callback
    STK: `${BASE_URL}/api/payments/callbacks/stk`,
    
    // B2C result callback
    B2C_RESULT: `${BASE_URL}/api/payments/callbacks/b2c/result`,
    
    // B2C timeout callback
    B2C_TIMEOUT: `${BASE_URL}/api/payments/callbacks/b2c/timeout`,
  }
};

/**
 * Example usage:
 * 
 * import { ENDPOINTS } from './utils/endpoints.js';
 * import axios from 'axios';
 * 
 * // Make STK Push request
 * const response = await axios.post(ENDPOINTS.PAYMENTS.STK_PUSH, {
 *   phoneNumber: '0112395869',
 *   amount: 1,
 *   accountReference: 'TEST123',
 *   transactionDesc: 'Test Payment'
 * });
 * 
 * // Get transaction by ID
 * const transactionId = 'abc123';
 * const transaction = await axios.get(ENDPOINTS.PAYMENTS.GET_TRANSACTION_BY_ID(transactionId));
 */

/**
 * API Request Examples
 * 
 * 1. STK Push
 * POST /api/payments/stk-push
 * {
 *   "phoneNumber": "0112395869",
 *   "amount": 1,
 *   "accountReference": "TEST123",
 *   "transactionDesc": "Test Payment"
 * }
 * 
 * 2. B2C Payment
 * POST /api/payments/b2c
 * {
 *   "phoneNumber": "0112395869",
 *   "amount": 100,
 *   "commandID": "BusinessPayment",
 *   "remarks": "Salary payment",
 *   "occassion": "Monthly salary"
 * }
 * 
 * 3. Transaction Status
 * POST /api/payments/transaction-status
 * {
 *   "transactionID": "OEI2AK4Q16",
 *   "identifierType": 1
 * }
 */