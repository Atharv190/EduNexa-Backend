import User from "../model/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

dotenv.config();

/* ================= JWT ================= */
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
  });
};

/* ================= OTP STORE (TEMP MEMORY) ================= */
// email => { otp, expiresAt, verified }
const otpStore = new Map();

/* ================= SEND OTP ================= */
export const sendSignupOTP = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // ✅ CHECK IF USER ALREADY EXISTS
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "Email already exists. Please login.",
      });
    }

    // ✅ GENERATE OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      verified: false,
    });

    // ✅ SEND EMAIL
    await sendEmail({
  to: email,
  subject: `🔐 Verify Your Email, ${name}!`,
  text: `🔐 EduNexa – Secure Email Verification

Hello ${name} 👋✨

To complete your signup on EduNexa, please use the One-Time Password (OTP) below.  
This helps us keep your account safe and secure 🔒

━━━━━━━━━━━━━━━━━━━━━━
🔢  VERIFICATION CODE
👉  ${otp}
━━━━━━━━━━━━━━━━━━━━━━

⏳ Valid for: 5 minutes only

If you didn’t request this verification, you can safely ignore this message.  
No changes will be made to your account.

Happy Learning 🚀📚  
— Team EduNexa || Smart Learning Platform 💙`,
});





    return res.status(200).json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (err) {
    console.error("Send OTP Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};


/* ================= VERIFY OTP ================= */
export const verifySignupOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = otpStore.get(email);

    if (!record)
      return res.status(400).json({ message: "OTP not found" });

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    record.verified = true;

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ================= SIGNUP ================= */
export const signup = async (req, res) => {
  try {
    const { username, name, email, password, role } = req.body;
    const finalUsername = username || name;

    if (!finalUsername || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const otpData = otpStore.get(email);
    if (!otpData || otpData.verified !== true) {
      return res.status(403).json({
        message: "Please verify email with OTP first",
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(409).json({ message: "User already exists" });

    const newUser = await User.create({
      username: finalUsername,
      email,
      password,
      role,
    });

    otpStore.delete(email);

    const token = generateToken(newUser._id, newUser.role);

    res.status(201).json({
      success: true,
      message: "Signup successful",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ================= LOGIN (UNCHANGED) ================= */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email & password required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/* ================= GET USER ================= */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === "student" && req.user._id.toString() !== id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(id).select("-password");
    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= DELETE ACCOUNT WITH PASSWORD ================= */
export const deleteAccountWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user with password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

    // Delete account
    await User.findOneAndDelete({ email });

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    console.error("Delete Account Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
};


