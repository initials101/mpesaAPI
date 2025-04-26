import express from 'express';
import { MpesaController } from './controllers.mpesa.js';

const router = express.Router();

// Get access token
router.get('/token', MpesaController.getToken);

// STK Push
router.post('/stk-push', MpesaController.stkPush);

// STK Push Query
router.post('/stk-query', MpesaController.stkPushQuery);

// Register C2B URL
router.post('/register-c2b', MpesaController.registerC2BUrl);

// C2B Simulation
router.post('/c2b-simulate', MpesaController.c2bSimulate);

// B2C Payment
router.post('/b2c-payment', MpesaController.b2cPayment);

// Callback URLs
router.post('/stk-callback', MpesaController.stkCallback);
router.post('/c2b-validation', MpesaController.c2bValidation);
router.post('/c2b-confirmation', MpesaController.c2bConfirmation);
router.post('/b2c-result', MpesaController.b2cResult);
router.post('/b2c-timeout', MpesaController.b2cTimeout);

export default router;