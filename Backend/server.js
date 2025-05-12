import app from './app.js';
import config from './config/index.js';
import logger from './utils/mpesa.logger.js';
import { connectDB } from './models/mpesa.db.js';

const PORT = config.server.port || 5000;

// Connect to MongoDB
connectDB().then(() => {
  // Start the server after successful database connection
  app.listen(PORT, () => {
    logger.info(`Server running in ${config.env} mode on port ${PORT}`);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});