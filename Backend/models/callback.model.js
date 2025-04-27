import mongoose from 'mongoose';

const callbackSchema = new mongoose.Schema({
  callbackType: {
    type: String,
    required: true,
    enum: ['STK', 'B2C_RESULT', 'B2C_TIMEOUT', 'C2B_VALIDATION', 'C2B_CONFIRMATION']
  },
  requestId: {
    type: String
  },
  transactionId: {
    type: String
  },
  resultCode: {
    type: String
  },
  resultDesc: {
    type: String
  },
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  processed: {
    type: Boolean,
    default: false
  },
  processingErrors: [{
    message: String,
    timestamp: Date
  }]
}, {
  timestamps: true
});

// Indexes for faster queries
callbackSchema.index({ callbackType: 1 });
callbackSchema.index({ requestId: 1 }, { sparse: true });
callbackSchema.index({ transactionId: 1 }, { sparse: true });
callbackSchema.index({ processed: 1 });

const Callback = mongoose.model('Callback', callbackSchema);

export default Callback;