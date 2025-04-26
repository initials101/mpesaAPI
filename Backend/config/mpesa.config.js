import dotenv from 'dotenv';

dotenv.config();

export const mpesaConfig = {
  environment: process.env.MPESA_ENV || 'sandbox',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
  shortCode: process.env.MPESA_SHORTCODE,
  passkey: process.env.MPESA_PASSKEY,
  callbackUrl: process.env.CALLBACK_URL,
  confirmationUrl: process.env.CONFIRMATION_URL,
  validationUrl: process.env.VALIDATION_URL,
  initiatorName: process.env.INITIATOR_NAME,
  securityCredential: process.env.SECURITY_CREDENTIAL,
  b2cResultUrl: process.env.B2C_RESULT_URL,
  b2cTimeoutUrl: process.env.B2C_TIMEOUT_URL
};

// Base URLs for Safaricom Daraja API
export const SANDBOX_URL = 'https://sandbox.safaricom.co.ke';
export const PRODUCTION_URL = 'https://api.safaricom.co.ke';

// Get the base URL based on environment
export const getBaseUrl = () => {
  return mpesaConfig.environment === 'production' ? PRODUCTION_URL : SANDBOX_URL;
};