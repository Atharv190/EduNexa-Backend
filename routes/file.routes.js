import express from "express";
import multer from "multer";
import {
  uploadFile,
  getAllFiles,
  getFileById,
  getMyFiles,
  deleteFile
} from "../controller/file.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/",
  protectRoute,
  upload.single("file"),
  uploadFile
);


router.get(
  "/my",
  protectRoute,
  getMyFiles
);


router.get("/", getAllFiles);
router.get("/:id", getFileById);

router.delete(
  "/:id",
  protectRoute,
  deleteFile
);


export default router;
