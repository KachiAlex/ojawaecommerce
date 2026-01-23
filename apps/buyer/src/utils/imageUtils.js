/**
 * Get thumbnail URL from image URL
 * Prioritizes thumbnail field, then automatically uses first product image as thumbnail
 * Note: Firebase Storage paths should already be converted to download URLs in Firestore
 */
export const getThumbnailUrl = (product) => {
  // First, check if product has a dedicated thumbnail field
  if (product.thumbnail && typeof product.thumbnail === 'string' && product.thumbnail.trim() !== '') {
    const thumbnail = product.thumbnail.trim();
    // Only return if it's a valid URL (starts with http)
    if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) {
      return thumbnail;
    }
  }

  // Check thumbnail in images array (if first image is marked as thumbnail)
  if (product.thumbnails && Array.isArray(product.thumbnails) && product.thumbnails.length > 0) {
    const thumbnail = product.thumbnails[0];
    if (thumbnail && typeof thumbnail === 'string' && thumbnail.trim() !== '') {
      const trimmed = thumbnail.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
    }
  }

  // AUTOMATIC FALLBACK: If no thumbnail exists, use first product image as thumbnail
  let imageUrl = null;
  
  if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
    imageUrl = product.image.trim();
  } else if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    // Find first valid image URL
    for (const img of product.images) {
      if (img && typeof img === 'string' && img.trim() !== '') {
        const trimmed = img.trim();
        if (trimmed !== 'undefined' && trimmed !== 'null' && trimmed.startsWith('http')) {
          imageUrl = trimmed;
          break;
        }
      }
    }
  } else {
    // Check other image fields
    const imageFields = ['imageUrl', 'imageURL', 'photo', 'photoUrl', 'img', 'picture'];
    for (const field of imageFields) {
      if (product[field] && typeof product[field] === 'string' && product[field].trim() !== '') {
        const trimmed = product[field].trim();
        if (trimmed !== 'undefined' && trimmed !== 'null' && trimmed.startsWith('http')) {
          imageUrl = trimmed;
          break;
        }
      }
    }
  }

  if (!imageUrl) return null;

  // Only return URLs that start with http/https (valid download URLs)
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    // If it's not a URL, it might be a Firebase Storage path - return null to trigger async conversion
    return null;
  }

  // If it's an Unsplash URL, check if it already has query parameters
  // Unsplash URLs should work as-is, don't add size parameters that might break them
  if (imageUrl.includes('unsplash.com')) {
    // If URL already has query parameters, return as-is
    // If not, we can optionally add size parameters, but many Unsplash URLs work without them
    // For now, return as-is to avoid breaking valid URLs
    return imageUrl;
  }

  // For Firebase Storage URLs, check if we can use a thumbnail version
  // If the original image is in Firebase Storage, try to find or generate thumbnail path
  if (imageUrl.includes('firebasestorage.googleapis.com') || 
      imageUrl.includes('firebasestorage.app')) {
    // Try to find thumbnail by replacing path pattern
    // e.g., .../products/.../image.jpg -> .../products/.../thumbnails/image-thumb.jpg
    if (imageUrl.includes('/products/') && !imageUrl.includes('/thumbnails/')) {
      // Try thumbnail path pattern - but if it doesn't exist, fall back to original image
      // The original image will be used as the thumbnail automatically
      const thumbnailUrl = imageUrl.replace(/\/products\/([^/]+)\/([^/]+\.(jpg|jpeg|png|webp))/i, 
        '/products/$1/thumbnails/$2-thumb.$3');
      // Return the potential thumbnail URL (component will handle fallback if it doesn't exist)
      return thumbnailUrl;
    }
    // If already a thumbnail or can't determine pattern, return as-is
    return imageUrl;
  }

  // For other URLs, return as-is - the image itself will be used as the thumbnail
  // This ensures thumbnails are always available (using product images as fallback)
  return imageUrl;
};

/**
 * Get all image URLs from product, prioritizing thumbnails
 */
export const getProductImages = (product, useThumbnails = true) => {
  const images = [];
  
  if (useThumbnails) {
    // First try to get thumbnail
    const thumbnail = getThumbnailUrl(product);
    if (thumbnail) {
      images.push(thumbnail);
    }
  }
  
  // Then add other images
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    product.images.forEach(img => {
      if (img && typeof img === 'string' && img.trim() !== '' && !images.includes(img)) {
        images.push(img);
      }
    });
  }
  
  // Add from other image fields
  const imageFields = ['image', 'imageUrl', 'imageURL', 'photo', 'photoUrl', 'img', 'picture'];
  for (const field of imageFields) {
    if (product[field] && typeof product[field] === 'string' && product[field].trim() !== '') {
      const imgUrl = product[field];
      if (!images.includes(imgUrl)) {
        images.push(imgUrl);
      }
    }
  }
  
  return images.length > 0 ? images : [null];
};

/**
 * Get the primary image (thumbnail if available, otherwise first image)
 */
export const getPrimaryImage = (product, useThumbnail = true) => {
  if (useThumbnail) {
    const thumbnail = getThumbnailUrl(product, 400);
    if (thumbnail) return thumbnail;
  }
  
  if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
    return product.image;
  }
  
  if (product.images && Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0];
  }
  
  // Check other fields
  const imageFields = ['imageUrl', 'imageURL', 'photo', 'photoUrl', 'thumbnail', 'img', 'picture'];
  for (const field of imageFields) {
    if (product[field] && typeof product[field] === 'string' && product[field].trim() !== '') {
      return product[field];
    }
  }
  
  return null;
};

