// config/mongoConnect.js
import mongoose from 'mongoose';

import { loadEnv } from './loadenv.js';

loadEnv();

const mongoConnect = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error("❌ MONGODB_URI is not defined in environment variables.");
  }

  try {
    console.log("connecting to mongo");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    throw err;
  }
};

const checkMongoConnection = async (req, res) => {
  try {
    const readyState = mongoose.connection.readyState;
    const stateMap = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting"
    };

    if (readyState !== 1) {
      return res.status(500).json({
        status: "error",
        message: "MongoDB is not connected",
        readyState: stateMap[readyState]
      });
    }

    const db = mongoose.connection.db;
    const collection = db.collection("testdb");

    // Fetch the first (and only) document
    const document = await collection.findOne({});

    if (!document) {
      return res.status(404).json({
        status: "error",
        message: "No document found in collection"
      });
    }

    return res.status(200).json({
      status: "ok",
      message: "MongoDB connected and document fetched",
      readyState: stateMap[readyState],
      document
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "MongoDB query failed",
      error: err.message
    });
  }
};

export { mongoConnect, checkMongoConnection };
