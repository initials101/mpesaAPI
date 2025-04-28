# M-Pesa Payment API

A secure, scalable, and developer-friendly Node.js API for integrating with the M-Pesa payment system.

## Features

- **M-Pesa API Authentication**: Secure OAuth token generation with automatic refresh
- **STK Push (Lipa Na M-Pesa Online)**: Initiate customer payments directly from your application
- **B2C Payments**: Send money from your business to customers, suppliers, or employees
- **Transaction Status Query**: Check the status of transactions to verify completion
- **Secure Webhook Handling**: Process M-Pesa callbacks securely with signature verification
- **Comprehensive Error Handling**: Detailed error responses and logging
- **Environment-Based Configuration**: Separate development and production settings

## Security Features

- Environment variables for sensitive configuration
- Encryption of sensitive data
- Input validation for all API endpoints
- Secure webhook signature verification
- Rate limiting to prevent abuse
- Security headers with Helmet
- CORS protection

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm or yarn
- M-Pesa API credentials (Consumer Key, Consumer Secret, etc.)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/mpesaAPI.git
   cd mpesaAPI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your M-Pesa API credentials and other configuration.

5. Start the server:
   ```bash
   npm run dev
   ```

## API Documentation

### Authentication

The API uses M-Pesa OAuth for authentication. This is handled internally by the API.

### API Endpoints

#### STK Push (Lipa Na M-Pesa Online)

Initiates an STK push request to a customer's phone.

```
POST /api/payments/stk-push
```

**Request Body:**
```json
{
  "phoneNumber": "254712345678",
  "amount": 1,
  "accountReference": "ORDER123",
  "transactionDesc": "Payment for order #123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "STK Push initiated successfully",
  "data": {
    "checkoutRequestID": "ws_CO_DMZ_123456789_123456789",
    "merchantRequestID": "123456-123456-1",
    "responseCode": "0",
    "responseDescription": "Success. Request accepted for processing"
  }
}
```

#### B2C Payment

Sends money from your business to a customer.

```
POST /api/payments/b2c
```

**Request Body:**
```json
{
  "phoneNumber": "254712345678",
  "amount": 100,
  "commandID": "BusinessPayment",
  "remarks": "Salary payment",
  "occassion": "Monthly salary"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "B2C payment initiated successfully",
  "data": {
    "conversationID": "AG_123456789_123456789",
    "originatorConversationID": "12345-67890-1",
    "responseCode": "0",
    "responseDescription": "Accept the service request successfully."
  }
}
```

#### Transaction Status Query

Checks the status of a transaction.

```
POST /api/payments/transaction-status
```

**Request Body:**
```json
{
  "transactionID": "OEI2AK4Q16",
  "identifierType": 1
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Transaction status query initiated successfully",
  "data": {
    "conversationID": "AG_123456789_123456789",
    "originatorConversationID": "12345-67890-1",
    "responseCode": "0",
    "responseDescription": "Accept the service request successfully."
  }
}
```

### Webhook Endpoints

These endpoints receive callbacks from M-Pesa after a transaction is processed.

#### STK Push Callback

```
POST /api/payments/callbacks/stk
```

#### B2C Result Callback

```
POST /api/payments/callbacks/b2c/result
```

#### B2C Timeout Callback

```
POST /api/payments/callbacks/b2c/timeout
```

## Environment Variables

The following environment variables are required:

```
# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# M-Pesa API Configuration
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=your_shortcode
MPESA_INITIATOR_NAME=your_initiator_name
MPESA_SECURITY_CREDENTIAL=your_security_credential
MPESA_BASE_URL=https://sandbox.safaricom.co.ke

# Callback URLs
CALLBACK_BASE_URL=https://your-domain.com
STK_CALLBACK_URL=/api/payments/callbacks/stk
B2C_RESULT_URL=/api/payments/callbacks/b2c/result
B2C_TIMEOUT_URL=/api/payments/callbacks/b2c/timeout

# Security Configuration
JWT_SECRET=your_jwt_secret_key
ENCRYPTION_KEY=your_encryption_key
```

## Development

### Running in Development Mode

```bash
npm run dev
```

### Checking M-Pesa Credentials

```bash
npm run check-credentials
```

## Error Handling

The API uses a standardized error response format:

```json
{
  "status": "error",
  "message": "Error message",
  "errors": [
    {
      "path": "field.name",
      "message": "Field-specific error message"
    }
  ]
}
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Safaricom M-Pesa API Documentation](https://developer.safaricom.co.ke/)

