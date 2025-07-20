const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop().toLowerCase();
    cb(null, `${file.fieldname}-${uuidv4()}.${ext}`);
  }
});

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, PNG, and WEBP images are allowed."), false);
};

const upload = multer({  
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter
});

module.exports = {
  single: (fieldname) => upload.single(fieldname),
  array: (fieldname, maxCount) => upload.array(fieldname, maxCount),
  fields: (fieldsArray) => upload.fields(fieldsArray)
};
