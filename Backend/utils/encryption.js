import crypto from 'crypto';
import config from '../config/index.js';

/**
 * Encrypts sensitive data using AES-256-CBC
 * 
 * @param {string} text - The text to encrypt
 * @param {string} key - The encryption key (defaults to encryption key from config)
 * @returns {string} - The encrypted text
 */
export const encrypt = (text, key = config.security.jwtSecret) => {
  if (!key) throw new Error('Encryption key is required');
  
  // Create a 32 byte key from the provided key
  const derivedKey = crypto.createHash('sha256').update(String(key)).digest('base64').substring(0, 32);
  
  // Generate a random initialization vector
  const iv = crypto.randomBytes(16);
  
  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-cbc', derivedKey, iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV + encrypted data
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypts data that was encrypted with the encrypt function
 * 
 * @param {string} encryptedText - The text to decrypt (IV:encryptedData)
 * @param {string} key - The encryption key (defaults to encryption key from config)
 * @returns {string} - The decrypted text
 */
export const decrypt = (encryptedText, key = config.security.jwtSecret) => {
  if (!key) throw new Error('Encryption key is required');
  if (!encryptedText) return '';
  
  // Create a 32 byte key from the provided key
  const derivedKey = crypto.createHash('sha256').update(String(key)).digest('base64').substring(0, 32);
  
  // Split IV and encrypted data
  const [ivHex, encrypted] = encryptedText.split(':');
  
  if (!ivHex || !encrypted) {
    throw new Error('Invalid encrypted text format');
  }
  
  // Convert IV from hex to Buffer
  const iv = Buffer.from(ivHex, 'hex');
  
  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-cbc', derivedKey, iv);
  
  // Decrypt the data
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Generates a base64 encoded string for basic auth
 * 
 * @param {string} username - The username
 * @param {string} password - The password
 * @returns {string} - Base64 encoded auth string
 */
export const generateBasicAuthString = (username, password) => {
  return Buffer.from(`${username}:${password}`).toString('base64');
};

/**
 * Generates a password for M-Pesa STK Push
 * 
 * @param {string} shortCode - The business short code
 * @param {string} passkey - The passkey provided by M-Pesa
 * @param {string} timestamp - The timestamp in YYYYMMDDHHmmss format
 * @returns {string} - Base64 encoded password
 */
export const generateStkPushPassword = (shortCode, passkey, timestamp) => {
  const password = `${shortCode}${passkey}${timestamp}`;
  return Buffer.from(password).toString('base64');
};

/**
 * Verifies the signature of a webhook payload
 * 
 * @param {string} payload - The raw payload as a string
 * @param {string} signature - The signature from the headers
 * @param {string} secret - The secret key used to sign the payload
 * @returns {boolean} - Whether the signature is valid
 */
export const verifySignature = (payload, signature, secret) => {
  // Skip verification in development if configured
  if (config.security.skipWebhookVerification && config.env === 'development') {
    return true;
  }
  
  const hmac = crypto.createHmac('sha256', secret);
  const calculatedSignature = hmac.update(payload).digest('hex');
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch (error) {
    return false;
  }
};