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

// Add a change stream watcher
transactionSchema.statics.watchTransactions = async function () {
  console.log("Starting transaction watch stream...")

  const changeStream = this.watch([], { fullDocument: "updateLookup" })

  changeStream.on("change", (change) => {
    const timestamp = new Date().toISOString()

    if (change.operationType === "insert") {
      console.log(`[${timestamp}] 🆕 New transaction created:`)
      console.log(`  ID: ${change.fullDocument._id}`)
      console.log(`  Checkout Request ID: ${change.fullDocument.checkoutRequestID}`)
      console.log(`  Status: ${change.fullDocument.status}`)
      console.log(`  Result Code: ${change.fullDocument.resultCode}`)
      console.log(`  Phone: ${change.fullDocument.phoneNumber}`)
      console.log(`  Amount: ${change.fullDocument.amount}`)
      console.log("-----------------------------------")
    } else if (change.operationType === "update") {
      console.log(`[${timestamp}] 🔄 Transaction updated:`)
      console.log(`  ID: ${change.documentKey._id}`)

      if (change.fullDocument) {
        console.log(`  Checkout Request ID: ${change.fullDocument.checkoutRequestID}`)
        console.log(`  New Status: ${change.fullDocument.status}`)
        console.log(`  Result Code: ${change.fullDocument.resultCode}`)

        // Show what fields were updated
        if (change.updateDescription && change.updateDescription.updatedFields) {
          console.log("  Updated fields:")
          Object.entries(change.updateDescription.updatedFields).forEach(([key, value]) => {
            console.log(`    - ${key}: ${value}`)
          })
        }
      } else {
        console.log("  Full document not available")
      }
      console.log("-----------------------------------")
    } else if (change.operationType === "delete") {
      console.log(`[${timestamp}] ❌ Transaction deleted:`)
      console.log(`  ID: ${change.documentKey._id}`)
      console.log("-----------------------------------")
    }
  })

  changeStream.on("error", (error) => {
    console.error("Error in change stream:", error)
  })

  return changeStream
}

const Transaction = mongoose.model("Transaction", transactionSchema)

async function monitorTransactions() {
  try {
    console.log(`Connecting to MongoDB at ${process.env.MONGODB_URI}...`)
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to MongoDB")

    // Start watching for changes
    const changeStream = await Transaction.watchTransactions()

    console.log("\n👀 Monitoring transactions in real-time. Press Ctrl+C to exit.\n")

    // Keep the script running
    process.stdin.resume()

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\nClosing change stream and database connection...")
      await changeStream.close()
      await mongoose.connection.close()
      console.log("Monitoring stopped")
      process.exit(0)
    })
  } catch (error) {
    console.error("Error:", error)

    if (error.name === "MongoServerSelectionError") {
      console.error("\nCannot connect to MongoDB server.")
    }

    process.exit(1)
  }
}

monitorTransactions()
