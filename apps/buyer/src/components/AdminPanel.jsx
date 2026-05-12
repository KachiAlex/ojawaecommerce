import { useState } from 'react';
import { seedDatabase, addSampleProducts, addSampleCategories } from '../utils/sampleData';

const AdminPanel = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSeedDatabase = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      await seedDatabase();
      setMessage('Database seeded successfully with categories and products!');
    } catch (error) {
      setMessage('Error seeding database: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProducts = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      await addSampleProducts();
      setMessage('Sample products added successfully!');
    } catch (error) {
      setMessage('Error adding sample products: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategories = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      await addSampleCategories();
      setMessage('Sample categories added successfully!');
    } catch (error) {
      setMessage('Error adding sample categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Admin Panel</h2>
      <p className="text-gray-600 mb-6">
        Use this panel to populate your Firestore database with sample data.
      </p>
      
      <div className="space-y-4">
        <button
          onClick={handleSeedDatabase}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Seeding Database...' : 'Seed Complete Database (Categories + Products)'}
        </button>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleAddCategories}
            disabled={loading}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Categories Only'}
          </button>
          
          <button
            onClick={handleAddProducts}
            disabled={loading}
            className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Products Only'}
          </button>
        </div>
      </div>
      
      {message && (
        <div className={`mt-6 p-4 rounded-lg ${
          message.includes('Error') 
            ? 'bg-red-100 text-red-700 border border-red-200' 
            : 'bg-green-100 text-green-700 border border-green-200'
        }`}>
          <div className="font-medium">
            {message.includes('Error') ? 'Error:' : 'Success:'}
          </div>
          <div className="mt-1">{message}</div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
