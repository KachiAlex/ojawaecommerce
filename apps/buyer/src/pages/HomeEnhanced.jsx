import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import ProductDetailModal from '../components/ProductDetailModal';
import CountdownTimer from '../components/CountdownTimer';
import ProductCarousel from '../components/ProductCarousel';
import { getPrimaryImage } from '../utils/imageUtils';
import firebaseService from '../services/firebaseService';

const HomeEnhanced = () => {
  const { currentUser, userProfile } = useAuth();
  const { addToCart } = useCart();
  const [isLoading, setIsLoading] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [dealsProducts, setDealsProducts] = useState([]);
  const [categoryProducts, setCategoryProducts] = useState({});
  const [addingToCart, setAddingToCart] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Flash sale end time (24 hours from now)
  const flashSaleEndTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Marketing banners emphasizing Ojawa as Africa's Digital Market and Escrow Security
  const promotionalBanners = [
    {
      title: "Africa's Digital Marketplace",
      subtitle: "Connecting Buyers & Vendors Across the Continent",
      description: "Shop from verified vendors in Nigeria, Ghana, Kenya, South Africa, and beyond. Every transaction protected, every vendor verified, every purchase secure.",
      image: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=1200&h=600&fit=crop",
      link: "/products",
      color: "from-emerald-600 to-teal-700"
    },
    {
      title: "Secure Transactions via Escrow",
      subtitle: "Your Funds Protected Until Delivery",
      description: "Our advanced escrow system holds your payment safely until you confirm receipt. No fraud, no worriesΓÇöjust secure transactions across Africa.",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=600&fit=crop",
      link: "/how-wallet-works",
      color: "from-blue-600 to-indigo-700"
    },
    {
      title: "Trusted E-Commerce Platform",
      subtitle: "Bank-Level Security for Every Transaction",
      description: "Verified vendors, identity verification, dispute resolution, and wallet-protected payments. We've built the safest marketplace for Africa.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=600&fit=crop",
      link: "/products",
      color: "from-purple-600 to-pink-700"
    },
    {
      title: "Pan-African Commerce",
      subtitle: "One Marketplace, Infinite Possibilities",
      description: "From Lagos to Accra, Nairobi to Cape TownΓÇöshop and sell securely across borders. Your Africa-wide digital marketplace awaits.",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop",
      link: "/products",
      color: "from-orange-600 to-red-700"
    }
  ];

  // Categories with icons
  const categories = [
    { name: 'Phones & Tablets', icon: '≡ƒô▒', slug: 'electronics' },
    { name: 'Fashion', icon: '≡ƒæù', slug: 'fashion' },
    { name: 'Home & Office', icon: '≡ƒÅá', slug: 'home' },
    { name: 'Electronics', icon: '≡ƒÆ╗', slug: 'electronics' },
    { name: 'Beauty', icon: '≡ƒÆä', slug: 'beauty' },
    { name: 'Supermarket', icon: '≡ƒ¢Æ', slug: 'food' },
    { name: 'Appliances', icon: '≡ƒöî', slug: 'appliances' },
    { name: 'Gaming', icon: '≡ƒÄ«', slug: 'gaming' }
  ];

  // Fetch products via REST backend
  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const raw = await firebaseService.product.getAll({ limit: 200 });

      const allProducts = (raw || []).map((p) => {
        const data = { ...p };
        // Normalize images
        let images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
        const imageFields = ['image', 'imageUrl', 'imageURL', 'photo', 'photoUrl', 'thumbnail'];
        for (const field of imageFields) {
          if (data[field] && typeof data[field] === 'string' && data[field].trim() !== '') {
            if (!images.includes(data[field])) images.unshift(data[field]);
          }
        }

        const thumbnailUrl = data.thumbnail || (Array.isArray(data.thumbnails) && data.thumbnails[0]) || getPrimaryImage(data, false) || (images[0] || null);

        return {
          id: data.id || data._id || null,
          ...data,
          images,
          image: thumbnailUrl || images[0] || null,
          rating: data.rating || 4.5,
          reviewCount: data.reviewCount || 0,
          stock: data.stock || 0,
          isVerified: data.isVerified || false,
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
        };
      })
      .filter(product => product && (product.isActive === true || product.status === 'active'))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 100);

      setFeaturedProducts(allProducts.slice(0, 20));
      const discountedProducts = allProducts.filter(p => p.originalPrice && p.originalPrice > p.price).sort((a, b) => (((b.originalPrice - b.price) / b.originalPrice) - ((a.originalPrice - a.price) / a.originalPrice))).slice(0,10);
      setFlashSaleProducts(discountedProducts);
      setTopSellers([...allProducts].sort((a,b)=> ((b.rating||0)*(b.reviewCount||0)) - ((a.rating||0)*(a.reviewCount||0))).slice(0,12));
      setDealsProducts(discountedProducts);
      const categoryMap = {};
      categories.forEach(cat => { categoryMap[cat.slug] = allProducts.filter(p => p.category?.toLowerCase().includes(cat.slug.toLowerCase())).slice(0,8); });
      setCategoryProducts(categoryMap);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Auto-rotate banners every 6 seconds (increased for better readability of marketing content)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => 
        prev === promotionalBanners.length - 1 ? 0 : prev + 1
      );
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleAddToCart = async (product) => {
    try {
      setAddingToCart(prev => ({ ...prev, [product.id]: true }));
      await addToCart(product, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200"></div>
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner with Promotional Content */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden">
        <motion.div
          key={currentBannerIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${promotionalBanners[currentBannerIndex].image})`
            }}
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <div className={`absolute inset-0 bg-gradient-to-br ${promotionalBanners[currentBannerIndex].color} opacity-90`} />
          
          {/* Animated decorative elements */}
          <motion.div
            className="absolute top-10 right-10 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute bottom-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
        </motion.div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <motion.div
            key={currentBannerIndex}
            initial={{ x: -50, opacity: 0, y: 20 }}
            animate={{ x: 0, opacity: 1, y: 0 }}
            exit={{ x: 50, opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-white"
          >
            <motion.div
              className="mb-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <span className="ojawa-pill inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold">
                {promotionalBanners[currentBannerIndex].subtitle}
              </span>
            </motion.div>
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {promotionalBanners[currentBannerIndex].title}
            </motion.h1>
            <motion.p
              className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl drop-shadow-md"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {promotionalBanners[currentBannerIndex].description}
            </motion.p>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link
                to={promotionalBanners[currentBannerIndex].link}
                className="inline-block bg-white text-gray-900 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl text-center"
              >
                {promotionalBanners[currentBannerIndex].link === '/how-wallet-works' ? 'Learn About Escrow' : 'Browse Marketplace'}
              </Link>
              {!currentUser && (
                <Link
                  to="/register"
                  className="inline-block border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition-all transform hover:scale-105 text-center"
                >
                  Join Ojawa
                </Link>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Banner Navigation Dots */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {promotionalBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBannerIndex(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentBannerIndex
                  ? 'bg-yellow-400 scale-110'
                  : 'bg-white/60 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Flash Sales Section with Animation */}
      {flashSaleProducts.length > 0 && (
        <motion.section
          className="bg-gradient-to-r from-red-600 to-red-700 py-6 relative overflow-hidden"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Animated background pattern */}
          <motion.div
            className="absolute inset-0 opacity-10"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "linear"
            }}
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
              backgroundSize: '40px 40px'
            }}
          />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <motion.h2
                  className="text-2xl md:text-3xl font-bold text-white"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  ΓÜí Flash Sales
                </motion.h2>
                <CountdownTimer targetDate={flashSaleEndTime} />
              </div>
              <Link
                to="/products?sale=true"
                className="ojawa-pill ojawa-pill--glow flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold hover:translate-y-[-1px]"
              >
                See All
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </motion.section>
      )}

      {/* Flash Sale Products Carousel */}
      {flashSaleProducts.length > 0 && (
        <section className="bg-gradient-to-b from-red-50 to-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ProductCarousel
              products={flashSaleProducts}
              showDiscount={true}
              showItemsLeft={true}
              autoScroll={true}
              scrollInterval={5000}
            />
          </div>
        </section>
      )}

      {/* Category Grid */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/products?category=${category.slug}`}
                className="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-emerald-500 hover:shadow-lg transition-all group"
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                  {category.icon}
                </div>
                <span className="text-sm font-medium text-gray-700 text-center group-hover:text-emerald-600">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Top Sellers Section */}
      {topSellers.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ProductCarousel
              title="Top Sellers"
              products={topSellers}
              showDiscount={true}
              autoScroll={true}
              scrollInterval={5000}
            />
          </div>
        </section>
      )}

      {/* Deals of the Day / Black Friday Deals */}
      {dealsProducts.length > 0 && (
        <section className="py-12 bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-white">Deals of the Day</h2>
              <Link
                to="/products?sale=true"
                className="text-white font-medium hover:underline flex items-center gap-1"
              >
                See All
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <ProductCarousel
              products={dealsProducts}
              showDiscount={true}
              showItemsLeft={true}
              autoScroll={true}
              scrollInterval={5000}
              className="text-white"
            />
          </div>
        </section>
      )}

      {/* Category-specific Product Sections */}
      {Object.entries(categoryProducts).map(([categorySlug, products]) => {
        if (products.length === 0) return null;
        const category = categories.find(c => c.slug === categorySlug);
        if (!category) return null;

        return (
          <section key={categorySlug} className="py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ProductCarousel
                title={`${category.name} Deals`}
                products={products}
                showDiscount={true}
                autoScroll={true}
                scrollInterval={5000}
              />
            </div>
          </section>
        );
      })}

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ProductCarousel
              title="Featured Products"
              products={featuredProducts}
              showDiscount={true}
              autoScroll={true}
              scrollInterval={5000}
            />
          </div>
        </section>
      )}

      {/* Promotional Banner Section */}
      <section className="py-12 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Secure Shopping Across Africa
            </h2>
            <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
              Your payment is protected until you receive your order. Shop with confidence on Africa's most trusted e-commerce platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/products"
                className="inline-block bg-white text-emerald-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105"
              >
                Browse Products
              </Link>
              {!currentUser && (
                <Link
                  to="/register"
                  className="inline-block border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition-all"
                >
                  Join Ojawa
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
};

export default HomeEnhanced;

