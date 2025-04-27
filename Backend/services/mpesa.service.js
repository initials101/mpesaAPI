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

return response.data;
} catch (error) {
logger.error('STK Push failed:', error.message);
throw new Error(`Failed to initiate STK Push: ${error.message}`);
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

const response = await this.api.post(
'/mpesa/b2c/v1/paymentrequest',
requestBody,
{
headers: {
'Authorization': `Bearer ${token}`
}
}
);

return response.data;
} catch (error) {
logger.error('B2C payment failed:', error.message);
throw new Error(`Failed to send B2C payment: ${error.message}`);
}
}

/**
* Register C2B URL (Customer to Business)
* 
* @param {Object} params - C2B URL registration parameters
* @param {string} params.shortCode - The short code to register URLs for
* @param {string} params.responseType - Response type (Completed or Cancelled)
* @param {string} params.confirmationURL - Confirmation URL
* @param {string} params.validationURL - Validation URL
* @returns {Promise<Object>} - C2B URL registration response
*/
async registerC2BUrls({ shortCode, responseType = 'Completed', confirmationURL, validationURL }) {
try {
const token = await this.getAccessToken();

const requestBody = {
ShortCode: shortCode || this.shortCode,
ResponseType: responseType,
ConfirmationURL: confirmationURL || config.mpesa.c2bConfirmationUrl,
ValidationURL: validationURL || config.mpesa.c2bValidationUrl
};

logger.info('Registering C2B URLs:', {
shortCode: requestBody.ShortCode,
confirmationURL: requestBody.ConfirmationURL,
validationURL: requestBody.ValidationURL
});

const response = await this.api.post(
'/mpesa/c2b/v1/registerurl',
requestBody,
{
headers: {
'Authorization': `Bearer ${token}`
}
}
);

return response.data;
} catch (error) {
logger.error('C2B URL registration failed:', error.message);
throw new Error(`Failed to register C2B URLs: ${error.message}`);
}
}

/**
* Simulate C2B transaction (for testing in sandbox)
* 
* @param {Object} params - C2B simulation parameters
* @param {string} params.phoneNumber - Customer phone number
* @param {number} params.amount - Amount to pay
* @param {string} params.billRefNumber - Bill reference number
* @param {string} params.commandID - Command ID (CustomerPayBillOnline or CustomerBuyGoodsOnline)
* @returns {Promise<Object>} - C2B simulation response
*/
async simulateC2BTransaction({ phoneNumber, amount, billRefNumber, commandID = 'CustomerPayBillOnline' }) {
try {
const token = await this.getAccessToken();
const formattedPhone = formatPhoneNumber(phoneNumber);

const requestBody = {
ShortCode: this.shortCode,
CommandID: commandID,
Amount: Math.round(amount),
Msisdn: formattedPhone,
BillRefNumber: billRefNumber || 'TEST'
};

logger.info('Simulating C2B transaction:', {
phoneNumber: formattedPhone,
amount,
billRefNumber: requestBody.BillRefNumber
});

const response = await this.api.post(
'/mpesa/c2b/v1/simulate',
requestBody,
{
headers: {
'Authorization': `Bearer ${token}`
}
}
);

return response.data;
} catch (error) {
logger.error('C2B simulation failed:', error.message);
throw new Error(`Failed to simulate C2B transaction: ${error.message}`);
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