import multer from "multer";


const storage = multer.memoryStorage();


const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",                      
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
    "application/vnd.ms-powerpoint",         
    "application/vnd.openxmlformats-officedocument.presentationml.presentation" 
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOCX, PPT, and PPTX files are allowed"), false);
  }
};


export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } 
});
