import supabase from '../config/supabase.config.js';
import multer from 'multer';

// Sanitize filenames to remove unsafe characters
const sanitizeFileName = (filename) => {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-'); // replace anything unsafe with hyphen
};


const signedUrl = async (req, res) => {
    var { fileName } = req.body;
    const timestamp = Date.now();
    fileName = `${timestamp}-${sanitizeFileName(fileName)}`;
    const { data, error } = await supabase
      .storage
      .from('printease')
      .createSignedUploadUrl(fileName, 60); // valid for 60 seconds
  
    if (error) {
      console.error('Supabase storage error:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ signedUrl: data.signedUrl, path: fileName });
  };

export { signedUrl };