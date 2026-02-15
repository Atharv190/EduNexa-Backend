import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

import File from "../model/file.model.js";
import cloudinary from "../config/cloud.js";
import streamifier from "streamifier";
import axios from "axios";

export const uploadFile = async (req, res) => {
  try {
    const user = req.user;
    const { title, description, subject } = req.body;

    if (!user || user.role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Only teachers can upload files",
      });
    }

    if (!title || !subject || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Title, subject, and file are required",
      });
    }

    let extractedText = "";
    if (req.file.mimetype === "application/pdf") {
      try {
        const data = await pdfParse(req.file.buffer);
        extractedText = data.text;
      } catch (err) {
        console.error("PDF extraction failed:", err.message);
      }
    }

    const resourceType =
      req.file.mimetype === "application/pdf" ? "raw" : "auto";

    const bufferStream = streamifier.createReadStream(req.file.buffer);

    const result = await new Promise((resolve, reject) => {
  const uploadStream = cloudinary.uploader.upload_stream(
    {
      resource_type: resourceType,
      folder: "studygeni_files",

      public_id: req.file.originalname.replace(/\.[^/.]+$/, ""),
      use_filename: true,
      unique_filename: false,
    },
    (error, result) => {
      if (error) reject(error);
      else resolve(result);
    }
  );
  bufferStream.pipe(uploadStream);
});


    const file = await File.create({
      title,
      description,
      subject,
      fileUrl: result.secure_url,
      cloudinaryId: result.public_id,
      createdBy: user._id,
      extractedText,
    });

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      file,
    });
  } catch (err) {
    console.error("Upload file error:", err);
    res.status(500).json({
      success: false,
      message: "Server error while uploading file",
    });
  }
};

export const getMyFiles = async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== "teacher") {
      return res.status(403).json({
        success: false,
        message: "Only teachers can view their files",
      });
    }

    const files = await File.find({ createdBy: user._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      files,
    });
  } catch (error) {
    console.error("Get my files error:", error);
    res.status(500).json({ message: "Failed to fetch files" });
  }
};

export const getAllFiles = async (req, res) => {
  try {
    const files = await File.find()
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: files.length,
      files,
    });
  } catch (err) {
    console.error("Get files error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getFileById = async (req, res) => {
  try {
    const file = await File.findById(req.params.id).populate(
      "createdBy",
      "username email"
    );

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    res.status(200).json({
      success: true,
      file,
    });
  } catch (err) {
    console.error("Get file error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const user = req.user;
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    if (
      !user ||
      user.role !== "teacher" ||
      file.createdBy.toString() !== user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this file",
      });
    }

    if (file.cloudinaryId) {
      await cloudinary.uploader.destroy(file.cloudinaryId, {
        resource_type: "raw",
      });
    }

    await file.deleteOne();

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete file",
    });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await File.findById(id);
    if (!file || !file.fileUrl) {
      return res.status(404).send("File not found");
    }

    // Fetch file from Cloudinary
    const response = await axios.get(file.fileUrl, {
      responseType: "stream",
    });

    // Extract filename from URL or fallback
    const filename =
      file.title?.replace(/\s+/g, "_") + ".pdf";

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader(
      "Content-Type",
      response.headers["content-type"]
    );

    // Pipe file stream to browser
    response.data.pipe(res);
  } catch (error) {
    console.error("DOWNLOAD ERROR:", error.message);
    res.status(500).send("Download failed");
  }
};