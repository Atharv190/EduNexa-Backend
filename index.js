import dotenv from "dotenv";
dotenv.config(); // MUST be first

import express from "express";
import cors from "cors";

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import fileRoutes from "./routes/file.routes.js";
import aiRoutes from "./routes/ai.routes.js";

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      // add vercel URL later
    ],
    credentials: true,
  })
);

app.use(express.json());

/* -------------------- DB -------------------- */
connectDB();

/* -------------------- ROUTES -------------------- */
app.get("/", (req, res) => {
  res.send("EduNexa API is Running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/ai", aiRoutes);

/* -------------------- SERVER -------------------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
