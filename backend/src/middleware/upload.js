import fs from 'fs';
import path from 'path';
import multer from 'multer';

const incidentUploadsDir = path.resolve(process.cwd(), 'uploads', 'incidents');
fs.mkdirSync(incidentUploadsDir, { recursive: true });

const allowedMimePrefixes = ['image/', 'video/', 'audio/'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, incidentUploadsDir),
  filename: (_req, file, cb) => {
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeOriginal}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const mimeType = (file.mimetype || '').toLowerCase().trim();
  const isAllowed = allowedMimePrefixes.some((prefix) => mimeType.startsWith(prefix)) ||
                    /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|avi|mp3|wav|m4a|aac)$/i.test(
                      (file.originalname || '').toLowerCase()
                    );
  if (!isAllowed) {
    cb(new Error('Only image, video, and audio files are allowed.'));
    return;
  }
  cb(null, true);
};

export const uploadIncidentMedia = multer({
  storage,
  fileFilter,
  limits: {
    files: 10,
    fileSize: 50 * 1024 * 1024,
  },
});
