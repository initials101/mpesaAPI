import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mpesaRoutes from './routes.mpesa.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/mpesa', mpesaRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'M-PESA Daraja API Server is running',
    version: '1.0.0',
    endpoints: {
      base: '/api/mpesa',
      token: '/api/mpesa/token',
      stkPush: '/api/mpesa/stk-push',
      stkQuery: '/api/mpesa/stk-query',
      registerC2B: '/api/mpesa/register-c2b',
      c2bSimulate: '/api/mpesa/c2b-simulate',
      b2cPayment: '/api/mpesa/b2c-payment'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;