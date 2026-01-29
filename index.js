import dotenv from "dotenv";
dotenv.config(); // MUST be first

import express from "express";
import cors from "cors";

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import fileRoutes from "./routes/file.routes.js";
import aiRoutes from "./routes/ai.routes.js";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://edunexa-tech.vercel.app"   
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());


connectDB();

app.get("/", (req, res) => {
  res.send("EduNexa API is Running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
