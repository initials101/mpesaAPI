import mongoose from "mongoose"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") })

async function checkWriteConcerns() {
  try {
    console.log(`Connecting to MongoDB at ${process.env.MONGODB_URI}...`)

    // Connect with explicit write concern
    await mongoose.connect(process.env.MONGODB_URI, {
      w: "majority", // Write to majority of nodes
      wtimeout: 5000, // Wait up to 5 seconds for write confirmation
      j: true, // Wait for write to journal
    })

    console.log("Connected to MongoDB with explicit write concerns")

    // Get server info
    const adminDb = mongoose.connection.db.admin()
    const serverInfo = await adminDb.serverStatus()

    console.log("\nMongoDB Server Info:")
    console.log(`- Version: ${serverInfo.version}`)
    console.log(`- Process: ${serverInfo.process}`)

    // Check if this is a replica set
    let isReplicaSet = false
    try {
      const replSetStatus = await adminDb.replSetGetStatus()
      isReplicaSet = true

      console.log("\nReplica Set Information:")
      console.log(`- Set Name: ${replSetStatus.set}`)
      console.log(`- Members: ${replSetStatus.members.length}`)
      console.log(`- Primary: ${replSetStatus.members.find((m) => m.state === 1)?.name || "None"}`)

      // Check write concerns
      console.log("\nRecommended Write Concerns for Replica Set:")
      console.log("- w: 'majority' - Ensures writes are acknowledged by majority of nodes")
      console.log("- j: true - Ensures writes are committed to journal")
      console.log("- wtimeout: 5000 - Sets a reasonable timeout for write operations")
    } catch (error) {
      console.log("\nNot a replica set or not authorized to check replica set status")
    }

    // Test different write concerns
    const TestModel = mongoose.model(
      "WriteTest",
      new mongoose.Schema({
        test: String,
        timestamp: { type: Date, default: Date.now },
      }),
    )

    console.log("\nTesting write operations with different write concerns...")

    // Test with default write concern
    console.log("\n1. Testing with default write concern")
    const start1 = Date.now()
    const doc1 = new TestModel({ test: "default_write_concern" })
    await doc1.save()
    console.log(`✅ Write successful in ${Date.now() - start1}ms`)

    // Test with w:1
    console.log("\n2. Testing with w:1 (acknowledge from primary only)")
    const start2 = Date.now()
    const doc2 = new TestModel({ test: "w1_write_concern" })
    await doc2.save({ w: 1 })
    console.log(`✅ Write successful in ${Date.now() - start2}ms`)

    // Test with w:majority if replica set
    if (isReplicaSet) {
      console.log("\n3. Testing with w:'majority' (acknowledge from majority of nodes)")
      const start3 = Date.now()
      const doc3 = new TestModel({ test: "majority_write_concern" })
      await doc3.save({ w: "majority" })
      console.log(`✅ Write successful in ${Date.now() - start3}ms`)
    }

    // Clean up test documents
    await TestModel.deleteMany({
      test: { $in: ["default_write_concern", "w1_write_concern", "majority_write_concern"] },
    })

    // Close connection
    await mongoose.connection.close()
    console.log("\nMongoDB connection closed")

    return true
  } catch (error) {
    console.error("Error:", error)

    if (mongoose.connection) {
      await mongoose.connection.close()
    }

    return false
  }
}

checkWriteConcerns().then((success) => {
  if (success) {
    console.log("\n✅ Write concern check completed")
    console.log("\nRecommendation for your application:")
    console.log("1. Update your MongoDB connection options to include explicit write concerns")
    console.log("2. Use { w: 1 } at minimum for all critical write operations")
    console.log("3. Consider using { w: 'majority', j: true } for the most critical operations")
  } else {
    console.log("\n❌ Write concern check failed")
  }
  process.exit(success ? 0 : 1)
})
