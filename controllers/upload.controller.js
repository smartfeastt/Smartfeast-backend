import supabase from '../config/supabase.config.js';
import crypto from 'crypto';
import path from 'path';

// Generate UUID v4
const generateUUID = () => {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
};

/**
 * Generate presigned URL for image upload
 */
export const generatePresignedUrl = async (req, res) => {
  try {
    const { fileName, contentType, folder } = req.body;
    
    // Validate inputs
    if (!fileName || !contentType || !folder) {
      return res.status(400).json({
        success: false,
        message: 'fileName, contentType, and folder are required',
      });
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
      });
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.body.fileSize && req.body.fileSize > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB limit',
      });
    }
    
    // Sanitize filename
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 255);
    
    // Generate unique filename
    const fileExtension = path.extname(sanitizedFileName);
    const uniqueFileName = `${generateUUID()}${fileExtension}`;
    const filePath = `${folder}/${uniqueFileName}`;
    
    // Generate presigned URL (Supabase uses signed URLs)
    const { data, error } = await supabase
      .storage
      .from('smartfeast')
      .createSignedUploadUrl(filePath, 60); // 60 seconds expiry
    
    if (error) {
      console.error('Error creating presigned URL:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate upload URL',
      });
    }
    
    // Construct public URL
    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/smartfeast/${filePath}`;
    
    return res.status(200).json({
      success: true,
      signedUrl: data.signedUrl,
      fileUrl: publicUrl,
      filePath: filePath,
      fileName: uniqueFileName,
    });
  } catch (error) {
    console.error('Error in generatePresignedUrl:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while generating upload URL',
    });
  }
};

/**
 * Upload file directly (alternative endpoint if needed)
 */
export const uploadFile = async (req, res) => {
  try {
    const { folder } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type',
      });
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB',
      });
    }
    
    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${generateUUID()}${fileExtension}`;
    const filePath = `${folder}/${uniqueFileName}`;
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('smartfeast')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file',
      });
    }
    
    const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/smartfeast/${filePath}`;
    
    return res.status(200).json({
      success: true,
      fileUrl: publicUrl,
      filePath: filePath,
    });
  } catch (error) {
    console.error('Error in uploadFile:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while uploading file',
    });
  }
};

