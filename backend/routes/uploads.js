const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const router = express.Router();

// Use memory storage for serverless compatibility (Vercel has no persistent disk)
const storage = multer.memoryStorage({
  buffer: undefined
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP, SVG, PDF'), false);
    }
  }
});

/**
 * @route   POST /api/uploads
 * @desc    Upload a file (returns base64 data URL for serverless compatibility)
 * @access  Private
 */
router.post('/', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const { originalname, mimetype, buffer, size } = req.file;

  // Convert to base64 data URL
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimetype};base64,${base64}`;

  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: dataUrl,
    location: dataUrl,
    file: {
      originalName: originalname,
      mimeType: mimetype,
      size
    }
  });
}));

/**
 * @route   POST /api/uploads/logo
 * @desc    Upload a logo image
 * @access  Private
 */
router.post('/logo', authenticateToken, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const { originalname, mimetype, buffer, size } = req.file;

  // Only allow images for logos
  if (!mimetype.startsWith('image/')) {
    return res.status(400).json({ success: false, error: 'Logo must be an image file' });
  }

  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimetype};base64,${base64}`;

  res.json({
    success: true,
    message: 'Logo uploaded successfully',
    url: dataUrl,
    downloadUrl: dataUrl,
    file: {
      originalName: originalname,
      mimeType: mimetype,
      size
    }
  });
}));

module.exports = router;
