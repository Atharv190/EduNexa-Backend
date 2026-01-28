import express from "express";
import { generateSummary, generateQuiz } from "../controller/ai.controller.js";


const router = express.Router();
router.get("/:fileId/summary", generateSummary);
router.get("/:fileId/quiz", generateQuiz);

export default router;
