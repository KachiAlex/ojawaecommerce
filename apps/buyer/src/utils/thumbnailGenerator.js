/**
 * Generate thumbnail from image URL using Canvas API
 * Returns a Blob that can be uploaded to Firebase Storage
 */
export const generateThumbnail = async (imageUrl, width = 300, height = 300, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate dimensions to maintain aspect ratio
        let targetWidth = width;
        let targetHeight = height;
        
        const imgAspect = img.width / img.height;
        const targetAspect = width / height;
        
        if (imgAspect > targetAspect) {
          // Image is wider - fit to width
          targetHeight = width / imgAspect;
        } else {
          // Image is taller - fit to height
          targetWidth = height * imgAspect;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Fill with white background (for transparent images)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Draw image centered
        const x = (width - targetWidth) / 2;
        const y = (height - targetHeight) / 2;
        ctx.drawImage(img, x, y, targetWidth, targetHeight);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for thumbnail generation'));
    };
    
    img.src = imageUrl;
  });
};

/**
 * Generate thumbnail from File/Blob
 */
export const generateThumbnailFromFile = async (file, width = 300, height = 300, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const blob = await generateThumbnail(e.target.result, width, height, quality);
        resolve(blob);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Generate multiple thumbnail sizes
 */
export const generateThumbnails = async (imageUrl, sizes = [
  { width: 150, height: 150, suffix: '_thumb' },
  { width: 300, height: 300, suffix: '_medium' },
  { width: 600, height: 600, suffix: '_large' }
]) => {
  const thumbnails = {};
  
  for (const size of sizes) {
    try {
      const blob = await generateThumbnail(imageUrl, size.width, size.height);
      thumbnails[size.suffix] = blob;
    } catch (error) {
      console.error(`Failed to generate thumbnail ${size.suffix}:`, error);
    }
  }
  
  return thumbnails;
};

