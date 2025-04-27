import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import config from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import mpesaRoutes from './routes/mpesa.routes.js';
import logger from './utils/logger.js';

// Initialize express app
const app = express();

// Apply security middleware
app.use(helmet());
app.use(cors());

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  // Use custom morgan format that logs to Winston in production
  app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
}

// API routes
app.use('/api/v1/mpesa', mpesaRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'M-Pesa API is running',
    timestamp: new Date().toISOString()
  });
});

// Handle 404 errors
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;