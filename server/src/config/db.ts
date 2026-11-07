import mongoose from "mongoose";

declare global {
  var mongooseConnection: Promise<typeof mongoose> | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pos_project";

if (!globalThis.mongooseConnection) {
  globalThis.mongooseConnection = mongoose.connect(MONGODB_URI).then((m) => {
    console.log("MongoDB connected successfully");
    return m;
  }).catch((err) => {
    console.error("MongoDB connection error:", err);
    throw err;
  });
}

export default globalThis.mongooseConnection;
