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
   git clone https://github.com/your-username/mpesa-api.git
   cd mpesa-api
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
   npm start
   ```

## API Endpoints

### STK Push (Lipa Na M-Pesa Online)

```
POST /api/v1/mpesa/stk-push
```

Request body:
```json
{
  "phoneNumber": "254712345678",
  "amount": 1,
  "accountReference": "ORDER123",
  "transactionDesc": "Payment for order #123"
}
```

### B2C Payment

```
POST /api/v1/mpesa/b2c
```

Request body:
```json
{
  "phoneNumber": "254712345678",
  "amount": 100,
  "commandID": "BusinessPayment",
  "remarks": "Salary payment",
  "occassion": "Monthly salary"
}
```

### Query Transaction Status

```
POST /api/v1/mpesa/transaction-status
```

Request body:
```json
{
  "transactionID": "OEI2AK4Q16",
  "identifierType": 1
}
```

## Webhook Endpoints

### STK Push Callback

```
POST /api/v1/mpesa/callbacks/stk
```

### B2C Result

```
POST /api/v1/mpesa/callbacks/b2c/result
```

### B2C Timeout

```
POST /api/v1/mpesa/callbacks/b2c/timeout
```

## Development

### Running in Development Mode

```bash
npm run dev
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Safaricom M-Pesa API Documentation](https://developer.safaricom.co.ke/)