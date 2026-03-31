import React, { useState } from 'react';
import firebaseService from '../services/firebaseService';

const LogoUpload = () => {
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return;

    try {
      setUploading(true);
      // Upload via REST endpoint
      const result = await firebaseService.upload.uploadLogo(logoFile);
      const downloadURL = result?.url || result?.downloadUrl || null;
      if (!downloadURL) throw new Error('Upload did not return a URL');
      setLogoUrl(downloadURL);
      console.log('✅ Logo uploaded successfully:', downloadURL);
      navigator.clipboard.writeText(downloadURL);
      alert('Logo uploaded! URL copied to clipboard.');
      
    } catch (error) {
      console.error('❌ Error uploading logo:', error);
      alert('Error uploading logo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload OJAWA Logo</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Logo File
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
          />
        </div>

        {logoFile && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
              <img
                src={URL.createObjectURL(logoFile)}
                alt="Logo preview"
                className="max-w-full h-32 object-contain border rounded"
              />
            </div>

            <button
              onClick={uploadLogo}
              disabled={uploading}
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Logo'}
            </button>
          </div>
        )}

        {logoUrl && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-medium text-green-800 mb-2">Logo Uploaded Successfully!</h3>
            <p className="text-sm text-green-700 mb-2">URL:</p>
            <code className="block text-xs bg-white p-2 rounded border break-all">
              {logoUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(logoUrl)}
              className="mt-2 text-sm text-emerald-600 hover:text-emerald-700"
            >
              Copy URL
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoUpload;
