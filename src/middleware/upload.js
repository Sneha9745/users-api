
import multer from 'multer';
import { badRequest, HttpError } from '../utils/http-error.js';

export function createImageUpload({ fieldName = 'avatar', maxBytes }) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter(_req, file, cb) {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new HttpError(415, 'Unsupported Media Type', 'Only image files are allowed'));
      }
      cb(null, true);
    },
  });

  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new HttpError(413, 'Content Too Large', `Maximum upload size is ${maxBytes} bytes`));
      }
      if (err instanceof multer.MulterError) {
        return next(badRequest(err.message));
      }
      next(err);
    });
  };
}
