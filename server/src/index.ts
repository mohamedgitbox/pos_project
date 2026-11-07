import "dotenv/config";
import app from "./app";
import "./config/db";
import mongoose from "mongoose";

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

function gracefulShutdown() {
  server.close(() => {
    mongoose.connection.close().then(() => {
      process.exit(0);
    });
  });
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
