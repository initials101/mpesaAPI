import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  transactionType: {
    type: String,
    required: true,
    enum: ['STK_PUSH', 'B2C', 'C2B']
  },
  amount: {
    type: Number,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  accountReference: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  merchantRequestID: {
    type: String
  },
  checkoutRequestID: {
    type: String
  },
  conversationID: {
    type: String
  },
  originatorConversationID: {
    type: String
  },
  resultCode: {
    type: String
  },
  resultDesc: {
    type: String
  },
  transactionID: {
    type: String
  },
  mpesaReceiptNumber: {
    type: String
  },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'],
    default: 'PENDING'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for faster queries
transactionSchema.index({ accountReference: 1 });
transactionSchema.index({ phoneNumber: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ transactionID: 1 }, { sparse: true });
transactionSchema.index({ mpesaReceiptNumber: 1 }, { sparse: true });
transactionSchema.index({ checkoutRequestID: 1 }, { sparse: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;