import React, { useEffect, useState } from 'react';

const ProductEditorModal = ({ open, product, onClose, onSave, progress = null }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fashion');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('₦ NGN');
  const [stock, setStock] = useState('');
  const [images, setImages] = useState([]); // mixed array of File or URL(string)
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCategory(product.category || 'Fashion');
      setDescription(product.description || '');
      setPrice(product.price || '');
      setCurrency(product.currency || '₦ NGN');
      setStock(product.stock || '');
      setImages(Array.isArray(product.images) ? product.images : []);
    } else {
      setName('');
      setCategory('Fashion');
      setDescription('');
      setPrice('');
      setCurrency('₦ NGN');
      setStock('');
      setImages([]);
    }
  }, [product]);

  if (!open) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages((prev) => [...prev, ...files]);
  };

  const removeImageAt = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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
    const payload = { name, category, description, price: Number(price), currency, stock: Number(stock), images };
    onSave?.(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
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
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="Enter product name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option>Fashion</option>
                <option>Beauty</option>
                <option>Electronics</option>
                <option>Home & Living</option>
                <option>Food</option>
                <option>Crafts</option>
                <option>Services</option>
                <option>Agriculture</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full border rounded-lg px-3 py-2" placeholder="Describe your product..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                <option>₦ NGN</option>
                <option>₵ GHS</option>
                <option>KSh KES</option>
                <option>Br ETB</option>
                <option>$ USD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
            <div className="flex items-center gap-3 mb-3">
              <input type="file" multiple accept="image/*" onChange={handleFileChange} />
              <span className="text-xs text-gray-500">JPG/PNG, multiple allowed</span>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
        </div>
        <div className="p-6 border-t flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Save</button>
        </div>
      </div>
    </div>
  );
};

export default ProductEditorModal;


