import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import ProductDetailModal from '../components/ProductDetailModal';
import ProductSearchFilter from '../components/ProductSearchFilter';
import AnimatedSplash from '../components/AnimatedSplash';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

const HomeNew = () => {
  const { currentUser, userProfile } = useAuth();
  const { addToCart } = useCart();
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Debug logging
  console.log('🏠 HomeNew component rendered');
  
  // Banner slides data with dynamic images - Emphasizing safe and secure transactions across Africa
  const bannerSlides = [
    {
      title: "Shop Safely Across Africa",
      subtitle: "The most secure e-commerce platform connecting buyers and vendors across Africa. Your money is protected until you receive your order with our advanced escrow system.",
      cta: "Start Shopping Safely",
      ctaSecondary: "How It Works",
      badge: "🔒 100% Secure • Africa-Wide Coverage",
      note: "Trusted by thousands across Nigeria, Ghana, Kenya, and more.",
      image: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=600&fit=crop",
      overlay: "from-emerald-600/90 to-teal-800/90"
    },
    {
      title: "Your Money Stays Safe Until Delivery",
      subtitle: "Shop with complete confidence. Our escrow system holds your payment securely until you confirm receipt and satisfaction. No fraud, no worries—just safe transactions across Africa.",
      cta: "Experience Secure Shopping",
      ctaSecondary: "Browse Products",
      badge: "🛡️ Bank-Level Security • Escrow Protected",
      note: "Funds are held securely—never released without your approval.",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=600&fit=crop",
      overlay: "from-blue-600/90 to-indigo-800/90"
    },
    {
      title: "Connecting Buyers & Vendors Across Africa",
      subtitle: "Shop from verified vendors in Nigeria, Ghana, South Africa, Kenya, and beyond. Every transaction is protected, every vendor is verified, every purchase is secure.",
      cta: "Explore Marketplace",
      ctaSecondary: "Become a Vendor",
      badge: "🌍 Pan-African • Fully Verified",
      note: "Secure transactions connecting the entire African continent.",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop",
      overlay: "from-purple-600/90 to-pink-800/90"
    },
    {
      title: "Zero Fraud. Maximum Protection.",
      subtitle: "Advanced fraud detection, verified vendors, secure payments, and dispute resolution. We've built the safest e-commerce platform for Africa—your security is our core strength.",
      cta: "Shop with Confidence",
      ctaSecondary: "Learn More",
      badge: "✅ Zero Fraud Guarantee • Dispute Protection",
      note: "Advanced protection at every step of your transaction.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=600&fit=crop",
      overlay: "from-teal-600/90 to-cyan-800/90"
    },
    {
      title: "The Safest Way to Shop Online in Africa",
      subtitle: "Join thousands of satisfied buyers who trust Ojawa for secure transactions. Your payment is protected, vendors are verified, and disputes are resolved fairly—all across Africa.",
      cta: "Join Thousands of Safe Shoppers",
      ctaSecondary: "View Products",
      badge: "⭐ Most Trusted Platform • Africa-Wide",
      note: "The #1 choice for secure e-commerce across the continent.",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=600&fit=crop",
      overlay: "from-orange-600/90 to-red-800/90"
    }
  ];
  
  // Auto-rotate banner slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => 
        prevIndex === bannerSlides.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, [bannerSlides.length]);


  // Handle add to cart
  const handleAddToCart = async (product) => {
    try {
      setAddingToCart(prev => ({ ...prev, [product.id]: true }));
      await addToCart(product, 1);
      console.log('✅ Added to cart:', product.name);
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      alert(error.message || 'Failed to add item to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  // Handle view product modal
  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // Handle search results from filter component
  const handleSearchResults = (searchResults) => {
    setFilteredProducts(searchResults);
    setIsSearching(false);
  };

  const handleSearchLoading = (loading) => {
    setIsSearching(loading);
  };

  // Fetch featured products
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true);
        let snapshot;
        
        // Fetch only featured products
        try {
          const q = query(
            collection(db, 'products'),
            where('isFeatured', '==', true),
            limit(20)
          );
          snapshot = await getDocs(q);
          console.log('✅ Fetched featured products from query, count:', snapshot.docs.length);
        } catch (error) {
          console.error('❌ Error with featured products query:', error);
          console.log('🔄 Falling back to fetch all products and filter client-side');
          // Fallback: get all products and filter client-side
          const q = query(collection(db, 'products'));
          snapshot = await getDocs(q);
          console.log('✅ Fetched all products for client-side filtering, count:', snapshot.docs.length);
        }
        
        const allProducts = snapshot.docs.map(doc => {
          const data = doc.data();
          // Handle images - ensure we have proper image URLs
          let images = [];
          if (data.images && Array.isArray(data.images) && data.images.length > 0) {
            images = data.images.filter(img => 
              img && typeof img === 'string' && img.trim() !== '' && img !== 'undefined' && img.trim().startsWith('http')
            );
          }
          
          // Check various image field names that might be used
          const imageFields = ['image', 'imageUrl', 'imageURL', 'photo', 'photoUrl', 'thumbnail'];
          for (const field of imageFields) {
            if (data[field] && typeof data[field] === 'string' && data[field].trim() !== '' && data[field] !== 'undefined' && data[field].trim().startsWith('http')) {
              if (!images.includes(data[field])) {
                images.unshift(data[field]); // Add to beginning if not already in array
              }
            }
          }
          
          return {
          id: doc.id,
            ...data,
            // Ensure required fields exist
            name: data.name || 'Unnamed Product',
            price: data.price || 0,
            category: data.category || 'Uncategorized',
            isActive: data.isActive !== false,
            isFeatured: data.isFeatured === true,
            createdAt: data.createdAt || new Date(),
            // Normalize images - always use array
            images: images,
            image: images.length > 0 ? images[0] : null
          };
        });
        
        console.log('📊 Queried products:', allProducts.length);
        
        const products = allProducts.filter(product => {
          // More robust filtering - treat as active if status is 'active' OR explicit isActive true
          const isActive = product.status === 'active' || product.isActive === true || product.isActive === "true";
          const isFeatured = product.isFeatured === true || 
                            product.isFeatured === "true" || 
                            product.featured === true || 
                            product.featured === "true" ||
                            product.isFeatured === 1 ||
                            product.featured === 1;
          
          console.log(`🔍 Product "${product.name}": isActive=${isActive} (${product.isActive}), isFeatured=${isFeatured} (${product.isFeatured}), featured=${product.featured}`);
          return isActive && isFeatured;
        });
        
        console.log('🏠 Featured products after filtering:', products.length);
        console.log('🏠 Featured product names:', products.map(p => p.name));

        // Always ensure we have 20 items in Featured
        const MAX_FEATURED = 20;
        let finalFeatured = [...products];

        if (finalFeatured.length < MAX_FEATURED) {
          // Top up with latest active products not already included
          const existingIds = new Set(finalFeatured.map(p => p.id));
          const topUp = allProducts
            .filter(p => (p.status === 'active' || p.isActive === true || p.isActive === "true") && !existingIds.has(p.id))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, MAX_FEATURED - finalFeatured.length);
          console.log('🔄 Topping up featured with latest active products:', topUp.length);
          finalFeatured = [...finalFeatured, ...topUp];
        }

        // Trim to exactly MAX_FEATURED if somehow larger
        if (finalFeatured.length > MAX_FEATURED) {
          finalFeatured = finalFeatured.slice(0, MAX_FEATURED);
        }

        setFeaturedProducts(finalFeatured);
      } catch (error) {
        console.error('❌ Error fetching featured products:', error);
        setFeaturedProducts([]);
      } finally {
        setLoading(false);
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  // Initialize filtered products when products change
  useEffect(() => {
    setFilteredProducts(featuredProducts);
  }, [featuredProducts]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6">
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {showSplash && (
        <AnimatedSplash onDone={() => setShowSplash(false)} />
      )}
      {/* Dynamic Banner Slider */}
      <section className="relative h-[600px] overflow-hidden" aria-label="Hero banner - Shop safely across Africa">
        {/* Dynamic Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
          style={{
            backgroundImage: `url(${bannerSlides[currentBannerIndex].image})`
          }}
          role="img"
          aria-label={`Banner image: ${bannerSlides[currentBannerIndex].title}`}
        />
        
        {/* Gradient Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${bannerSlides[currentBannerIndex].overlay}`}></div>
        
        {/* Banner Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-center w-full">
            {/* Badge */}
            <div className="mb-6">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm text-white border border-white/30 shadow-lg">
                {bannerSlides[currentBannerIndex].badge}
              </span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
              {bannerSlides[currentBannerIndex].title}
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-4xl mx-auto leading-relaxed drop-shadow-md">
              {bannerSlides[currentBannerIndex].subtitle}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link 
                to="/register" 
                className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-gray-800 hover:bg-gray-50 font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                {bannerSlides[currentBannerIndex].cta}
              </Link>
              <Link 
                to="/products" 
                className="inline-flex items-center justify-center rounded-xl border-2 border-white px-8 py-4 text-white hover:bg-white hover:text-gray-800 font-semibold text-lg transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-sm"
              >
                {bannerSlides[currentBannerIndex].ctaSecondary}
              </Link>
            </div>
            
            {/* Note */}
            <p className="text-sm text-white/80 drop-shadow-sm">
              {bannerSlides[currentBannerIndex].note}
            </p>
          </div>
        </div>
        
        {/* Banner Navigation Dots */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
          {bannerSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBannerIndex(index)}
              className={`w-4 h-4 rounded-full transition-all duration-300 shadow-lg ${
                index === currentBannerIndex 
                  ? 'bg-yellow-400 scale-110' 
                  : 'bg-white/60 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
        
        {/* Decorative elements with gold accents */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-400/20 rounded-full animate-pulse" aria-hidden="true"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-yellow-400/10 rounded-full animate-pulse delay-1000" aria-hidden="true"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-yellow-400/30 rounded-full animate-pulse delay-500" aria-hidden="true"></div>
      </section>

      {/* How Ojawa Escrow Works Section */}
      <section className="bg-gradient-to-b from-emerald-50 to-white py-20" aria-labelledby="how-it-works-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 id="how-it-works-heading" className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">How Secure Transactions Work</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Your payment is protected from the moment you order until you confirm delivery. The safest way to shop online across Africa.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Place Your Order",
                description: "Browse verified vendors across Africa. Select your product and place an order safely.",
                icon: "🛒"
              },
              {
                step: "2", 
                title: "Funds Held Securely",
                description: "Your payment is held in secure escrow—not released to the vendor until you confirm satisfaction.",
                icon: "🔒"
              },
              {
                step: "3",
                title: "Delivery & Inspection", 
                description: "Receive your order. Take your time to inspect. Your funds remain safely protected.",
                icon: "📦"
              },
              {
                step: "4",
                title: "You Control Release",
                description: "Confirm satisfaction to release payment, or open a dispute for fair mediation—you're always in control.",
                icon: "✅"
              }
            ].map((item, index) => (
              <div key={index} className="text-center p-8 bg-white rounded-2xl border-2 border-emerald-100 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                <div className="text-5xl mb-4">{item.icon}</div>
                <div className="w-12 h-12 mx-auto mb-4 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Features Section removed by request */}

      {/* Featured Products with Search */}
      <section className="bg-gray-50 py-16" aria-labelledby="featured-products-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 id="featured-products-heading" className="text-3xl font-bold text-gray-900 mb-4">Shop Securely from Featured Products</h2>
            <p className="text-lg text-gray-600 mb-6">Handpicked products from verified vendors across Africa—every purchase protected by escrow</p>
            <Link to="/products" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium">
              View all products in marketplace
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Search and Filter */}
          <ProductSearchFilter 
            onSearchResults={handleSearchResults}
            onLoading={handleSearchLoading}
            featuredProducts={featuredProducts}
          />

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm animate-pulse overflow-hidden">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No featured products available</h3>
              <p className="text-gray-600 mb-4">Our admin team is curating amazing products from verified vendors across Africa</p>
              <Link to="/products" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium">
                Browse all secure products in marketplace
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
                  <div className="relative">
                    <div className="relative h-48 bg-gray-100 overflow-hidden">
                      {/* Placeholder - only shown when no image */}
                      {(!product.image && (!product.images || product.images.length === 0)) ? (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <span className="text-4xl">🛍️</span>
                        </div>
                      ) : (
                        <>
                          {/* Get the first available image - use normalized image field */}
                          {(() => {
                            // Collect all possible image URLs
                            let imageUrls = [];
                            
                            // Add from normalized image field
                            if (product.image && typeof product.image === 'string' && product.image.trim() !== '' && product.image !== 'undefined') {
                              imageUrls.push(product.image);
                            }
                            
                            // Add from images array
                            if (product.images && Array.isArray(product.images) && product.images.length > 0) {
                              const validImages = product.images.filter(img => 
                                img && typeof img === 'string' && img.trim() !== '' && img !== 'undefined'
                              );
                              imageUrls.push(...validImages);
                            }
                            
                            // Fallback to other field names
                            const imageFields = ['imageUrl', 'imageURL', 'photo', 'photoUrl', 'thumbnail', 'img', 'picture'];
                            for (const field of imageFields) {
                              if (product[field] && typeof product[field] === 'string' && product[field].trim() !== '' && product[field] !== 'undefined') {
                                if (!imageUrls.includes(product[field])) {
                                  imageUrls.push(product[field]);
                                }
                              }
                            }
                            
                            // Remove duplicates
                            imageUrls = [...new Set(imageUrls)];
                            
                            const productImage = imageUrls.length > 0 ? imageUrls[0] : null;
                            
                            if (!productImage) {
                              return (
                                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                  <span className="text-4xl">🛍️</span>
                                </div>
                              );
                            }
                            
                            return (
                              <img 
                                src={productImage} 
                                alt={`${product.name} - ${product.vendorName || product.vendor || 'Vendor'}`}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                style={{ 
                                  display: 'block',
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  console.error('❌ HomeNew: Image failed to load for', product.name, '- URL:', productImage);
                                  // Try next image in array if available
                                  const currentIndex = imageUrls.indexOf(productImage);
                                  if (currentIndex !== -1 && currentIndex < imageUrls.length - 1) {
                                    const nextImage = imageUrls[currentIndex + 1];
                                    if (nextImage && typeof nextImage === 'string' && nextImage.trim() !== '') {
                                      console.log('🔄 HomeNew: Trying next image:', nextImage);
                                      e.target.src = nextImage;
                                      return;
                                    }
                                  }
                                  // Show placeholder on error
                                  e.target.style.display = 'none';
                                  if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }
                                }}
                                onLoad={(e) => {
                                  // Add 'loaded' class to make image visible (required by App.css)
                                  e.target.classList.add('loaded');
                                  e.target.style.opacity = '1';
                                  console.log('✅ HomeNew: Image loaded and displayed for', product.name, '- URL:', productImage);
                                }}
                              />
                            );
                          })()}
                          {/* Error placeholder - hidden by default, shown on error */}
                          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 hidden">
                            <span className="text-4xl">🛍️</span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="absolute top-3 left-3 bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Verified
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      by {product.vendorName || product.vendor || 'Vendor'}
                    </p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-emerald-600">
                        ₦{product.price?.toLocaleString() || '0'}
                      </span>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="text-yellow-400 mr-1">★</span>
                        {product.rating || '4.5'} ({product.reviewCount || '0'})
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleAddToCart(product)}
                        disabled={addingToCart[product.id] || !product.inStock}
                        className="flex-1 bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
                      >
                        {addingToCart[product.id] ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Adding...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                            </svg>
                            Add to Cart
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => handleViewProduct(product)}
                        className="px-4 py-2 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>


      <Footer />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default HomeNew;
