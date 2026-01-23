import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import Footer from "../components/Footer";
import ProductCarousel from "../components/ProductCarousel";
import CountdownTimer from "../components/CountdownTimer";
import ProductDetailModal from "../components/ProductDetailModal";
import ProductFilterSidebar from "../components/ProductFilterSidebar";
import { getPrimaryImage } from "../utils/imageUtils";
import SearchAutocomplete from "../components/SearchAutocomplete";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../firebase/config";

// Ojawa-inspired hero slider focused on secure, Pan‑African ecommerce
// Using logo colors: Teal (#0d9488), Gold/Amber (#fbbf24), Emerald
const heroSlides = [
  {
    id: "escrow-protection",
    eyebrow: "100% Secure • Escrow Protected",
    title: "Shop Safely Across Africa",
    subtitle:
      "Your money stays in secure escrow until you confirm delivery. Every order is protected, every dispute is handled fairly.",
    primaryCta: "Start Secure Shopping",
    primaryTo: "/products",
    secondaryCta: "How Ojawa Escrow Works",
    secondaryTo: "/how-wallet-works",
    // Black African shoppers reviewing an order together
    image:
      "https://images.unsplash.com/photo-1599669454699-248893623440?w=1600&h=800&fit=crop",
    overlayFrom: "from-teal-600/95",
    overlayTo: "to-emerald-800/95",
    accentColor: "amber",
  },
  {
    id: "verified-vendors",
    eyebrow: "Verified Vendors • Fraud Prevention",
    title: "Only Verified Vendors, Every Time",
    subtitle:
      "Vendors complete identity checks and transaction history reviews before selling. You see trusted stores, not random sellers.",
    primaryCta: "Browse Verified Stores",
    primaryTo: "/products",
    secondaryCta: "Become a Vendor",
    secondaryTo: "/become-vendor",
    // Black African vendor preparing packages in a small warehouse / shop
    image:
      "https://images.unsplash.com/photo-1585386959984-a4155223f3f8?w=1600&h=800&fit=crop",
    overlayFrom: "from-emerald-700/95",
    overlayTo: "to-teal-900/95",
    accentColor: "amber",
  },
  {
    id: "pan-african",
    eyebrow: "Pan‑African Coverage",
    title: "One Marketplace for the Whole Continent",
    subtitle:
      "From Lagos to Accra, Nairobi to Johannesburg—Ojawa connects Black African buyers and vendors with secure payments and protected delivery.",
    primaryCta: "Explore Marketplace",
    primaryTo: "/products",
    secondaryCta: "Create Free Account",
    secondaryTo: "/register",
    // Black African courier / delivery rider handing a parcel to a customer
    image:
      "https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=1600&h=800&fit=crop",
    overlayFrom: "from-teal-700/95",
    overlayTo: "to-emerald-900/95",
    accentColor: "amber",
  },
];

const sliderIntervalMs = 7000;

const testModeEnabled = import.meta.env?.VITE_TEST_MODE === "true";

const testModeProducts = [
  {
    id: "test-phone",
    name: "Ojawa Test Phone",
    price: 250,
    originalPrice: 320,
    category: "phones",
    images: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop"],
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=600&fit=crop",
    thumbnails: [],
    discount: 20,
    badges: ["New"],
    vendorName: "Test Vendor",
    rating: 4.8,
    sold: 120,
  },
  {
    id: "test-fashion",
    name: "Ojawa Test Fashion Fit",
    price: 80,
    originalPrice: 110,
    category: "fashion",
    images: ["https://images.unsplash.com/photo-1495121605193-b116b5b09c73?w=800&h=600&fit=crop"],
    image: "https://images.unsplash.com/photo-1495121605193-b116b5b09c73?w=800&h=600&fit=crop",
    thumbnails: [],
    discount: 15,
    badges: ["Popular"],
    vendorName: "Test Fashion",
    rating: 4.6,
    sold: 90,
  },
  {
    id: "test-appliance",
    name: "Ojawa Test Blender",
    price: 120,
    originalPrice: 180,
    category: "appliances",
    images: ["https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=800&h=600&fit=crop"],
    image: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=800&h=600&fit=crop",
    thumbnails: [],
    discount: 30,
    badges: ["Top Rated"],
    vendorName: "Test Kitchen",
    rating: 4.9,
    sold: 60,
  },
];

const HomeOjawa = () => {
  const { currentUser } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [flashSaleProducts, setFlashSaleProducts] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [categoryProducts, setCategoryProducts] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [addingToCart, setAddingToCart] = useState({});
  const [allProducts, setAllProducts] = useState([]);
  const [sidebarFilters, setSidebarFilters] = useState(null);
  const [categories, setCategories] = useState([]);
  const [heroSearch, setHeroSearch] = useState({
    query: "",
    category: "",
    priceMin: "",
    priceMax: "",
    express: false,
  });
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const filteredResultsRef = useRef(null);

  // Flash sale end time (24 hours from now)
  const flashSaleEndTime = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();

  // Category mapping for product filtering
  const categoryMap = {
    phones: [
      "phones", "phone", "tablets", "tablet", "mobile", "smartphone", 
      "accessories", "phone accessories", "mobile accessories", 
      "charger", "charging", "power bank", "powerbank", "battery",
      "case", "phone case", "mobile case", "cover", "phone cover",
      "screen protector", "tempered glass", "protector",
      "earphone", "earphones", "headphone", "headphones", "earbud", "earbuds",
      "cable", "usb cable", "charging cable", "data cable",
      "adapter", "charger adapter", "usb adapter",
      "bluetooth", "wireless", "speaker", "portable speaker",
      "selfie stick", "tripod", "phone holder", "stand",
      "sim card", "memory card", "sd card", "storage",
      "phone repair", "screen replacement", "battery replacement"
    ],
    fashion: ["fashion", "clothing", "apparel", "wear"],
    electronics: ["electronics", "tv", "audio", "speaker"],
    beauty: ["beauty", "cosmetics", "skincare"],
    appliances: ["appliances", "home", "kitchen"],
    computing: ["computing", "laptop", "computer"],
  };

  // Fetch products from Firestore
  const fetchProducts = async () => {
    try {
      if (testModeEnabled) {
        setAllProducts(testModeProducts);
        setFlashSaleProducts(testModeProducts);
        setTopSellers(testModeProducts);
        setCategoryProducts({
          phones: testModeProducts.filter((p) => p.category === "phones"),
          fashion: testModeProducts.filter((p) => p.category === "fashion"),
          appliances: testModeProducts.filter((p) => p.category === "appliances"),
        });
        setCategories(["phones", "fashion", "appliances"]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      console.log('[HomeOjawa] Fetching products...');
      const q = query(collection(db, "products"), limit(200));
      const snapshot = await getDocs(q);
      console.log('[HomeOjawa] Raw snapshot size:', snapshot.size);

      const processedProducts = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          let images = [];
          if (
            data.images &&
            Array.isArray(data.images) &&
            data.images.length > 0
          ) {
            images = data.images.filter(
              (img) =>
                img &&
                typeof img === "string" &&
                img.trim() !== "" &&
                img !== "undefined",
            );
          }

          const imageFields = [
            "image",
            "imageUrl",
            "imageURL",
            "photo",
            "photoUrl",
            "thumbnail",
          ];
          for (const field of imageFields) {
            if (
              data[field] &&
              typeof data[field] === "string" &&
              data[field].trim() !== ""
            ) {
              if (!images.includes(data[field])) {
                images.unshift(data[field]);
              }
            }
          }

          const productData = {
            id: doc.id,
            ...data,
            name: data.name || "Unnamed Product",
            price: parseFloat(data.price) || 0,
            originalPrice: parseFloat(data.originalPrice) || null,
            category: data.category || "Uncategorized",
            images: images,
            image: images.length > 0 ? images[0] : null,
            thumbnail: data.thumbnail || null,
            thumbnails: data.thumbnails || null,
          };

          let thumbnailUrl = null;
          if (
            productData.thumbnail &&
            typeof productData.thumbnail === "string" &&
            productData.thumbnail.trim() !== ""
          ) {
            thumbnailUrl = productData.thumbnail;
          } else if (
            productData.thumbnails &&
            Array.isArray(productData.thumbnails) &&
            productData.thumbnails.length > 0
          ) {
            thumbnailUrl = productData.thumbnails[0];
          } else {
            thumbnailUrl = getPrimaryImage(productData, false);
          }

          return {
            ...productData,
            image: thumbnailUrl || productData.image,
            rating: data.rating || 4.5,
            reviewCount: data.reviewCount || 0,
            stock: data.stock || 0,
            isVerified: data.isVerified || false,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : data.createdAt || new Date(),
          };
        });

      console.log('[HomeOjawa] Processed products before filtering:', processedProducts.length);

      const filteredProducts = processedProducts
        .filter((product) => {
          const status = typeof product.status === 'string'
            ? product.status.toLowerCase()
            : 'active';
          const explicitlyInactive = product.isActive === false ||
            status === 'inactive' ||
            status === 'archived' ||
            status === 'suspended';
          return !explicitlyInactive;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 100);

      console.log('[HomeOjawa] Products after filter:', {
        totalVisible: filteredProducts.length,
        filteredOut: processedProducts.length - filteredProducts.length
      });

      const allProducts = filteredProducts;

      // Store all products
      setAllProducts(allProducts);
      console.log('[HomeOjawa] Stored products:', allProducts.length);

      // Extract unique categories
      const uniqueCategories = [...new Set(allProducts.map(p => p.category).filter(Boolean))].sort();
      setCategories(uniqueCategories);

      // Set flash sale products (products with discounts)
      const discountedProducts = allProducts
        .filter((p) => p.originalPrice && p.originalPrice > p.price)
        .sort((a, b) => {
          const discountA =
            ((a.originalPrice - a.price) / a.originalPrice) * 100;
          const discountB =
            ((b.originalPrice - b.price) / b.originalPrice) * 100;
          return discountB - discountA;
        })
        .slice(0, 12);
      setFlashSaleProducts(discountedProducts);

      // Set top sellers (products with highest ratings/reviews)
      const topRated = [...allProducts]
        .sort((a, b) => {
          const scoreA = (a.rating || 0) * (a.reviewCount || 0);
          const scoreB = (b.rating || 0) * (b.reviewCount || 0);
          return scoreB - scoreA;
        })
        .slice(0, 12);
      setTopSellers(topRated);

      // Group products by category
      const categoryMapResult = {};
      Object.keys(categoryMap).forEach((catKey) => {
        categoryMapResult[catKey] = allProducts
          .filter((p) => {
            const categoryLower = (p.category || "").toLowerCase();
            const nameLower = (p.name || "").toLowerCase();
            const descriptionLower = (p.description || "").toLowerCase();
            
            // Check if any keyword matches in category, name, or description
            return categoryMap[catKey].some((keyword) => {
              const keywordLower = keyword.toLowerCase();
              return (
                categoryLower.includes(keywordLower) ||
                nameLower.includes(keywordLower) ||
                descriptionLower.includes(keywordLower)
              );
            });
          })
          .slice(0, 12);
      });
      setCategoryProducts(categoryMapResult);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Auto-rotate hero slides
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroSlides.length);
    }, sliderIntervalMs);
    return () => clearInterval(id);
  }, []);

  const handleAddToCart = async (product) => {
    try {
      setAddingToCart((prev) => ({ ...prev, [product.id]: true }));
      await addToCart(product, 1);
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setAddingToCart((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Apply sidebar filters to products
  const applySidebarFilters = (productsToFilter, filters) => {
    if (!filters) return productsToFilter;
    
    let filtered = [...productsToFilter];

    // Text search filter
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const searchLower = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((product) => {
        const nameMatch = product.name?.toLowerCase().includes(searchLower);
        const descMatch = product.description?.toLowerCase().includes(searchLower);
        const categoryMatch = product.category?.toLowerCase().includes(searchLower);
        const brandMatch = product.brand?.toLowerCase().includes(searchLower);
        const tagsMatch = product.tags?.some((tag) => tag.toLowerCase().includes(searchLower));
        return nameMatch || descMatch || categoryMatch || brandMatch || tagsMatch;
      });
    }
    
    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      filtered = filtered.filter(p => filters.categories.includes(p.category));
    }
    
    // Express delivery filter
    if (filters.expressDelivery) {
      filtered = filtered.filter(p => p.expressDelivery === true || p.fastDelivery === true);
    }
    
    // Price range filter
    if (filters.priceRange) {
      filtered = filtered.filter(p => {
        const price = parseFloat(p.price) || 0;
        return price >= filters.priceRange.min && price <= filters.priceRange.max;
      });
    }
    
    // Discount percentage filter
    if (filters.discountPercentage !== null) {
      filtered = filtered.filter(p => {
        if (!p.originalPrice || !p.price) return false;
        const original = parseFloat(p.originalPrice);
        const current = parseFloat(p.price);
        if (original <= current) return false;
        const discount = Math.round(((original - current) / original) * 100);
        return discount >= filters.discountPercentage;
      });
    }
    
    // Brand filter
    if (filters.brands && filters.brands.length > 0) {
      filtered = filtered.filter(p => filters.brands.includes(p.brand));
    }
    
    // Size filter
    if (filters.sizes && filters.sizes.length > 0) {
      filtered = filtered.filter(p => {
        if (p.size) {
          if (Array.isArray(p.size)) {
            return p.size.some(s => filters.sizes.includes(s));
          }
          return filters.sizes.includes(p.size);
        }
        if (p.sizes && Array.isArray(p.sizes)) {
          return p.sizes.some(s => filters.sizes.includes(s));
        }
        return false;
      });
    }
    
    return filtered;
  };

  // Handle sidebar filter changes
  const handleSidebarFilterChange = useCallback((filters) => {
    setSidebarFilters(filters);
  }, []);

  const priceBoundaries = useMemo(() => {
    if (!allProducts || allProducts.length === 0) {
      return { min: 0, max: 10000000 };
    }
    const validPrices = allProducts
      .map((p) => parseFloat(p.price) || 0)
      .filter((price) => price > 0);

    if (validPrices.length === 0) {
      return { min: 0, max: 10000000 };
    }

    return {
      min: Math.floor(Math.min(...validPrices)),
      max: Math.ceil(Math.max(...validPrices)),
    };
  }, [allProducts]);

  useEffect(() => {
    setHeroSearch((prev) => ({
      ...prev,
      query: sidebarFilters?.searchQuery || "",
      category: sidebarFilters?.categories?.[0] || "",
      priceMin:
        typeof sidebarFilters?.priceRange?.min === "number"
          ? sidebarFilters.priceRange.min.toString()
          : "",
      priceMax:
        typeof sidebarFilters?.priceRange?.max === "number"
          ? sidebarFilters.priceRange.max.toString()
          : "",
      express: !!sidebarFilters?.expressDelivery,
    }));
  }, [sidebarFilters]);

  const handleHeroSearchChange = (field, value) => {
    setHeroSearch((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const scrollToFilteredResults = useCallback(() => {
    if (filteredResultsRef.current) {
      filteredResultsRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      if (typeof window !== "undefined" && window.history?.replaceState) {
        const url = `${window.location.pathname}#home-filter-results`;
        window.history.replaceState(null, "", url);
      }
    }
  }, []);

  const handleHeroSearchSubmit = (event) => {
    event.preventDefault();
    const currentFilters = sidebarFilters || {};
    const minPrice =
      heroSearch.priceMin !== "" ? Number(heroSearch.priceMin) : null;
    const maxPrice =
      heroSearch.priceMax !== "" ? Number(heroSearch.priceMax) : null;

    const priceRange =
      minPrice !== null || maxPrice !== null
        ? {
            min:
              minPrice !== null
                ? Math.max(minPrice, 0)
                : priceBoundaries.min,
            max:
              maxPrice !== null
                ? Math.max(maxPrice, minPrice ?? priceBoundaries.min)
                : priceBoundaries.max,
          }
        : null;

    handleSidebarFilterChange({
      ...currentFilters,
      searchQuery: heroSearch.query.trim(),
      categories: heroSearch.category ? [heroSearch.category] : [],
      expressDelivery: heroSearch.express,
      priceRange,
    });
    scrollToFilteredResults();
  };

  const handleHeroSearchReset = () => {
    setHeroSearch({
      query: "",
      category: "",
      priceMin: "",
      priceMax: "",
      express: false,
    });
    const currentFilters = sidebarFilters || {};
    handleSidebarFilterChange({
      ...currentFilters,
      searchQuery: "",
      categories: [],
      expressDelivery: false,
      priceRange: null,
    });
  };

  // Get filtered products for carousels
  const getFilteredProducts = (products) => {
    if (!sidebarFilters) return products;
    return applySidebarFilters(products, sidebarFilters);
  };

  const activeSlide = heroSlides[currentIndex];

  return (
    <div className="min-h-screen bg-slate-950 pt-0 space-y-10">
      {/* Hero Section */}
      <section className="relative bg-slate-950">
        {/* Mobile Filter Overlay */}
        {isMobileFiltersOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setIsMobileFiltersOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-11/12 max-w-md bg-slate-950 border-l border-teal-800/40 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-teal-800/30 text-teal-50">
                <p className="text-sm font-semibold">Refine products</p>
                <button
                  type="button"
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="text-sm text-emerald-300 hover:text-emerald-200"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <ProductFilterSidebar
                  products={allProducts}
                  onFilterChange={handleSidebarFilterChange}
                  categories={categories}
                  isOpen={true}
                  showSearch={true}
                  onClose={() => setIsMobileFiltersOpen(false)}
                />
              </div>
            </div>
          </div>
        )}

        <div className="app-content py-6 lg:py-10 space-y-6 lg:space-y-10">
          <div className="lg:hidden space-y-3">
            <button
              onClick={() => setIsMobileFiltersOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-lg hover:from-emerald-400 hover:to-teal-400 transition-colors"
            >
              <span>🔍</span> Filters & search
            </button>
            <form
              onSubmit={handleHeroSearchSubmit}
              className="bg-slate-900/70 border border-teal-800/40 rounded-2xl p-4 space-y-3 text-white"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-teal-200 block mb-1">
                    Product or keyword
                  </label>
                  <input
                    type="text"
                    value={heroSearch.query}
                    onChange={(e) => handleHeroSearchChange("query", e.target.value)}
                    placeholder="Search verified vendors, items, brands..."
                    className="w-full px-3 py-2 bg-slate-800/60 border border-emerald-800 rounded-xl text-sm text-white placeholder-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-teal-200 block mb-1">Category</label>
                  <select
                    value={heroSearch.category}
                    onChange={(e) => handleHeroSearchChange("category", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/60 border border-emerald-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="">All categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    value={heroSearch.priceMin}
                    onChange={(e) => handleHeroSearchChange("priceMin", e.target.value)}
                    placeholder="Min ₦"
                    className="flex-1 px-3 py-2 bg-slate-800/60 border border-emerald-800 rounded-xl text-sm text-white placeholder-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <input
                    type="number"
                    min="0"
                    value={heroSearch.priceMax}
                    onChange={(e) => handleHeroSearchChange("priceMax", e.target.value)}
                    placeholder="Max ₦"
                    className="flex-1 px-3 py-2 bg-slate-800/60 border border-emerald-800 rounded-xl text-sm text-white placeholder-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-teal-100">
                <input
                  type="checkbox"
                  checked={heroSearch.express}
                  onChange={(e) => handleHeroSearchChange("express", e.target.checked)}
                  className="h-4 w-4 rounded border-teal-500 text-emerald-400 focus:ring-emerald-400"
                />
                Prefer Ojawa Express delivery (24-48h)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleHeroSearchReset}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-teal-500/40 text-teal-100 text-sm hover:bg-teal-900/40 transition-colors"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-semibold text-sm shadow-lg hover:from-emerald-300 hover:to-teal-400 transition-all"
                >
                  Apply filters
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
            {/* Filter Sidebar - desktop */}
            <aside className="hidden lg:block">
              <ProductFilterSidebar
                products={allProducts}
                onFilterChange={handleSidebarFilterChange}
                categories={categories}
                isOpen={true}
                showSearch={true}
              />
            </aside>

            {/* Center hero slider + search */}
            <div className="order-first lg:order-none relative h-auto lg:h-[520px] rounded-2xl lg:rounded-3xl overflow-hidden shadow-xl lg:shadow-2xl border lg:border-2 border-teal-600/50 bg-slate-900 flex flex-col">
            {/* Background image + gradient overlay */}
            <div className="absolute inset-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide.id}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${activeSlide.image})` }}
                />
              </AnimatePresence>
              <div
                className={`absolute inset-0 bg-gradient-to-br ${activeSlide.overlayFrom} ${activeSlide.overlayTo}`}
              />
            </div>

              {/* Content */}
              <div className="relative flex-1 flex flex-col justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-10 lg:py-8">
                {/* Top badge row */}
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <div className="inline-flex items-center px-2 py-1 sm:px-4 sm:py-1.5 rounded-full bg-gradient-to-r from-teal-500/20 to-emerald-500/20 border border-amber-400/40 shadow-lg backdrop-blur-sm">
                    <span className="text-[10px] sm:text-xs lg:text-sm font-semibold text-amber-100 flex items-center gap-1 sm:gap-2">
                      <span className="text-teal-300">🔒</span>
                      <span className="hidden sm:inline">{activeSlide.eyebrow}</span>
                      <span className="sm:hidden">100% Secure</span>
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-xs text-teal-100/80">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Escrow‑protected payments
                    </span>
                    <span className="hidden md:inline-block w-px h-4 bg-teal-300/40" />
                    <span className="hidden md:inline">
                      Dispute resolution support
                    </span>
                  </div>
                </div>

                {/* Main copy */}
                <div className="max-w-xl mt-2 sm:mt-4 space-y-2 sm:space-y-4">
                  <motion.h1
                    key={activeSlide.id + "-title"}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-xl sm:text-3xl lg:text-5xl font-extrabold text-white leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] sm:drop-shadow-[0_10px_35px_rgba(15,23,42,0.8)]"
                  >
                    {activeSlide.title}
                  </motion.h1>
                  <motion.p
                    key={activeSlide.id + "-subtitle"}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.05 }}
                    className="text-xs sm:text-sm lg:text-lg text-teal-50/90 max-w-xl line-clamp-2 sm:line-clamp-none"
                  >
                    {activeSlide.subtitle}
                  </motion.p>
                </div>

                {/* CTAs and stats */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mt-2 sm:mt-4">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Link
                      to={activeSlide.primaryTo}
                      className="inline-flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-semibold text-xs sm:text-sm lg:text-base shadow-lg sm:shadow-xl shadow-amber-900/60 hover:from-amber-300 hover:to-amber-400 hover:shadow-xl sm:hover:shadow-2xl hover:-translate-y-0.5 transform transition-all"
                    >
                      {activeSlide.primaryCta}
                    </Link>
                    <Link
                      to={activeSlide.secondaryTo}
                      className="inline-flex items-center justify-center px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl border sm:border-2 border-teal-300/70 text-teal-50 font-semibold text-xs sm:text-sm lg:text-base hover:bg-teal-900/40 hover:border-teal-200 transition-all"
                    >
                      {activeSlide.secondaryCta}
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-[9px] sm:text-xs lg:text-sm">
                    <div className="bg-teal-900/30 rounded sm:rounded-lg p-1 sm:p-2 border border-teal-700/40">
                      <div className="font-semibold text-teal-200 text-[10px] sm:text-xs">Escrow</div>
                      <div className="text-teal-300/80 text-[8px] sm:text-[10px] lg:text-xs leading-tight">
                        <span className="hidden sm:inline">Funds held until you confirm</span>
                        <span className="sm:hidden">Funds held</span>
                      </div>
                    </div>
                    <div className="bg-emerald-900/30 rounded sm:rounded-lg p-1 sm:p-2 border border-emerald-700/40">
                      <div className="font-semibold text-emerald-200 text-[10px] sm:text-xs">
                        Verified
                      </div>
                      <div className="text-emerald-300/80 text-[8px] sm:text-[10px] lg:text-xs leading-tight">
                        <span className="hidden sm:inline">ID‑verified African vendors</span>
                        <span className="sm:hidden">ID-verified</span>
                      </div>
                    </div>
                    <div className="bg-amber-900/30 rounded sm:rounded-lg p-1 sm:p-2 border border-amber-700/40">
                      <div className="font-semibold text-amber-200 text-[10px] sm:text-xs">
                        Protection
                      </div>
                      <div className="text-amber-300/80 text-[8px] sm:text-[10px] lg:text-xs leading-tight">
                        <span className="hidden sm:inline">Disputes handled fairly</span>
                        <span className="sm:hidden">Disputes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dots */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  {heroSlides.map((slide, index) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setCurrentIndex(index)}
                      className={`h-2.5 rounded-full transition-all ${
                        index === currentIndex
                          ? `w-8 ${
                              index === 0
                                ? "bg-teal-400"
                                : index === 1
                                  ? "bg-emerald-400"
                                  : "bg-amber-400"
                            }`
                          : `w-2.5 ${
                              index === 0
                                ? "bg-teal-400/40 hover:bg-teal-300/70"
                                : index === 1
                                  ? "bg-emerald-400/40 hover:bg-emerald-300/70"
                                  : "bg-amber-400/40 hover:bg-amber-300/70"
                            }`
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right info column */}
            <aside className="flex flex-col gap-4">
            <div className="flex-1 rounded-2xl bg-gradient-to-br from-slate-900/90 to-teal-900/20 border border-teal-700/70 shadow-xl p-4 flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide flex items-center gap-2">
                  <span className="text-teal-400">🛡️</span>
                  Why Ojawa is safer
                </p>
                <p className="text-sm text-teal-50/90">
                  Payments are held in escrow, vendors are verified, and every
                  order includes dispute protection.
                </p>
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                <li className="text-teal-200/85 flex items-center gap-2">
                  <span className="text-amber-400">✓</span> Secure wallet and
                  escrow holding
                </li>
                <li className="text-emerald-200/85 flex items-center gap-2">
                  <span className="text-amber-400">✓</span> Verified Black
                  African vendors and stores
                </li>
                <li className="text-teal-200/85 flex items-center gap-2">
                  <span className="text-amber-400">✓</span> Transparent dispute
                  resolution
                </li>
              </ul>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-amber-500/90 via-teal-500/90 to-emerald-500/90 shadow-xl p-4 text-slate-950 border border-amber-300/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-900">
                New to Ojawa?
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">
                Create your free account and experience secure shopping across
                Africa.
              </p>
              {!currentUser && (
                <Link
                  to="/register"
                  className="inline-flex mt-3 items-center justify-center px-4 py-2.5 rounded-xl bg-slate-950 text-amber-100 text-xs font-semibold hover:bg-slate-900 transition-colors border border-amber-400/30"
                >
                  Join Ojawa securely
                </Link>
              )}
            </div>
          </aside>
          </div>
        </div>
      </section>

      <div
        id="home-filter-results"
        ref={filteredResultsRef}
        className="h-0"
        aria-hidden="true"
      />

      {/* Flash Sales Section */}
      {flashSaleProducts.length > 0 && (
        <section className="bg-gradient-to-r from-teal-600 via-emerald-600 to-amber-600 py-6 relative overflow-hidden border-y-2 border-amber-400/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <motion.h2
                  className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <span className="text-amber-300">⚡</span>
                  <span className="bg-gradient-to-r from-white via-amber-100 to-white bg-clip-text text-transparent">
                    Flash Sales
                  </span>
                </motion.h2>
                <CountdownTimer targetDate={flashSaleEndTime} />
              </div>
              <Link
                to="/products?sale=true"
                className="ojawa-pill ojawa-pill--glow flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-sm text-sm font-semibold hover:translate-y-[-1px]"
              >
                See All
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Flash Sale Products Carousel */}
      {flashSaleProducts.length > 0 && (
        <section className="bg-slate-950 py-10 border-t border-emerald-900/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ProductCarousel
              products={getFilteredProducts(flashSaleProducts)}
              showDiscount={true}
              showItemsLeft={true}
              autoScroll={true}
              scrollInterval={5000}
              className="text-white"
            />
          </div>
        </section>
      )}

      {/* Promotional Banner - Deals of the Day */}
      <section className="bg-gradient-to-r from-slate-900 via-teal-900/40 via-emerald-900/40 to-slate-900 py-8 border-y-2 border-amber-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-2 bg-gradient-to-r from-teal-300 via-amber-300 to-emerald-300 bg-clip-text text-transparent">
                Deals of the Day
              </h2>
              <p className="text-teal-200/80 text-sm md:text-base flex items-center gap-2">
                <span className="text-amber-400">🔒</span>
                Secure shopping with escrow protection
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch gap-4 w-full lg:w-auto">
              {/* Animated promo flash bar (simulated short video) */}
              <motion.div
                className="flex-1 rounded-2xl overflow-hidden bg-slate-950 border border-teal-900/70 shadow-2xl relative"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.2),transparent),radial-gradient(circle_at_bottom,_rgba(251,191,36,0.18),transparent)] animate-pulse" />
                <div className="relative flex items-center gap-4 px-4 py-3">
                  <div className="w-14 h-14 rounded-xl bg-slate-900 border border-amber-400/60 flex items-center justify-center overflow-hidden relative">
                    {/* Animated video-like content with multiple moving layers */}
                    <div className="absolute inset-0">
                      {/* Background gradient animation */}
                      <div className="absolute inset-0 bg-[linear-gradient(120deg,#0f172a,#0d9488,#22c55e,#fbbf24,#0f172a)] bg-[length:200%_200%] animate-[gradientShift_4s_ease-in-out_infinite]" />
                      {/* Moving elements to simulate video content */}
                      <motion.div
                        className="absolute inset-0"
                        animate={{
                          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        style={{
                          backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(13,148,136,0.6) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(251,191,36,0.5) 0%, transparent 50%)',
                          backgroundSize: '200% 200%',
                        }}
                      />
                      {/* Floating particles effect */}
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 rounded-full bg-amber-400/40"
                          animate={{
                            x: [0, 50, 0],
                            y: [0, 30, 0],
                            opacity: [0.3, 0.8, 0.3],
                            scale: [0.5, 1.2, 0.5],
                          }}
                          transition={{
                            duration: 2 + i * 0.5,
                            repeat: Infinity,
                            delay: i * 0.3,
                            ease: 'easeInOut',
                          }}
                          style={{
                            left: `${20 + i * 30}%`,
                            top: `${30 + i * 20}%`,
                          }}
                        />
                      ))}
                    </div>
                    {/* Subtle play indicator (smaller, less prominent) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <motion.div
                        className="w-5 h-5 rounded-full bg-slate-950/60 backdrop-blur-sm flex items-center justify-center border border-amber-300/50"
                        animate={{ opacity: [0.4, 0.7, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <span className="ml-0.5 border-l-5 border-y-[4px] border-l-amber-300 border-y-transparent" />
                      </motion.div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
                      15s Promo • Ojawa Escrow
                    </p>
                    <p className="text-sm text-teal-50">
                      Watch how your money stays protected until your order is
                      delivered.
                    </p>
                  </div>
                </div>
              </motion.div>

              <Link
                to="/products?sale=true"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-semibold hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg hover:shadow-xl border border-amber-300/50"
              >
                See All Deals
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Top Sellers Section */}
      {topSellers.length > 0 && (
        <section className="py-12 bg-slate-900 border-b-2 border-teal-800/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">
                Top Sellers
              </h2>
              <Link
                to="/products"
                className="text-amber-300 hover:text-amber-200 font-medium text-sm md:text-base flex items-center gap-1 border border-amber-500/30 px-3 py-1 rounded-lg hover:bg-amber-900/20 transition-all"
              >
                See All
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
            <ProductCarousel
              products={topSellers}
              showDiscount={true}
              autoScroll={true}
              scrollInterval={5000}
              className="text-white"
            />
          </div>
        </section>
      )}

      {/* Phones & Accessories Section */}
      {categoryProducts.phones && categoryProducts.phones.length > 0 && (
        <section className="py-12 bg-slate-950 border-b-2 border-emerald-800/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                Phones & Accessories
              </h2>
              <Link
                to="/products?category=phones"
                className="text-teal-300 hover:text-teal-200 font-medium text-sm md:text-base flex items-center gap-1 border border-teal-500/30 px-3 py-1 rounded-lg hover:bg-teal-900/20 transition-all"
              >
                See All
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
            <ProductCarousel
              products={getFilteredProducts(categoryProducts.phones || [])}
              showDiscount={true}
              autoScroll={true}
              scrollInterval={5000}
              className="text-white"
            />
          </div>
        </section>
      )}

      {/* Fashion Deals Section */}
      {categoryProducts.fashion && categoryProducts.fashion.length > 0 && (
        <section className="py-12 bg-slate-900 border-b-2 border-amber-800/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-300 to-teal-300 bg-clip-text text-transparent">
                Fashion Deals
              </h2>
              <Link
                to="/products?category=fashion"
                className="text-amber-300 hover:text-amber-200 font-medium text-sm md:text-base flex items-center gap-1 border border-amber-500/30 px-3 py-1 rounded-lg hover:bg-amber-900/20 transition-all"
              >
                See All
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
            <ProductCarousel
              products={getFilteredProducts(categoryProducts.fashion || [])}
              showDiscount={true}
              autoScroll={true}
              scrollInterval={5000}
              className="text-white"
            />
          </div>
        </section>
      )}

      {/* Dynamic Promo Flash Bar between categories */}
      <section className="bg-slate-950 py-8 border-y border-teal-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              className="col-span-1 md:col-span-2 rounded-2xl overflow-hidden bg-slate-900 border border-teal-800/70 shadow-2xl relative"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
            >
              {/* Simulated looping promo strip */}
              <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(13,148,136,0.2),rgba(251,191,36,0.2),rgba(16,185,129,0.15))] bg-[length:200%_200%] animate-[pulseSoft_6s_ease-in-out_infinite]" />
              <div className="relative flex flex-col sm:flex-row items-center gap-4 px-4 py-4">
                <div className="w-20 h-14 rounded-xl bg-slate-950 border border-amber-400/60 flex items-center justify-center overflow-hidden relative">
                  {/* Animated video-like content with multiple moving layers */}
                  <div className="absolute inset-0">
                    {/* Background gradient animation */}
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,#0f172a,#0d9488,#22c55e,#fbbf24,#0f172a)] bg-[length:220%_220%] animate-[gradientShift_5s_ease-in-out_infinite]" />
                    {/* Moving elements to simulate video content */}
                    <motion.div
                      className="absolute inset-0"
                      animate={{
                        backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
                      }}
                      transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      style={{
                        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(13,148,136,0.7) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(251,191,36,0.6) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(34,197,94,0.4) 0%, transparent 60%)',
                        backgroundSize: '250% 250%',
                      }}
                    />
                    {/* Floating particles effect */}
                    {[...Array(4)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-teal-400/50"
                        animate={{
                          x: [0, 60, 0],
                          y: [0, 40, 0],
                          opacity: [0.2, 0.9, 0.2],
                          scale: [0.4, 1.5, 0.4],
                        }}
                        transition={{
                          duration: 2.5 + i * 0.4,
                          repeat: Infinity,
                          delay: i * 0.25,
                          ease: 'easeInOut',
                        }}
                        style={{
                          left: `${15 + i * 25}%`,
                          top: `${20 + i * 25}%`,
                        }}
                      />
                    ))}
                    {/* Moving lines effect */}
                    <motion.div
                      className="absolute inset-0"
                      animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      style={{
                        backgroundImage: 'linear-gradient(45deg, transparent 30%, rgba(251,191,36,0.2) 50%, transparent 70%)',
                        backgroundSize: '200% 200%',
                      }}
                    />
                  </div>
                  {/* Subtle play indicator (smaller, less prominent) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.div
                      className="w-6 h-6 rounded-full bg-slate-950/60 backdrop-blur-sm flex items-center justify-center border border-amber-300/50"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    >
                      <span className="ml-0.5 border-l-6 border-y-[5px] border-l-amber-300 border-y-transparent" />
                    </motion.div>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
                    10s Vendor Spotlight
                  </p>
                  <p className="text-sm text-teal-50">
                    See how verified Black African vendors grow their business
                    securely on Ojawa.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="rounded-2xl bg-slate-900 border border-emerald-800/70 p-4 flex flex-col justify-between"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wide mb-1">
                Logistics in Motion
              </p>
              <p className="text-sm text-teal-50">
                Short animated guide showing how Ojawa logistics tracks your
                parcel from pickup to delivery.
              </p>
              <Link
                to="/tracking"
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-amber-300 hover:text-amber-200"
              >
                Watch & Track
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Electronics / TV & Audio Section */}
      {categoryProducts.electronics &&
        categoryProducts.electronics.length > 0 && (
          <section className="py-12 bg-slate-950 border-b-2 border-teal-800/40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-teal-300 to-emerald-300 bg-clip-text text-transparent">
                  TV & Audio
                </h2>
                <Link
                  to="/products?category=electronics"
                  className="text-teal-300 hover:text-teal-200 font-medium text-sm md:text-base flex items-center gap-1 border border-teal-500/30 px-3 py-1 rounded-lg hover:bg-teal-900/20 transition-all"
                >
                  See All
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
              <ProductCarousel
                products={getFilteredProducts(categoryProducts.electronics || [])}
                showDiscount={true}
                autoScroll={true}
                scrollInterval={5000}
                className="text-white"
              />
            </div>
          </section>
        )}

      {/* Beauty Deals Section */}
      {categoryProducts.beauty && categoryProducts.beauty.length > 0 && (
        <section className="py-12 bg-slate-900 border-b-2 border-amber-800/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
                Beauty Deals
              </h2>
              <Link
                to="/products?category=beauty"
                className="text-amber-300 hover:text-amber-200 font-medium text-sm md:text-base flex items-center gap-1 border border-amber-500/30 px-3 py-1 rounded-lg hover:bg-amber-900/20 transition-all"
              >
                See All
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
            <ProductCarousel
              products={getFilteredProducts(categoryProducts.beauty || [])}
              showDiscount={true}
              autoScroll={true}
              scrollInterval={5000}
              className="text-white"
            />
          </div>
        </section>
      )}

      {/* Appliances Deals Section */}
      {categoryProducts.appliances &&
        categoryProducts.appliances.length > 0 && (
          <section className="py-12 bg-slate-950 border-b-2 border-emerald-800/40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                  Appliances Deals
                </h2>
                <Link
                  to="/products?category=appliances"
                  className="text-emerald-300 hover:text-emerald-200 font-medium text-sm md:text-base flex items-center gap-1 border border-emerald-500/30 px-3 py-1 rounded-lg hover:bg-emerald-900/20 transition-all"
                >
                  See All
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
              <ProductCarousel
                products={getFilteredProducts(categoryProducts.appliances || [])}
                showDiscount={true}
                autoScroll={true}
                scrollInterval={5000}
                className="text-white"
              />
            </div>
          </section>
        )}

      {/* Computing / Mobile Accessories Section */}
      {categoryProducts.computing && categoryProducts.computing.length > 0 && (
        <section className="py-12 bg-slate-900 border-b-2 border-teal-800/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-teal-300 via-amber-300 to-emerald-300 bg-clip-text text-transparent">
                Computing Deals
              </h2>
              <Link
                to="/products?category=computing"
                className="text-teal-300 hover:text-teal-200 font-medium text-sm md:text-base flex items-center gap-1 border border-teal-500/30 px-3 py-1 rounded-lg hover:bg-teal-900/20 transition-all"
              >
                See All
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
            <ProductCarousel
              products={getFilteredProducts(categoryProducts.computing || [])}
              showDiscount={true}
              autoScroll={true}
              scrollInterval={5000}
              className="text-white"
            />
          </div>
        </section>
      )}

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

export default HomeOjawa;
