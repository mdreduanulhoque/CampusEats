const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'canteen-images';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials missing in .env! Image upload functionality will require SUPABASE_URL and SUPABASE_KEY.');
}

const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

/**
 * Uploads a file buffer to Supabase Storage bucket and returns the public URL.
 * @param {Buffer} fileBuffer - The file content buffer from multer.
 * @param {string} originalName - Original filename.
 * @param {string} mimeType - File MIME type (e.g. image/jpeg).
 * @returns {Promise<string>} Public URL of the uploaded image.
 */
async function uploadImageToSupabase(fileBuffer, originalName, mimeType) {
  if (!supabase) {
    throw new Error('Supabase client is not configured. Please check your .env file.');
  }

  // Generate unique filename to avoid collision
  const fileExt = (originalName.split('.').pop() || 'jpg').toLowerCase();
  const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || 'image';
  const cleanFileName = baseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filePath = `items/${Date.now()}_${cleanFileName}.${fileExt}`;

  // Upload file buffer to Supabase Bucket
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    console.error('Supabase Storage Upload Error:', error);
    throw new Error(`Supabase Storage Upload Error: ${error.message}`);
  }

  // Get Public URL
  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  if (!urlData || !urlData.publicUrl) {
    throw new Error('Failed to retrieve public URL from Supabase Storage.');
  }

  return urlData.publicUrl;
}

module.exports = {
  supabase,
  bucketName,
  uploadImageToSupabase
};
