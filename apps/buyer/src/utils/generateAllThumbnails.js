const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
import { generateThumbnail } from './thumbnailGenerator';

/**
 * Generate thumbnails for all products that don't have them
 * This can be called from an admin page or run as a one-time migration
 */
export const generateThumbnailsForAllProducts = async (onProgress = null, batchSize = 10) => {
  try {
    // Fetch all products from backend
    const res = await fetch(`${API_BASE}/api/products?limit=1000`, { credentials: 'include' });
    const payload = await res.json().catch(() => ({}));
    const products = payload.items || payload.products || [];
    
    console.log(`Found ${products.length} products to process`);
    
    let processed = 0;
    let generated = 0;
    let errors = 0;
    
    // Process in batches to avoid overwhelming the browser
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (product) => {
          try {
            // Skip if product already has thumbnail
            if (product.thumbnail && typeof product.thumbnail === 'string' && product.thumbnail.trim() !== '') {
              processed++;
              if (onProgress) {
                onProgress({
                  processed,
                  total: products.length,
                  generated,
                  errors,
                  current: product.name
                });
              }
              return;
            }
            
            // Get the first image URL
            let imageUrl = null;
            if (product.image && typeof product.image === 'string') {
              imageUrl = product.image;
            } else if (product.images && Array.isArray(product.images) && product.images.length > 0) {
              imageUrl = product.images[0];
            } else {
              // Check other image fields
              const imageFields = ['imageUrl', 'imageURL', 'photo', 'photoUrl'];
              for (const field of imageFields) {
                if (product[field] && typeof product[field] === 'string') {
                  imageUrl = product[field];
                  break;
                }
              }
            }
            
            if (!imageUrl) {
              console.warn(`Product ${product.id} (${product.name}) has no image to generate thumbnail from`);
              processed++;
              errors++;
              if (onProgress) {
                onProgress({
                  processed,
                  total: products.length,
                  generated,
                  errors,
                  current: product.name
                });
              }
              return;
            }
            
            // Generate thumbnail
            try {
              const thumbnailBlob = await generateThumbnail(imageUrl, 300, 300, 0.85);
              
              // Upload thumbnail to backend which should store and update product
              const form = new FormData();
              form.append('file', thumbnailBlob, `${product.id}-thumb.jpg`);

              const uploadRes = await fetch(`${API_BASE}/api/products/${encodeURIComponent(product.id)}/thumbnail`, {
                method: 'POST',
                credentials: 'include',
                body: form
              });

              if (!uploadRes.ok) {
                throw new Error(`Thumbnail upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
              }

              const uploadJson = await uploadRes.json().catch(() => ({}));
              const thumbnailUrl = uploadJson.thumbnailUrl || uploadJson.url || null;
              if (!thumbnailUrl) {
                throw new Error('Upload succeeded but no thumbnail URL returned');
              }
              
              generated++;
              console.log(`✅ Generated thumbnail for product: ${product.name}`);
            } catch (thumbError) {
              console.error(`❌ Failed to generate thumbnail for product ${product.id}:`, thumbError);
              errors++;
            }
            
            processed++;
            if (onProgress) {
              onProgress({
                processed,
                total: products.length,
                generated,
                errors,
                current: product.name
              });
            }
          } catch (error) {
            console.error(`Error processing product ${product.id}:`, error);
            errors++;
            processed++;
            if (onProgress) {
              onProgress({
                processed,
                total: products.length,
                generated,
                errors,
                current: product.name
              });
            }
          }
        })
      );
      
      // Small delay between batches to avoid overwhelming the browser
      if (i + batchSize < products.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return {
      total: products.length,
      processed,
      generated,
      errors,
      success: errors === 0
    };
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    throw error;
  }
};

/**
 * Generate thumbnails for a single product
 */
export const generateThumbnailForProduct = async (productId, productData = null) => {
  try {
    let product = productData;
    
    if (!product) {
      const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(productId)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Product not found');
      product = await res.json();
    }
    
    // Check if thumbnail already exists
    if (product.thumbnail && typeof product.thumbnail === 'string' && product.thumbnail.trim() !== '') {
      return { success: true, thumbnail: product.thumbnail, message: 'Thumbnail already exists' };
    }
    
    // Get image URL
    let imageUrl = product.image || (product.images && product.images[0]);
    if (!imageUrl) {
      const imageFields = ['imageUrl', 'imageURL', 'photo', 'photoUrl'];
      for (const field of imageFields) {
        if (product[field] && typeof product[field] === 'string') {
          imageUrl = product[field];
          break;
        }
      }
    }
    
    if (!imageUrl) {
      throw new Error('No image found to generate thumbnail from');
    }
    
    // Generate thumbnail
    const thumbnailBlob = await generateThumbnail(imageUrl, 300, 300, 0.85);
    
    // Upload to backend and let it persist the thumbnail and update product
    const form = new FormData();
    form.append('file', thumbnailBlob, `${product.id}-thumb.jpg`);

    const uploadRes = await fetch(`${API_BASE}/api/products/${encodeURIComponent(product.id)}/thumbnail`, {
      method: 'POST',
      credentials: 'include',
      body: form
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => '');
      throw new Error(`Thumbnail upload failed: ${uploadRes.status} ${uploadRes.statusText} ${text}`);
    }

    const uploadJson = await uploadRes.json().catch(() => ({}));
    const thumbnailUrl = uploadJson.thumbnailUrl || uploadJson.url || null;

    return {
      success: true,
      thumbnail: thumbnailUrl,
      message: 'Thumbnail generated successfully'
    };
  } catch (error) {
    console.error('Error generating thumbnail for product:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

