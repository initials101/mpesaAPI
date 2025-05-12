import mongoose from "mongoose"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") })

// Define the Transaction schema (simplified version)
const transactionSchema = new mongoose.Schema({
  transactionType: String,
  amount: Number,
  phoneNumber: String,
  referenceId: String,
  status: String,
  checkoutRequestID: String,
  merchantRequestID: String,
  resultCode: String,
  resultDesc: String,
  failureReason: String,
  timeoutHandled: Boolean,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: Number,
  updatedAt: Number,
})

const Transaction = mongoose.model("Transaction", transactionSchema)

async function checkTransactionFlow() {
  try {
    console.log(`Connecting to MongoDB at ${process.env.MONGODB_URI}...`)
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to MongoDB")

    // Get the most recent transactions
    const recentTransactions = await Transaction.find({}).sort({ createdAt: -1 }).limit(10)

    console.log(`Found ${recentTransactions.length} recent transactions`)

    // Analyze each transaction's timeline
    for (const transaction of recentTransactions) {
      console.log("\n---------------------------------------")
      console.log(`Transaction ID: ${transaction._id}`)
      console.log(`Checkout Request ID: ${transaction.checkoutRequestID}`)
      console.log(`Status: ${transaction.status}`)
      console.log(`Result Code: ${transaction.resultCode} (type: ${typeof transaction.resultCode})`)
      console.log(`Created At: ${new Date(transaction.createdAt * 1000).toISOString()}`)
      console.log(`Updated At: ${new Date(transaction.updatedAt * 1000).toISOString()}`)

      // Calculate time difference between creation and update
      const timeDiff = transaction.updatedAt - transaction.createdAt
      console.log(`Time between creation and last update: ${timeDiff} seconds`)

      // Check for potential race conditions
      if (timeDiff < 1) {
        console.log("WARNING: Very quick update after creation - potential race condition")
      }

      // Check for result code inconsistency
      if (transaction.resultCode === "0" && transaction.status === "failed") {
        console.log("ERROR: Inconsistent state - result code 0 but status failed")
      }
    }

    await mongoose.connection.close()
    console.log("\nMongoDB connection closed")
  } catch (error) {
    console.error("Error:", error)
  }
}

checkTransactionFlow()
