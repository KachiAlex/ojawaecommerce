import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import WalletEducation from './components/EscrowEducation';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import Buyer from './pages/Buyer';
import Vendor from './pages/Vendor';
import Logistics from './pages/Logistics';
import Tracking from './pages/Tracking';

const AppContent = () => {
  const { showEscrowEducation, setShowEscrowEducation, newUserType } = useAuth();

  return (
    <CartProvider>
      <Router>
        <div className="min-h-screen">
          <Navbar />
          <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route 
              path="/checkout" 
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              } 
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/buyer" element={<Buyer />} />
            <Route path="/vendor" element={<Vendor />} />
            <Route path="/logistics" element={<Logistics />} />
            <Route path="/tracking" element={<Tracking />} />
          </Routes>
          </main>
          
          {/* Wallet Education Modal */}
          {showEscrowEducation && (
            <WalletEducation 
              userType={newUserType}
              onComplete={() => setShowEscrowEducation(false)}
            />
          )}
        </div>
      </Router>
    </CartProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
