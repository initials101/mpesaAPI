import express from "express"
import mongoose from "mongoose"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") })

// Define a simple function to check middleware stack
async function checkMiddleware() {
  try {
    console.log("Checking Express middleware and MongoDB hooks...")

    // Create a test Express app
    const app = express()

    // Get all registered middleware
    console.log("\nExpress Middleware Stack:")
    if (app._router) {
      console.log(app._router.stack.map((layer) => layer.name || "unnamed"))
    } else {
      console.log("No middleware registered yet")
    }

    // Connect to MongoDB
    console.log("\nConnecting to MongoDB...")
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("Connected to MongoDB")

    // Check for MongoDB middleware/hooks
    console.log("\nMongoose Models:")
    const modelNames = mongoose.modelNames()
    console.log(modelNames)

    for (const modelName of modelNames) {
      const model = mongoose.model(modelName)
      console.log(`\nHooks for model: ${modelName}`)

      // Check for pre hooks
      if (model.schema.pre) {
        console.log("Pre hooks:", Object.keys(model.schema.hooks.pre || {}))
      }

      // Check for post hooks
      if (model.schema.post) {
        console.log("Post hooks:", Object.keys(model.schema.hooks.post || {}))
      }
    }

    await mongoose.connection.close()
    console.log("\nMongoDB connection closed")
  } catch (error) {
    console.error("Error:", error)
  }
}

checkMiddleware()
