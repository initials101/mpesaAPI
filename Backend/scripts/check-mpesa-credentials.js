import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkMpesaCredentials() {
  console.log('Checking M-Pesa API credentials...');
  
  // Check if required environment variables are set
  const requiredVars = [
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_PASSKEY',
    'MPESA_SHORTCODE',
    'MPESA_BASE_URL'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    return;
  }
  
  console.log('✅ All required environment variables are set');
  
  // Try to get an access token
  try {
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString('base64');
    
    console.log('Attempting to get access token from M-Pesa API...');
    console.log(`Base URL: ${process.env.MPESA_BASE_URL}`);
    console.log(`Consumer Key: ${process.env.MPESA_CONSUMER_KEY.substring(0, 4)}...${process.env.MPESA_CONSUMER_KEY.slice(-4)}`);
    console.log(`Consumer Secret: ${process.env.MPESA_CONSUMER_SECRET.substring(0, 4)}...${process.env.MPESA_CONSUMER_SECRET.slice(-4)}`);
    
    const response = await axios.get(
      `${process.env.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      }
    );
    
    if (response.data.access_token) {
      console.log('✅ Successfully obtained access token from M-Pesa API');
      console.log(`Token: ${response.data.access_token.substring(0, 10)}...`);
      console.log('Your M-Pesa API credentials are working correctly!');
    } else {
      console.error('❌ M-Pesa API did not return an access token');
      console.error('Response:', response.data);
    }
  } catch (error) {
    console.error('❌ Failed to get access token from M-Pesa API');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    
    console.error('\\nPossible issues:');
    console.error('1. Incorrect consumer key or secret');
    console.error('2. Incorrect base URL');
    console.error('3. Network connectivity issues');
    console.error('4. M-Pesa API service might be down');
  }
}

checkMpesaCredentials();