import React, { useEffect, useState } from 'react';

const ProductEditorModal = ({ open, product, onClose, onSave, progress = null }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fashion');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('₦ NGN');
  const [stock, setStock] = useState('');
  const [condition, setCondition] = useState('new'); // new or used
  const [processingTimeDays, setProcessingTimeDays] = useState('2'); // Vendor processing time in days
  const [images, setImages] = useState([]); // mixed array of File or URL(string)
  const [videos, setVideos] = useState([]); // video files
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCategory(product.category || 'Fashion');
      setDescription(product.description || '');
      setPrice(product.price || '');
      setCurrency(product.currency || '₦ NGN');
      setStock(product.stock || '');
      setCondition(product.condition || 'new');
      setProcessingTimeDays(String(product.processingTimeDays || '2'));
      setImages(Array.isArray(product.images) ? product.images : []);
      setVideos(Array.isArray(product.videos) ? product.videos : []);
    } else {
      setName('');
      setCategory('Fashion');
      setCustomCategory('');
      setShowCustomCategory(false);
      setDescription('');
      setPrice('');
      setCurrency('₦ NGN');
      setStock('');
      setCondition('new');
      setProcessingTimeDays('2');
      setImages([]);
      setVideos([]);
    }
  }, [product]);

  if (!open) return null;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages((prev) => [...prev, ...files]);
  };

  const handleVideoChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setVideos((prev) => [...prev, ...files]);
  };

  const removeImageAt = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeVideoAt = (index) => {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  };

  const onDragStart = (index) => setDragIndex(index);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  const handleSave = () => {
    const finalCategory = showCustomCategory && customCategory ? customCategory : category;
    const payload = { 
      name, 
      category: finalCategory, 
      description, 
      price: Number(price), 
      currency, 
      stock: Number(stock), 
      condition,
      processingTimeDays: Number(processingTimeDays) || 2,
      images,
      videos
    };
    onSave?.(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{product ? 'Edit Product' : 'Add New Product'}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          {typeof progress === 'number' && (
            <div className="mt-4">
              <div className="w-full h-2 bg-gray-100 rounded">
                <div className="h-2 bg-emerald-600 rounded" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-1 text-xs text-gray-500">Uploading images... {progress}%</div>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {product?.status === 'rejected' && product?.rejectionReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800 mb-1">Admin Feedback</p>
              <p className="text-sm text-red-700 whitespace-pre-wrap">{product.rejectionReason}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Enter product name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="space-y-2">
                <select 
                  value={showCustomCategory ? 'custom' : category} 
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setShowCustomCategory(true);
                    } else {
                      setShowCustomCategory(false);
                      setCategory(e.target.value);
                    }
                  }} 
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option>Fashion</option>
                  <option>Beauty</option>
                  <option>Electronics</option>
                  <option>Home & Living</option>
                  <option>Food</option>
                  <option>Crafts</option>
                  <option>Services</option>
                  <option>Agriculture</option>
                  <option value="custom">+ Add Custom Category</option>
                </select>
                {showCustomCategory && (
                  <input 
                    type="text" 
                    value={customCategory} 
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category name"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full border rounded-lg px-3 py-2" placeholder="Describe your product..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Condition</label>
              <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option value="new">Brand New</option>
                <option value="used">Used - Good</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Processing Time (Days to Prepare Order)
              <span className="text-xs text-gray-500 ml-1">• Time needed to prepare/pack before shipping</span>
            </label>
            <select 
              value={processingTimeDays} 
              onChange={(e) => setProcessingTimeDays(e.target.value)} 
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="0">Same Day Ready</option>
              <option value="1">1 Business Day</option>
              <option value="2">1-2 Business Days</option>
              <option value="3">2-3 Business Days</option>
              <option value="5">3-5 Business Days</option>
              <option value="7">5-7 Business Days</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              This is added to shipping time. Buyers will see total delivery time (your processing + shipping).
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                {/* Africa-focused and global currencies (symbol + code) */}
                <option>₦ NGN</option>
                <option>₵ GHS</option>
                <option>KSh KES</option>
                <option>Br ETB</option>
                <option>R ZAR</option>
                <option>TSh TZS</option>
                <option>USh UGX</option>
                <option>₣ XOF</option>
                <option>₣ XAF</option>
                <option>د.إ AED</option>
                <option>$ USD</option>
                <option>€ EUR</option>
                <option>£ GBP</option>
                <option>¥ JPY</option>
                <option>₹ INR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-3">
              <input type="file" multiple accept="image/*" onChange={handleImageChange} className="text-sm" />
              <span className="text-xs text-gray-500">JPG/PNG, multiple allowed</span>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img, idx) => {
                  const isFile = typeof img !== 'string';
                  const src = isFile ? URL.createObjectURL(img) : img;
                  return (
                    <div
                      key={idx}
                      className={`relative group border rounded-lg overflow-hidden bg-gray-50 ${dragIndex===idx?'ring-2 ring-emerald-500':''}`}
                      draggable
                      onDragStart={() => onDragStart(idx)}
                      onDragOver={onDragOver}
                      onDrop={() => onDrop(idx)}
                    >
                      <img src={src} alt={`product-${idx}`} className="w-full h-28 object-cover" />
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => removeImageAt(idx)}
                          className="bg-white/90 hover:bg-white text-red-600 text-xs px-2 py-1 rounded shadow"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 text-[10px] bg-white/80 px-1 rounded">
                        {isFile ? 'New' : 'Existing'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Videos (Optional)</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-3">
              <input type="file" multiple accept="video/*" onChange={handleVideoChange} className="text-sm" />
              <span className="text-xs text-gray-500">MP4/WebM, multiple allowed</span>
            </div>
            {videos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {videos.map((video, idx) => {
                  const isFile = typeof video !== 'string';
                  const src = isFile ? URL.createObjectURL(video) : video;
                  return (
                    <div key={idx} className="relative group border rounded-lg overflow-hidden bg-gray-50">
                      <video 
                        src={src} 
                        className="w-full h-32 object-cover" 
                        controls
                        preload="metadata"
                      />
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => removeVideoAt(idx)}
                          className="bg-white/90 hover:bg-white text-red-600 text-xs px-2 py-1 rounded shadow"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 text-[10px] bg-white/80 px-1 rounded">
                        {isFile ? 'New' : 'Existing'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="p-4 sm:p-6 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50 order-2 sm:order-1">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 order-1 sm:order-2">Save</button>
        </div>
      </div>
    </div>
  );
};

export default ProductEditorModal;


