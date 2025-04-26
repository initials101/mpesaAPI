/**
 * Format phone number to the required format for M-PESA API
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} - Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Convert to string and trim
    let phone = phoneNumber.toString().trim();
    
    // Remove any spaces, hyphens or parentheses
    phone = phone.replace(/[\s\-()]/g, '');
    
    // Handle +254 prefix
    if (phone.startsWith('+254')) {
      phone = phone.substring(4);
    }
    
    // Handle 0 prefix
    if (phone.startsWith('0')) {
      phone = phone.substring(1);
    }
    
    // Add 254 prefix if not already there
    if (!phone.startsWith('254')) {
      phone = `254${phone}`;
    }
    
    return phone;
  };
  
  /**
   * Validate Kenyan phone number
   * @param {string} phoneNumber - The phone number to validate
   * @returns {boolean} - Whether the phone number is valid
   */
  export const isValidKenyanPhone = (phoneNumber) => {
    if (!phoneNumber) return false;
    
    // Format the phone number
    const phone = formatPhoneNumber(phoneNumber);
    
    // Check if it starts with 254 and has 12 digits
    return /^254\d{9}$/.test(phone);
  };