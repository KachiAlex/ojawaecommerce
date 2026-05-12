export const sampleProducts = [
  {
    name: 'Samsung Galaxy S24 Ultra',
    price: 1199.99,
    description: 'Latest flagship smartphone with advanced AI features, 200MP camera, and S Pen.',
    category: 'electronics',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400',
    brand: 'Samsung',
    inStock: true,
    stockQuantity: 50,
    rating: 4.8,
    reviewCount: 324,
    features: ['200MP Camera', 'S Pen', 'AI Features', '5G Ready'],
    specifications: {
      display: '6.8" Dynamic AMOLED 2X',
      processor: 'Snapdragon 8 Gen 3',
      storage: '256GB',
      ram: '12GB',
      battery: '5000mAh'
    }
  },
  {
    name: 'MacBook Pro 16-inch M3 Pro',
    price: 2499.99,
    description: 'Professional laptop with M3 Pro chip, perfect for creators and developers.',
    category: 'electronics',
    image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400',
    brand: 'Apple',
    inStock: true,
    stockQuantity: 25,
    rating: 4.9,
    reviewCount: 156,
    features: ['M3 Pro Chip', '16-inch Liquid Retina XDR', 'Up to 22-hour battery', '8GB GPU'],
    specifications: {
      processor: 'Apple M3 Pro',
      memory: '18GB Unified Memory',
      storage: '512GB SSD',
      display: '16.2-inch Liquid Retina XDR',
      ports: '3x Thunderbolt 4, HDMI, SDXC'
    }
  },
  {
    name: 'Nike Air Max 270',
    price: 150.00,
    description: 'Comfortable running shoes with Max Air cushioning for all-day comfort.',
    category: 'clothing',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    brand: 'Nike',
    inStock: true,
    stockQuantity: 100,
    rating: 4.5,
    reviewCount: 892,
    features: ['Max Air Cushioning', 'Breathable Mesh', 'Lightweight Design', 'Durable Rubber Outsole'],
    specifications: {
      material: 'Mesh and Synthetic',
      sole: 'Rubber',
      closure: 'Lace-up',
      weight: '300g',
      colors: ['Black/White', 'White/Black', 'Blue/White']
    }
  },
  {
    name: 'Levi\'s 501 Original Jeans',
    price: 89.99,
    description: 'Classic straight-fit jeans, the original blue jean that started it all.',
    category: 'clothing',
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
    brand: 'Levi\'s',
    inStock: true,
    stockQuantity: 75,
    rating: 4.6,
    reviewCount: 445,
    features: ['Original Straight Fit', '100% Cotton Denim', 'Classic 5-Pocket Design', 'Button Fly'],
    specifications: {
      material: '100% Cotton',
      fit: 'Straight',
      rise: 'Regular',
      leg: 'Straight',
      sizes: ['28-42']
    }
  },
  {
    name: 'KitchenAid Stand Mixer',
    price: 329.99,
    description: 'Professional-grade stand mixer with 5-quart stainless steel bowl.',
    category: 'home',
    image: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=600&q=80',
    brand: 'KitchenAid',
    inStock: true,
    stockQuantity: 30,
    rating: 4.7,
    reviewCount: 234,
    features: ['5-Quart Capacity', '10 Speeds', 'Dishwasher Safe Bowl', 'Multiple Attachments'],
    specifications: {
      capacity: '5 Quart',
      speeds: '10',
      power: '325W',
      bowl: 'Stainless Steel',
      attachments: ['Dough Hook', 'Flat Beater', 'Wire Whip']
    }
  },
  {
    name: 'Dyson V15 Detect Cordless Vacuum',
    price: 749.99,
    description: 'Advanced cordless vacuum with laser dust detection and powerful suction.',
    category: 'home',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    brand: 'Dyson',
    inStock: true,
    stockQuantity: 20,
    rating: 4.8,
    reviewCount: 189,
    features: ['Laser Dust Detection', '60-Minute Runtime', 'HEPA Filtration', 'LED Display'],
    specifications: {
      runtime: '60 minutes',
      filtration: 'HEPA',
      binCapacity: '0.77L',
      weight: '3kg',
      chargeTime: '4.5 hours'
    }
  },
  {
    name: 'Canon EOS R6 Mark II',
    price: 2499.99,
    description: 'Professional mirrorless camera with 24.2MP full-frame sensor and 4K video.',
    category: 'electronics',
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400',
    brand: 'Canon',
    inStock: true,
    stockQuantity: 15,
    rating: 4.9,
    reviewCount: 67,
    features: ['24.2MP Full-Frame Sensor', '4K Video Recording', 'In-Body Image Stabilization', 'Dual Pixel AF'],
    specifications: {
      sensor: '24.2MP Full-Frame CMOS',
      video: '4K 60p',
      iso: '100-102400',
      autofocus: 'Dual Pixel CMOS AF II',
      stabilization: 'In-Body Image Stabilization'
    }
  },
  {
    name: 'Adidas Ultraboost 22',
    price: 180.00,
    description: 'Premium running shoes with Boost midsole for maximum energy return.',
    category: 'clothing',
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400',
    brand: 'Adidas',
    inStock: true,
    stockQuantity: 80,
    rating: 4.4,
    reviewCount: 567,
    features: ['Boost Midsole', 'Primeknit Upper', 'Continental Rubber Outsole', 'Energy Return'],
    specifications: {
      material: 'Primeknit Upper',
      sole: 'Boost Midsole',
      closure: 'Lace-up',
      weight: '310g',
      drop: '10mm'
    }
  }
];

export const sampleCategories = [
  { name: 'Electronics', description: 'Smartphones, laptops, cameras, and more', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300' },
  { name: 'Clothing', description: 'Fashion, shoes, and accessories', image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300' },
  { name: 'Home', description: 'Appliances, furniture, and home essentials', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300' }
];
