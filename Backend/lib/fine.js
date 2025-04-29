/**
 * Mock implementation of the Fine client for testing purposes
 * This is a placeholder that simulates database operations
 */

// In-memory storage for transactions
const transactions = new Map();
let idCounter = 1;

// Mock Fine client
export const fine = {
  table: (tableName) => {
    if (tableName !== "transactions") {
      throw new Error(`Table ${tableName} not supported in mock implementation`);
    }
    
    return {
      select: (columns) => ({
        eq: (column, value) => {
          // Filter transactions by column value
          const filtered = Array.from(transactions.values()).filter(t => 
            t[column] !== undefined && t[column] === value
          );
          return Promise.resolve(filtered);
        },
        lt: (column, value) => {
          // Filter transactions where column < value
          const filtered = Array.from(transactions.values()).filter(t => 
            t[column] !== undefined && t[column] < value
          );
          return Promise.resolve(filtered);
        },
        limit: (limit) => ({
          offset: (offset) => {
            // Apply pagination
            const allTransactions = Array.from(transactions.values());
            const paginated = allTransactions.slice(offset, offset + limit);
            return Promise.resolve(paginated);
          }
        })
      }),
      insert: (data) => {
        // Insert new transaction
        const id = idCounter++;
        const now = Math.floor(Date.now() / 1000);
        const transaction = {
          id,
          ...data,
          createdAt: now,
          updatedAt: now
        };
        transactions.set(id, transaction);
        return Promise.resolve([transaction]);
      },
      update: (data) => ({
        eq: (column, value) => {
          // Update transaction where column = value
          const now = Math.floor(Date.now() / 1000);
          const updated = [];
          
          for (const [id, transaction] of transactions.entries()) {
            if (transaction[column] === value) {
              const updatedTransaction = {
                ...transaction,
                ...data,
                updatedAt: now
              };
              transactions.set(id, updatedTransaction);
              updated.push(updatedTransaction);
            }
          }
          
          return Promise.resolve(updated);
        }
      })
    };
  }
};

// Export the mock client
export default fine;