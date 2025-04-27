/**
 * Generates a timestamp in the format required by M-Pesa API (YYYYMMDDHHmmss)
 * 
 * @returns {string} - Formatted timestamp
 */
export const generateTimestamp = () => {
    const date = new Date();
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  };
  
  /**
   * Formats a phone number to the required format (2547XXXXXXXX)
   * Removes leading 0 and adds country code if necessary
   * 
   * @param {string} phoneNumber - The phone number to format
   * @param {string} countryCode - The country code (default: '254' for Kenya)
   * @returns {string} - Formatted phone number
   */
  export const formatPhoneNumber = (phoneNumber, countryCode = '254') => {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Remove leading zero if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Remove country code if already present
    if (cleaned.startsWith(countryCode)) {
      cleaned = cleaned.substring(countryCode.length);
    }
    
    // Add country code
    return `${countryCode}${cleaned}`;
  };
  
  /**
   * Generates a unique transaction reference
   * 
   * @param {string} prefix - Optional prefix for the reference
   * @returns {string} - Unique reference ID
   */
  export const generateTransactionReference = (prefix = 'TRX') => {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  };
  
  /**
   * Validates that all required fields are present in an object
   * 
   * @param {Object} obj - The object to validate
   * @param {Array<string>} requiredFields - Array of required field names
   * @returns {Array<string>} - Array of missing field names (empty if all present)
   */
  export const validateRequiredFields = (obj, requiredFields) => {
    return requiredFields.filter(field => {
      return obj[field] === undefined || obj[field] === null || obj[field] === '';
    });
  };
  
  /**
   * Safely parses JSON with error handling
   * 
   * @param {string} jsonString - The JSON string to parse
   * @param {*} defaultValue - Default value to return if parsing fails
   * @returns {*} - Parsed object or default value
   */
  export const safeJsonParse = (jsonString, defaultValue = {}) => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return defaultValue;
    }
  };