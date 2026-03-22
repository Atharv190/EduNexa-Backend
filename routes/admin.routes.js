import express from "express";
import User from "../model/user.model.js";
import File from "../model/file.model.js";
import fs from "fs";
import path from "path";

const router = express.Router();
router.get("/teachers", async (req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" });
    res.json({ teachers });
  } catch (err) {
    res.status(500).json({ message: "Error fetching teachers" });
  }
});

router.get("/students", async (req, res) => {
  try {
    const students = await User.find({ role: "student" });
    res.json({ students });
  } catch (err) {
    res.status(500).json({ message: "Error fetching students" });
  }
});

router.put("/approve/:id", async (req, res) => {
  try {
    const teacher = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );

    res.json({ message: "Teacher approved", teacher });
  } catch (err) {
    res.status(500).json({ message: "Error approving teacher" });
  }
});

router.delete("/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    await File.deleteMany({ createdBy: userId });
    await User.findByIdAndDelete(userId);

    res.json({
      message: "User and their files deleted from database",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting user" });
  }
});

export default router;