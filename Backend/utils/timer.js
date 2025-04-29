/**
 * Timer utility for handling transaction timeouts
 */

// Store active timeouts with transaction IDs as keys
const activeTimeouts = new Map();

/**
 * Set a timeout for a transaction
 * 
 * @param {string} transactionId - The transaction identifier (checkoutRequestID)
 * @param {Function} callback - Function to call when timeout occurs
 * @param {number} timeoutMs - Timeout duration in milliseconds (default: 2 minutes)
 * @returns {string} - The transaction ID
 */
export const setTransactionTimeout = (transactionId, callback, timeoutMs = 120000) => {
  // Clear any existing timeout for this transaction
  clearTransactionTimeout(transactionId);
  
  // Set new timeout
  const timeoutId = setTimeout(() => {
    callback(transactionId);
    activeTimeouts.delete(transactionId);
  }, timeoutMs);
  
  // Store timeout reference
  activeTimeouts.set(transactionId, timeoutId);
  
  return transactionId;
};

/**
 * Clear a transaction timeout
 * 
 * @param {string} transactionId - The transaction identifier
 * @returns {boolean} - Whether a timeout was cleared
 */
export const clearTransactionTimeout = (transactionId) => {
  if (activeTimeouts.has(transactionId)) {
    clearTimeout(activeTimeouts.get(transactionId));
    activeTimeouts.delete(transactionId);
    return true;
  }
  return false;
};

/**
 * Check if a transaction has an active timeout
 * 
 * @param {string} transactionId - The transaction identifier
 * @returns {boolean} - Whether the transaction has an active timeout
 */
export const hasActiveTimeout = (transactionId) => {
  return activeTimeouts.has(transactionId);
};

/**
 * Get the count of active timeouts
 * 
 * @returns {number} - Number of active timeouts
 */
export const getActiveTimeoutsCount = () => {
  return activeTimeouts.size;
};

/**
 * Clear all active timeouts
 * 
 * @returns {number} - Number of timeouts cleared
 */
export const clearAllTimeouts = () => {
  const count = activeTimeouts.size;
  
  for (const timeoutId of activeTimeouts.values()) {
    clearTimeout(timeoutId);
  }
  
  activeTimeouts.clear();
  return count;
};