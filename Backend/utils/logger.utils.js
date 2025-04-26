/**
 * Simple logger utility
 */
export const logger = {
    info: (message, data = null) => {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data ? data : '');
    },
    
    error: (message, error = null) => {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error ? error : '');
    },
    
    debug: (message, data = null) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data ? data : '');
      }
    },
    
    warn: (message, data = null) => {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data ? data : '');
    },
    
    transaction: (transactionId, status, data = null) => {
      console.log(`[TRANSACTION] ${new Date().toISOString()} - ID: ${transactionId}, Status: ${status}`, data ? data : '');
    }
  };