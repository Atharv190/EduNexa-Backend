import File from "../model/file.model.js";
import dotenv from "dotenv";
import fetch from "node-fetch"; 
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const fetchPdfBytes = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to download PDF");

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("PDF fetch error:", err);
    throw new Error("Failed to fetch PDF from URL");
  }
};

const retryGemini = async (fn, retries = 3, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.message.includes("503") && i < retries - 1) {
        console.log(`Gemini overloaded, retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
};


export const generateSummary = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    if (file.summary && file.summary.overview) {
      return res.status(200).json({
        success: true,
        summary: file.summary,
        cached: true,
      });
    }
  
    const pdfBytes = await fetchPdfBytes(file.fileUrl);

    const prompt = `
You are an expert academic teacher.

Analyze the given study material and generate a HIGH-QUALITY structured summary.

STRICT RULES:
- Output ONLY valid JSON
- No markdown, no explanations, no extra text
- Ensure JSON is clean and parseable
- Use simple, student-friendly language

JSON FORMAT:
{
  "title": "Accurate topic/title",
  "overview": "Detailed explanation (4-6 lines)",
  "keyPoints": [
    "Important concept explained clearly",
    "Another key idea",
    "Mechanism or definition",
    "Critical takeaway"
  ],
  "importantTerms": [
    "Term - short meaning"
  ],
  "subtopics": [
    {
      "name": "Subtopic name",
      "description": "Short explanation"
    }
  ],
  "possibleQuestions": [
    "Exam-style question 1",
    "Exam-style question 2"
  ],
  "conclusion": "Final understanding of topic"
}

IMPORTANT INSTRUCTIONS:
- Generate ONLY 10 to 15 importantTerms (not more, not less)
- Each term must have a clear short meaning
- Do NOT repeat terms
- keyPoints should be meaningful (not generic)
- Include real concepts from content
- Subtopics should reflect actual sections of the document
- Questions should be useful for exams/interviews

CONTENT:
`;

    const response = await retryGemini(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBytes.toString("base64"),
            },
          },
        ],
      })
    );

    const rawText = response.text.trim();

    let structuredSummary;
    try {
      structuredSummary = JSON.parse(rawText);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "AI returned invalid JSON",
        rawText,
      });
    }

    file.summary = structuredSummary;
    await file.save();

    res.status(200).json({
      success: true,
      message: "Summary generated successfully",
      summary: structuredSummary,
      cached: false,
    });
  } catch (err) {
    console.error("Summary generation error:", err);
    res.status(500).json({
      success: false,
      message: "Error generating summary",
      error: err.message,
    });
  }
};

export const generateQuiz = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    if (file.quiz && file.quiz.length === 10) {
      return res.status(200).json({
        success: true,
        quiz: file.quiz,
        cached: true,
      });
    }

    const pdfBytes = await fetchPdfBytes(file.fileUrl);

    const response = await retryGemini(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            text: `
Create EXACTLY 10 multiple-choice questions (MCQs) from this document.

RULES (VERY IMPORTANT):
- Return ONLY valid JSON
- Do NOT add explanations
- Do NOT add markdown
- Each question must have 4 options
- Options must NOT repeat question text
- Answers must be ONLY: "A", "B", "C", or "D"

JSON FORMAT:
{
  "quiz": [
    {
      "question": "Question text",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "answer": "A"
    }
  ]
}
            `,
          },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBytes.toString("base64"),
            },
          },
        ],
      })
    );

    const quizText = response.text.trim();

    let quizData = [];

    try {
      const jsonMatch = quizText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[0]).quiz || [];
      }
    } catch (err) {
      console.error(" Quiz parse error:", err);
    }

    quizData = quizData.slice(0, 10);

    file.quiz = quizData;
    await file.save();

    res.status(200).json({
      success: true,
      quiz: quizData,
      cached: false,
    });
  } catch (err) {
    console.error("Quiz generation error:", err);

    if (err.status === 429 || err.message?.includes("Quota")) {
      return res.status(200).json({
        success: false,
        quiz: [],
        message: "AI quota exceeded",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error generating quiz",
    });
  }
};
