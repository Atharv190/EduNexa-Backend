import express from "express";
import {
  signup,
  login,
  getUserById,
  sendSignupOTP,
  verifySignupOTP,
  deleteAccountWithPassword
} from "../controller/user.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signup/send-otp", sendSignupOTP);
router.post("/signup/verify-otp", verifySignupOTP);

router.post("/signup", signup);
router.post("/login", login);

router.get("/:id", protectRoute, getUserById);
router.delete("/delete-account-password", deleteAccountWithPassword);




export default router;
