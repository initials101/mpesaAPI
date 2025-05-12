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

async function forceFixTransaction(checkoutRequestID) {
  try {
    console.log(`Connecting to MongoDB at ${process.env.MONGODB_URI}...`)
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to MongoDB")

    // Find the transaction
    const transaction = await Transaction.findOne({ checkoutRequestID })

    if (!transaction) {
      console.log(`No transaction found with checkoutRequestID: ${checkoutRequestID}`)
      return
    }

    console.log("Found transaction:", {
      id: transaction._id,
      status: transaction.status,
      resultCode: transaction.resultCode,
      resultDesc: transaction.resultDesc,
    })

    // Force update to success if result code is 0
    if (transaction.resultCode === "0") {
      console.log("Transaction has result code 0, updating to success...")

      // Direct update using updateOne
      const result = await Transaction.updateOne(
        { checkoutRequestID },
        {
          $set: {
            status: "success",
            failureReason: null,
            updatedAt: Math.floor(Date.now() / 1000),
          },
        },
      )

      console.log("Update result:", result)

      // Verify the update
      const updatedTransaction = await Transaction.findOne({ checkoutRequestID })
      console.log("Updated transaction:", {
        id: updatedTransaction._id,
        status: updatedTransaction.status,
        resultCode: updatedTransaction.resultCode,
        resultDesc: updatedTransaction.resultDesc,
      })
    } else {
      console.log(`Transaction does not have result code 0 (actual: ${transaction.resultCode}), not updating.`)
    }

    await mongoose.connection.close()
    console.log("MongoDB connection closed")
  } catch (error) {
    console.error("Error:", error)
  }
}

// Get the checkout request ID from command line arguments
const checkoutRequestID = process.argv[2]

if (!checkoutRequestID) {
  console.error("Please provide a checkout request ID as a command line argument")
  process.exit(1)
}

forceFixTransaction(checkoutRequestID)
