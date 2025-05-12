import mongoose from "mongoose"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") })

async function verifyDbConnection() {
  try {
    console.log(`Connecting to MongoDB at ${process.env.MONGODB_URI}...`)

    // Connect with explicit options
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    })

    console.log("Connected to MongoDB successfully")

    // Test write operation
    const TestModel = mongoose.model(
      "TestConnection",
      new mongoose.Schema({
        test: String,
        timestamp: { type: Date, default: Date.now },
      }),
    )

    console.log("Testing write operation...")
    const testDoc = new TestModel({ test: "connection_test" })
    await testDoc.save()
    console.log(`Write operation successful. Document ID: ${testDoc._id}`)

    // Test read operation
    console.log("Testing read operation...")
    const readDoc = await TestModel.findById(testDoc._id)
    console.log(`Read operation successful: ${readDoc.test}`)

    // Clean up test document
    console.log("Cleaning up test document...")
    await TestModel.deleteOne({ _id: testDoc._id })
    console.log("Cleanup successful")

    // Check connection stats
    const stats = mongoose.connection.db.admin().serverStatus()
    console.log("\nMongoDB Connection Stats:")
    console.log(`- Connection ID: ${mongoose.connection.id}`)
    console.log(`- Host: ${mongoose.connection.host}`)
    console.log(`- Port: ${mongoose.connection.port}`)
    console.log(`- Database Name: ${mongoose.connection.name}`)

    // Close connection
    await mongoose.connection.close()
    console.log("\nMongoDB connection closed")

    return true
  } catch (error) {
    console.error("Database connection error:", error)

    if (error.name === "MongoServerSelectionError") {
      console.error("\nCannot connect to MongoDB server. Please check:")
      console.error("1. MongoDB server is running")
      console.error("2. Connection string is correct")
      console.error("3. Network allows connection to MongoDB port")
      console.error("4. MongoDB user has correct permissions")
    }

    return false
  }
}

verifyDbConnection().then((success) => {
  if (success) {
    console.log("\n✅ Database connection is working properly")
  } else {
    console.log("\n❌ Database connection has issues")
  }
  process.exit(success ? 0 : 1)
})
