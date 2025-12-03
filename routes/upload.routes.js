import express from 'express';
import { generatePresignedUrl, uploadFile } from '../controllers/upload.controller.js';
import { authMiddleware } from '../middleware/middleware.js';

const router = express.Router();

// Generate presigned URL for direct upload
router.post('/presign', authMiddleware, generatePresignedUrl);

// Direct upload endpoint (alternative)
router.post('/direct', authMiddleware, uploadFile);

export default router;

