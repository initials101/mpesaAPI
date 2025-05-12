import mongoose from "mongoose"

const transactionSchema = new mongoose.Schema(
  {
    transactionType: {
      type: String,
      required: true,
      enum: ["STK_PUSH", "B2C", "C2B"],
    },
    amount: {
      type: Number,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    referenceId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "success", "failed", "cancelled"],
      default: "pending",
    },
    checkoutRequestID: String,
    merchantRequestID: String,
    conversationId: String,
    originatorConversationId: String,
    resultCode: String,
    resultDesc: String,
    mpesaReceiptNumber: String,
    transactionId: String,
    failureReason: String,
    timeoutAt: Number,
    timeoutHandled: {
      type: Boolean,
      default: false,
    },
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: {
      type: Number,
      default: () => Math.floor(Date.now() / 1000),
    },
    updatedAt: {
      type: Number,
      default: () => Math.floor(Date.now() / 1000),
    },
  },
  {
    timestamps: {
      currentTime: () => Math.floor(Date.now() / 1000),
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  },
)

// Add a pre-save hook to the transaction model to log all status changes:

// Add this before the Transaction model is created:
transactionSchema.pre("save", function (next) {
  // Check if this is a new document or an update
  if (this.isModified("status")) {
    console.log(
      `[TRANSACTION PRE-SAVE HOOK] Transaction ${this.checkoutRequestID || this._id} status changing from ${this._original?.status || "new"} to ${this.status}`,
    )
    console.log(`[TRANSACTION PRE-SAVE HOOK] Transaction details:`, {
      resultCode: this.resultCode,
      resultType: typeof this.resultCode,
      status: this.status,
    })
  }

  // Store original values for reference
  this._original = this.toObject()

  next()
})

// Add indexes for faster queries
transactionSchema.index({ checkoutRequestID: 1 })
transactionSchema.index({ phoneNumber: 1 })
transactionSchema.index({ status: 1 })
transactionSchema.index({ createdAt: -1 })

const Transaction = mongoose.model("Transaction", transactionSchema)

export default Transaction
