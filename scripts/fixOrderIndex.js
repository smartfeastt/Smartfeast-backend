/**
 * Script to fix MongoDB duplicate key error for orderId index
 * Run this once to drop the old orderId index if it exists
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function fixOrderIndex() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('Orders');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    // Drop orderId index if it exists
    try {
      await collection.dropIndex('orderId_1');
      console.log('✅ Dropped orderId_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️ orderId_1 index does not exist, skipping...');
      } else {
        throw error;
      }
    }

    // Ensure orderNumber index exists
    try {
      await collection.createIndex({ orderNumber: 1 }, { unique: true, sparse: true });
      console.log('✅ Created orderNumber unique index');
    } catch (error) {
      console.log('ℹ️ orderNumber index may already exist');
    }

    console.log('✅ Index fix completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing index:', error);
    process.exit(1);
  }
}

fixOrderIndex();

