import mongoose from 'mongoose';
import config from '../config/index.js';
import logger from '../utils/mpesa.logger.js';

/**
 * Connect to MongoDB
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.database.uri, {
      // MongoDB connection options
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Close MongoDB connection
 */
export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
  }
};

export default { connectDB, closeDB };