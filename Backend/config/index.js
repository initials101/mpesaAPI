import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

// Fallback to .env if .env.development doesn't exist
if (process.env.NODE_ENV !== 'production' && !process.env.MPESA_CONSUMER_KEY) {
  dotenv.config({ path: path.resolve(__dirname, '../../', '.env') });
}

const config = {
  // Server configuration
  env: process.env.NODE_ENV || 'development',
  server: {
    port: process.env.PORT || 5000
  },
  
  // Database configuration
  database: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // M-Pesa API configuration
  mpesa: {
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    passkey: process.env.MPESA_PASSKEY,
    shortCode: process.env.MPESA_SHORTCODE,
    initiatorName: process.env.MPESA_INITIATOR_NAME,
    initiatorPassword: process.env.MPESA_INITIATOR_PASSWORD,
    securityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
    b2cResultUrl: process.env.MPESA_B2C_RESULT_URL,
    b2cQueueTimeoutUrl: process.env.MPESA_B2C_QUEUE_TIMEOUT_URL,
    stkPushCallbackUrl: process.env.MPESA_STK_PUSH_CALLBACK_URL,
    c2bValidationUrl: process.env.MPESA_C2B_VALIDATION_URL,
    c2bConfirmationUrl: process.env.MPESA_C2B_CONFIRMATION_URL,
    baseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
  },
  
  // Security configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default-dev-secret-do-not-use-in-production',
    tokenExpiry: process.env.TOKEN_EXPIRY || '1h',
    saltRounds: parseInt(process.env.SALT_ROUNDS || '10', 10),
    skipWebhookVerification: process.env.SKIP_WEBHOOK_VERIFICATION === 'true'
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
};

// Validate required configuration
const validateConfig = () => {
  const requiredMpesaConfig = [
    'consumerKey',
    'consumerSecret',
    'passkey',
    'shortCode',
    'initiatorName',
  ];
  
  const missingConfig = requiredMpesaConfig.filter(key => !config.mpesa[key]);
  
  if (missingConfig.length > 0) {
    console.error('Missing required M-Pesa configuration:', missingConfig.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required M-Pesa configuration: ${missingConfig.join(', ')}`);
    }
  }
};

// Only validate in production to allow development without all configs
if (process.env.NODE_ENV === 'production') {
  validateConfig();
} else {
  // In development, just log warnings
  validateConfig();
}

export default config;