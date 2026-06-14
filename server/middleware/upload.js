const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const ensureDir = (folder) => {
  const dir = path.join(__dirname, `../uploads/${folder}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const storage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, ensureDir(folder)),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const imageFilter = (req, file, cb) => {
  cb(null, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype));
};

const chatFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    return cb(null, true);
  }
  cb(new Error('Only images and videos are allowed'));
};

const uploadProfile = multer({ storage: storage('profiles'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadPost = multer({ storage: storage('posts'), fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadChat = multer({ storage: storage('chat'), fileFilter: chatFilter, limits: { fileSize: 200 * 1024 * 1024 } });

module.exports = { uploadProfile, uploadPost, uploadChat };
