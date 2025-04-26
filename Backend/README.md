# M-PESA Daraja API Integration

A Node.js backend for integrating with Safaricom's M-PESA Daraja API using ES modules.

## Features

- Environment configuration for Daraja API credentials
- Authentication with Daraja API (OAuth token generation)
- STK Push (Lipa Na M-Pesa Online) implementation
- Transaction status checking
- C2B (Customer to Business) registration and simulation
- B2C (Business to Customer) payment implementation
- Transaction result handling with webhooks

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm or yarn
- M-PESA Daraja API credentials (Consumer Key and Secret)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file and update with your credentials:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with your Daraja API credentials

### Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Authentication
- `GET /api/mpesa/token` - Get OAuth access token

### STK Push
- `POST /api/mpesa/stk-push` - Initiate STK push
- `POST /api/mpesa/stk-query` - Check STK push status

### C2B
- `POST /api/mpesa/register-c2b` - Register C2B URLs
- `POST /api/mpesa/c2b-simulate` - Simulate C2B transaction (sandbox only)

### B2C
- `POST /api/mpesa/b2c-payment` - Send B2C payment

### Callback URLs
- `POST /api/mpesa/stk-callback` - STK push callback
- `POST /api/mpesa/c2b-validation` - C2B validation
- `POST /api/mpesa/c2b-confirmation` - C2B confirmation
- `POST /api/mpesa/b2c-result` - B2C result
- `POST /api/mpesa/b2c-timeout` - B2C timeout

## Environment Variables

| Variable | Description |
|----------|-------------|
| MPESA_ENV | Environment (sandbox or production) |
| CONSUMER_KEY | Daraja API Consumer Key |
| CONSUMER_SECRET | Daraja API Consumer Secret |
| MPESA_SHORTCODE | M-PESA Shortcode |
| MPESA_PASSKEY | M-PESA Passkey |
| INITIATOR_NAME | B2C Initiator Name |
| SECURITY_CREDENTIAL | B2C Security Credential |
| CALLBACK_URL | STK Push Callback URL |
| CONFIRMATION_URL | C2B Confirmation URL |
| VALIDATION_URL | C2B Validation URL |
| B2C_RESULT_URL | B2C Result URL |
| B2C_TIMEOUT_URL | B2C Timeout URL |
| PORT | Server Port |

## Testing with Postman

You can use the included Postman collection to test the API endpoints.

## License

This project is licensed under the MIT License.