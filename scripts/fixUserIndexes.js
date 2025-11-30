// Migration script to fix User model indexes
// Run this once: node Backend/scripts/fixUserIndexes.js

import mongoose from 'mongoose';
import { loadEnv } from '../config/loadenv.js';
import { User } from '../models/User.js';

loadEnv();

const fixIndexes = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      throw new Error("❌ MONGODB_URI is not defined in environment variables.");
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection('Users');

    console.log("\n📋 Current indexes:");
    const currentIndexes = await collection.indexes();
    currentIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, idx.key);
    });

    // Drop the old unique index on email alone if it exists
    try {
      console.log("\n🗑️  Dropping old 'email_1' index...");
      await collection.dropIndex('email_1');
      console.log("✅ Dropped old 'email_1' index");
    } catch (err) {
      if (err.code === 27 || err.codeName === 'IndexNotFound') {
        console.log("ℹ️  Old 'email_1' index doesn't exist (already removed)");
      } else {
        throw err;
      }
    }

    // Create the new compound unique index on email + role
    try {
      console.log("\n📝 Creating compound unique index on { email: 1, role: 1 }...");
      await collection.createIndex(
        { email: 1, role: 1 },
        { unique: true, name: 'email_1_role_1' }
      );
      console.log("✅ Created compound unique index on { email: 1, role: 1 }");
    } catch (err) {
      if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
        console.log("ℹ️  Compound index already exists");
      } else {
        throw err;
      }
    }

    console.log("\n📋 Final indexes:");
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, idx.key, idx.unique ? '(unique)' : '');
    });

    console.log("\n✅ Migration completed successfully!");
    console.log("✨ You can now register the same email with different roles (user, owner, manager)");

    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during migration:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

fixIndexes();

