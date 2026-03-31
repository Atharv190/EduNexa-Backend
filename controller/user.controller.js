import User from "../model/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

dotenv.config();

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
  });
};

const otpStore = new Map();

export const sendSignupOTP = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "Email already exists. Please login.",
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      verified: false,
    });

    await sendEmail({
  to: email,
  subject: `🔐 Verify Your Email - EduNexa`,
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
      
      <div style="max-width: 500px; margin: auto; background: white; padding: 25px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">
        
        <h2 style="color: #4f46e5; text-align: center;">EduNexa Email Verification</h2>
        
        <p style="font-size: 15px; color: #333;">
          Hello <b>${name}</b> 👋,
        </p>

        <p style="font-size: 14px; color: #555;">
          Welcome to <b>EduNexa</b>! To complete your signup, please use the OTP below:
        </p>

        <div style="text-align: center; margin: 20px 0;">
          <span style="
            display: inline-block;
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 6px;
            color: #111;
            background: #eef2ff;
            padding: 12px 20px;
            border-radius: 8px;
          ">
            ${otp}
          </span>
        </div>

        <p style="font-size: 13px; color: #777; text-align: center;">
          ⏳ This OTP is valid for 5 minutes only.
        </p>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />

        <p style="font-size: 12px; color: #999;">
          If you didn’t request this, you can safely ignore this email.
        </p>

        <p style="font-size: 12px; color: #999;">
          — Team EduNexa 🚀
        </p>

      </div>
    </div>
  `,
});

    return res.status(200).json({
      success: true,
      message: "OTP sent to email",
    });

  } catch (err) {
    console.error("❌ Send OTP Error:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to send OTP",
    });
  }
};


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

export const signup = async (req, res) => {
  try {
    const { username, name, email, password, role } = req.body;

const allowedRoles = ["student", "teacher"];

if (!allowedRoles.includes(role)) {
  return res.status(400).json({
    message: "Invalid role",
  });
}
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
  isApproved: role === "teacher" ? false : true, 
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

    
    if (user.role === "teacher" && !user.isApproved) {
      return res.status(403).json({
        message: "Your account is pending admin approval",
      });
    }

    
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

export const deleteAccountWithPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password",
      });
    }

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

export default generateToken;

