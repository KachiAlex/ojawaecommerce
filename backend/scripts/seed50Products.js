const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const FALLBACK_DATABASE_URL = 'postgresql://neondb_owner:npg_Da79GjxwVoIM@ep-flat-surf-ap5wq3vs-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'null' || process.env.DATABASE_URL === 'undefined') {
  process.env.DATABASE_URL = FALLBACK_DATABASE_URL;
}

const { sequelize } = require('../config/database');
const UserDef = require('../models/User');
const VendorDef = require('../models/Vendor');
const ProductDef = require('../models/Product');
const User = UserDef.init(sequelize);
const Vendor = VendorDef.init(sequelize);
const Product = ProductDef.init(sequelize);

const MOCK_VENDOR = {
  email: 'mockvendor@ojawa.com',
  password: 'MockVendor123!',
  firstName: 'Mock',
  lastName: 'Vendor',
  storeName: 'Ojawa Demo Store',
  phone: '+2348001234567',
  description: 'Demo vendor store for product seeding.'
};

const IMAGES = {
  electronics: ['1517336714731-489689fd1ca8','1496181133206-80ce9b88a853','1511707171634-5f897ff02aa9','1505740420928-5e560c06d30e','1544244015-0df4b3d15e1f','1587829741301-dac430f389e7','1527864556-7f3b5e0c6e6d','1597872208105-2f0f4a700000','1550751827-4bd3f4f0e5a1','1593642632829-5a0e2f6b5f14'],
  kitchen: ['1556909115-6c5e5e5e5e5c','1495474472287-0a0a0a0a0a0a','1563206767-5e1b0e5e5f5c','1579632384302-0a2d0e281826','1588421357574-87938a5380a'],
  utility: ['1558317374-067fb5f30001','1547394765-0e27f3e7c8f7','1518770660439-4636190f1b95','1523206485973-5d1d3372743c','1535378437323-27168482b3b6']
};

const imgUrl = (id) => 'https://images.unsplash.com/photo-' + id + '?w=600&auto=format&fit=crop&q=80';

const ALL_PRODUCTS = [
  {
    "name": "Apple MacBook Air M3 13\"",
    "description": "Ultra-thin laptop with M3 chip, 18h battery, Liquid Retina.",
    "price": 1299,
    "stockQuantity": 25,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Apple",
      "chip": "M3",
      "ram": "16GB",
      "storage": "512GB SSD",
      "display": "13.6\"",
      "battery": "18h",
      "sku": "IT-MBA-M3-01"
    },
    "status": "approved"
  },
  {
    "name": "iPhone 15 Pro Max 256GB",
    "description": "Titanium design, A17 Pro, 48MP camera, Dynamic Island.",
    "price": 1199,
    "stockQuantity": 40,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Apple",
      "chip": "A17 Pro",
      "storage": "256GB",
      "camera": "48MP",
      "display": "6.7\"",
      "sku": "IT-IPH-15PM-02"
    },
    "status": "approved"
  },
  {
    "name": "Samsung Galaxy S24 Ultra 512GB",
    "description": "200MP camera, S Pen, Galaxy AI, SD8Gen3.",
    "price": 1299.99,
    "stockQuantity": 35,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Samsung",
      "storage": "512GB",
      "camera": "200MP",
      "display": "6.8\"",
      "sku": "IT-SAM-S24U-03"
    },
    "status": "approved"
  },
  {
    "name": "Sony WH-1000XM5 Headphones",
    "description": "Industry-leading ANC, 30h battery, crystal-clear calls.",
    "price": 399.99,
    "stockQuantity": 60,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Sony",
      "driver": "30mm",
      "anc": "Yes",
      "battery": "30h",
      "sku": "IT-SON-WH5-04"
    },
    "status": "approved"
  },
  {
    "name": "AirPods Pro 2nd Gen USB-C",
    "description": "Adaptive Audio, Transparency, 6h listening with ANC.",
    "price": 249,
    "stockQuantity": 80,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1544244015-0df4b3d15e1f?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1544244015-0df4b3d15e1f?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Apple",
      "chip": "H2",
      "anc": "Adaptive",
      "battery": "6h",
      "sku": "IT-AIR-PRO2-05"
    },
    "status": "approved"
  },
  {
    "name": "iPad Air M2 11\" 128GB",
    "description": "M2 chip, Liquid Retina, Apple Pencil Pro support.",
    "price": 599,
    "stockQuantity": 30,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1587829741301-dac430f389e7?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1587829741301-dac430f389e7?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Apple",
      "chip": "M2",
      "storage": "128GB",
      "display": "11\"",
      "sku": "IT-IPA-M2-06"
    },
    "status": "approved"
  },
  {
    "name": "Galaxy Tab S9 Ultra 256GB",
    "description": "14.6\" AMOLED 2X, SD8Gen2, IP68, 11200mAh.",
    "price": 1199.99,
    "stockQuantity": 20,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1527864556-7f3b5e0c6e6d?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1527864556-7f3b5e0c6e6d?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Samsung",
      "storage": "256GB",
      "display": "14.6\"",
      "sku": "IT-SAM-TAB9-07"
    },
    "status": "approved"
  },
  {
    "name": "Logitech MX Master 3S Mouse",
    "description": "MagSpeed scroll, 8000 DPI, ultra-quiet clicks.",
    "price": 99.99,
    "stockQuantity": 100,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1597872208105-2f0f4a700000?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1597872208105-2f0f4a700000?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Logitech",
      "dpi": "8000",
      "battery": "70 days",
      "sku": "IT-LOG-MX3S-08"
    },
    "status": "approved"
  },
  {
    "name": "Keychron Q1 Pro Keyboard",
    "description": "Wireless custom mech, QMK/VIA, hot-swappable.",
    "price": 199,
    "stockQuantity": 45,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1550751827-4bd3f4f0e5a1?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1550751827-4bd3f4f0e5a1?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Keychron",
      "layout": "75%",
      "switches": "Hot-swap",
      "sku": "IT-KEY-Q1P-09"
    },
    "status": "approved"
  },
  {
    "name": "Dell UltraSharp U2723QE 27\" 4K",
    "description": "4K USB-C hub monitor, IPS Black, 2000:1 contrast.",
    "price": 679.99,
    "stockQuantity": 18,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1593642632829-5a0e2f6b5f14?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1593642632829-5a0e2f6b5f14?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Dell",
      "size": "27\"",
      "resolution": "4K",
      "panel": "IPS Black",
      "sku": "IT-DEL-4K27-10"
    },
    "status": "approved"
  },
  {
    "name": "LG 34WN80C-B UltraWide 34\"",
    "description": "WQHD curved UltraWide, USB-C, HDR10, 99% sRGB.",
    "price": 449.99,
    "stockQuantity": 22,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "LG",
      "size": "34\"",
      "resolution": "3440x1440",
      "sku": "IT-LG-UW34-11"
    },
    "status": "approved"
  },
  {
    "name": "Anker 737 PowerCore 24K",
    "description": "24000mAh, 140W bi-directional, smart display.",
    "price": 109.99,
    "stockQuantity": 70,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Anker",
      "capacity": "24000mAh",
      "output": "140W",
      "sku": "IT-ANK-24K-12"
    },
    "status": "approved"
  },
  {
    "name": "Elgato Stream Deck MK.2",
    "description": "15 LCD keys, unlimited actions for streaming/workflow.",
    "price": 149.99,
    "stockQuantity": 55,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Elgato",
      "keys": "15",
      "connection": "USB-C",
      "sku": "IT-ELG-SDM2-13"
    },
    "status": "approved"
  },
  {
    "name": "Samsung T9 Portable SSD 2TB",
    "description": "2TB portable SSD, 2000 MB/s, USB 3.2 Gen 2x2.",
    "price": 239.99,
    "stockQuantity": 40,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Samsung",
      "capacity": "2TB",
      "speed": "2000 MB/s",
      "sku": "IT-SAM-T9-14"
    },
    "status": "approved"
  },
  {
    "name": "Raspberry Pi 5 8GB RAM",
    "description": "2.4GHz quad-core A76, PCIe 2.0, dual 4K display.",
    "price": 79.99,
    "stockQuantity": 90,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1544244015-0df4b3d15e1f?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1544244015-0df4b3d15e1f?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Raspberry Pi",
      "cpu": "2.4GHz A76",
      "ram": "8GB",
      "sku": "IT-RPI-5-8G-15"
    },
    "status": "approved"
  },
  {
    "name": "DJI Mini 4 Pro Drone",
    "description": "249g, 4K/60fps HDR, omnidirectional sensing, 34min.",
    "price": 999,
    "stockQuantity": 15,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1587829741301-dac430f389e7?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1587829741301-dac430f389e7?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "DJI",
      "weight": "249g",
      "camera": "4K60 HDR",
      "flight": "34min",
      "sku": "IT-DJI-M4P-16"
    },
    "status": "approved"
  },
  {
    "name": "GoPro HERO12 Black",
    "description": "5.3K60, HyperSmooth 6.0, 177 FOV, waterproof 10m.",
    "price": 399.99,
    "stockQuantity": 30,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1527864556-7f3b5e0c6e6d?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1527864556-7f3b5e0c6e6d?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "GoPro",
      "video": "5.3K60",
      "stabilization": "HyperSmooth 6",
      "sku": "IT-GPR-H12-17"
    },
    "status": "approved"
  },
  {
    "name": "Apple Watch Series 9 45mm GPS",
    "description": "S9 SiP, double-tap, 2000 nits, Blood Oxygen/ECG.",
    "price": 429,
    "stockQuantity": 45,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1597872208105-2f0f4a700000?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1597872208105-2f0f4a700000?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Apple",
      "size": "45mm",
      "chip": "S9",
      "display": "2000 nits",
      "sku": "IT-AWS-S9-18"
    },
    "status": "approved"
  },
  {
    "name": "Galaxy Watch 6 Classic 47mm",
    "description": "Rotating bezel, body composition, sleep coaching.",
    "price": 399.99,
    "stockQuantity": 35,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1550751827-4bd3f4f0e5a1?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1550751827-4bd3f4f0e5a1?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Samsung",
      "size": "47mm",
      "bezel": "Rotating",
      "sku": "IT-SAM-GW6C-19"
    },
    "status": "approved"
  },
  {
    "name": "Sony Alpha 7 IV Camera",
    "description": "33MP full-frame, 4K60p, real-time Eye AF, 5-axis IBIS.",
    "price": 2498,
    "stockQuantity": 12,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1593642632829-5a0e2f6b5f14?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1593642632829-5a0e2f6b5f14?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Sony",
      "sensor": "33MP",
      "video": "4K60",
      "sku": "IT-SON-A7IV-20"
    },
    "status": "approved"
  },
  {
    "name": "Canon EOS R6 Mark II",
    "description": "24.2MP full-frame, 40fps e-shutter, 4K60p.",
    "price": 2499,
    "stockQuantity": 10,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Canon",
      "sensor": "24.2MP",
      "shutter": "40fps",
      "sku": "IT-CAN-R6M2-21"
    },
    "status": "approved"
  },
  {
    "name": "NVIDIA GeForce RTX 4080 SUPER",
    "description": "16GB GDDR6X, DLSS 3.5, 3rd gen ray tracing.",
    "price": 999.99,
    "stockQuantity": 8,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "NVIDIA",
      "vram": "16GB",
      "dlss": "3.5",
      "sku": "IT-NVI-4080S-22"
    },
    "status": "approved"
  },
  {
    "name": "AMD Ryzen 9 7950X3D",
    "description": "16-core/32-thread, 128MB 3D V-Cache, AM5.",
    "price": 599.99,
    "stockQuantity": 20,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "AMD",
      "cores": "16",
      "threads": "32",
      "cache": "128MB",
      "sku": "IT-AMD-7950X3D-23"
    },
    "status": "approved"
  },
  {
    "name": "Corsair Vengeance DDR5 64GB Kit",
    "description": "DDR5-5600, 64GB (2x32GB), Intel XMP 3.0.",
    "price": 249.99,
    "stockQuantity": 40,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Corsair",
      "type": "DDR5",
      "speed": "5600MHz",
      "capacity": "64GB",
      "sku": "IT-COR-DDR5-64-24"
    },
    "status": "approved"
  },
  {
    "name": "TP-Link Deco X90 Wi-Fi 6E Mesh",
    "description": "Tri-band 6.6Gbps, AI mesh, 8500 sq ft coverage.",
    "price": 499.99,
    "stockQuantity": 25,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1544244015-0df4b3d15e1f?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1544244015-0df4b3d15e1f?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "TP-Link",
      "standard": "Wi-Fi 6E",
      "speed": "6.6Gbps",
      "sku": "IT-TPL-X90-25"
    },
    "status": "approved"
  },
  {
    "name": "Synology DS923+ NAS",
    "description": "4-bay, AMD Ryzen R1600, 10GbE add-on, dual M.2.",
    "price": 599.99,
    "stockQuantity": 15,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1587829741301-dac430f389e7?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1587829741301-dac430f389e7?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Synology",
      "bays": "4",
      "cpu": "Ryzen R1600",
      "sku": "IT-SYN-DS923-26"
    },
    "status": "approved"
  },
  {
    "name": "Sonos Era 300 Speaker",
    "description": "Spatial audio, Dolby Atmos, 6 drivers, AirPlay 2.",
    "price": 449,
    "stockQuantity": 30,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1527864556-7f3b5e0c6e6d?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1527864556-7f3b5e0c6e6d?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Sonos",
      "audio": "Dolby Atmos",
      "drivers": "6",
      "sku": "IT-SON-ERA300-27"
    },
    "status": "approved"
  },
  {
    "name": "JBL Charge 5 Speaker",
    "description": "IP67 waterproof, 20h battery, 40W, 7500mAh powerbank.",
    "price": 179.95,
    "stockQuantity": 50,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1597872208105-2f0f4a700000?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1597872208105-2f0f4a700000?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "JBL",
      "waterproof": "IP67",
      "battery": "20h",
      "sku": "IT-JBL-CH5-28"
    },
    "status": "approved"
  },
  {
    "name": "Steam Deck OLED 512GB",
    "description": "7.4\" OLED 90Hz, 50Wh, AMD Zen 2 + RDNA 2 APU.",
    "price": 549,
    "stockQuantity": 22,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1550751827-4bd3f4f0e5a1?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1550751827-4bd3f4f0e5a1?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Valve",
      "display": "7.4\" OLED",
      "storage": "512GB",
      "sku": "IT-VAL-SDOLED-29"
    },
    "status": "approved"
  },
  {
    "name": "ASUS ROG Ally X 1TB",
    "description": "7\" 120Hz IPS, AMD Z1 Extreme, 24GB RAM, 80Wh.",
    "price": 799.99,
    "stockQuantity": 18,
    "category": "electronics",
    "images": [
      "https://images.unsplash.com/photo-1593642632829-5a0e2f6b5f14?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1593642632829-5a0e2f6b5f14?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "ASUS",
      "display": "7\" 120Hz",
      "ram": "24GB",
      "storage": "1TB",
      "sku": "IT-ASU-ALLYX-30"
    },
    "status": "approved"
  },
  {
    "name": "Ninja Foodi 10-in-1 Pressure Cooker",
    "description": "Pressure cook, air fry, bake, roast, dehydrate.",
    "price": 199.99,
    "stockQuantity": 40,
    "category": "kitchen",
    "images": [
      "https://images.unsplash.com/photo-1556909115-6c5e5e5e5e5c?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1556909115-6c5e5e5e5e5c?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Ninja",
      "functions": "10-in-1",
      "power": "1460W",
      "capacity": "8 qt",
      "sku": "KN-NF-10IN1-01"
    },
    "status": "approved"
  },
  {
    "name": "Breville Barista Express Espresso",
    "description": "Built-in conical burr grinder, steam wand, 15 bar.",
    "price": 699.95,
    "stockQuantity": 15,
    "category": "kitchen",
    "images": [
      "https://images.unsplash.com/photo-1495474472287-0a0a0a0a0a0a?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1495474472287-0a0a0a0a0a0a?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Breville",
      "power": "1600W",
      "grinder": "Conical Burr",
      "sku": "KN-BRE-BES870-02"
    },
    "status": "approved"
  },
  {
    "name": "Le Creuset Dutch Oven 5.5qt",
    "description": "Enameled cast iron, braising, soups, sourdough.",
    "price": 379.95,
    "stockQuantity": 25,
    "category": "kitchen",
    "images": [
      "https://images.unsplash.com/photo-1563206767-5e1b0e5e5f5c?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1563206767-5e1b0e5e5f5c?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Le Creuset",
      "material": "Cast Iron",
      "capacity": "5.5 qt",
      "sku": "KN-LC-DO55-03"
    },
    "status": "approved"
  },
  {
    "name": "KitchenAid Artisan Stand Mixer",
    "description": "Planetary mixing, 10 speeds, attachment hub.",
    "price": 449.99,
    "stockQuantity": 20,
    "category": "kitchen",
    "images": [
      "https://images.unsplash.com/photo-1579632384302-0a2d0e281826?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1579632384302-0a2d0e281826?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "KitchenAid",
      "motor": "325W",
      "bowl": "5 qt",
      "speeds": "10",
      "sku": "KN-KA-ART-04"
    },
    "status": "approved"
  },
  {
    "name": "Vitamix A3500 Blender",
    "description": "5 programs, self-detect, touchscreen, 10yr warranty.",
    "price": 599.95,
    "stockQuantity": 18,
    "category": "kitchen",
    "images": [
      "https://images.unsplash.com/photo-1588421357574-87938a5380a?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1588421357574-87938a5380a?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Vitamix",
      "motor": "2.2 HP",
      "programs": "5",
      "sku": "KN-VIT-A3500-05"
    },
    "status": "approved"
  },
  {
    "name": "Cuisinart 14-Cup Food Processor",
    "description": "SS blades, dough blade, extra-large feed tube.",
    "price": 249.95,
    "stockQuantity": 30,
    "category": "kitchen",
    "images": [
      "https://images.unsplash.com/photo-1556909115-6c5e5e5e5e5c?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1556909115-6c5e5e5e5e5c?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Cuisinart",
      "capacity": "14 cups",
      "motor": "720W",
      "sku": "KN-CUI-FP14-06"
    },
    "status": "approved"
  },
  {
    "name": "Instant Pot Duo Plus 9-in-1 6qt",
    "description": "15 smart programs, pressure/slow/sous vide cook.",
    "price": 129.99,
    "stockQuantity": 50,
    "category": "kitchen",
    "images": [
      "https://images.unsplash.com/photo-1495474472287-0a0a0a0a0a0a?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1495474472287-0a0a0a0a0a0a?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Instant Pot",
      "functions": "9-in-1",
      "capacity": "6 qt",
      "sku": "KN-IP-DP6-07"
    },
    "status": "approved"
  },
  {
    "name": "All-Clad D3 Cookware Set 10pc",
    "description": "Tri-ply bonded SS, even heating, oven-safe 600F.",
    "price": 699.99,
    "stockQuantity": 12,
    "category": "kitchen",
    "images": [
      "https://images.unsplash.com/photo-1563206767-5e1b0e5e5f5c?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1563206767-5e1b0e5e5f5c?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "All-Clad",
      "pieces": "10",
      "material": "Tri-ply SS",
      "sku": "KN-AC-D3-10-08"
    },
    "status": "approved"
  },
  {
    "name": "Wusthof Classic 7-Piece Knife Set",
    "description": "Precision-forged high-carbon SS, full tang.",
    "price": 399.99,
    "stockQuantity": 22,
    "category": "kitchen",
    "images": [
      "https://images.unsplash.com/photo-1579632384302-0a2d0e281826?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1579632384302-0a2d0e281826?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Wusthof",
      "pieces": "7",
      "steel": "High-Carbon SS",
      "sku": "KN-WUS-7PC-09"
    },
    "status": "approved"
  },
  {
    "name": "Breville Smart Oven Air Fryer Pro",
    "description": "Element IQ, air fry, dehydrate, super convection.",
    "price": 449.95,
    "stockQuantity": 16,
    "category": "kitchen",
    "images": [
      "https://images.unsplash.com/photo-1588421357574-87938a5380a?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1588421357574-87938a5380a?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Breville",
      "capacity": "1 cu ft",
      "functions": "13",
      "sku": "KN-BRE-OVEN-10"
    },
    "status": "approved"
  },
  {
    "name": "Dyson V15 Detect Absolute Vacuum",
    "description": "Laser dust detection, 60min runtime, HEPA.",
    "price": 749.99,
    "stockQuantity": 20,
    "category": "utility",
    "images": [
      "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Dyson",
      "suction": "230 AW",
      "runtime": "60min",
      "filtration": "HEPA",
      "sku": "UT-DYS-V15-01"
    },
    "status": "approved"
  },
  {
    "name": "Roborock S8 Pro Ultra Robot Vac",
    "description": "6000Pa, sonic mop, self-empty/self-wash dock.",
    "price": 1599.99,
    "stockQuantity": 10,
    "category": "utility",
    "images": [
      "https://images.unsplash.com/photo-1547394765-0e27f3e7c8f7?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1547394765-0e27f3e7c8f7?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Roborock",
      "suction": "6000Pa",
      "dock": "Self-empty",
      "sku": "UT-ROB-S8PU-02"
    },
    "status": "approved"
  },
  {
    "name": "Philips Hue Starter Kit",
    "description": "3 color bulbs, bridge, 16M colors, Zigbee.",
    "price": 199.99,
    "stockQuantity": 35,
    "category": "utility",
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190f1b95?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1518770660439-4636190f1b95?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Philips Hue",
      "bulbs": "3",
      "colors": "16M",
      "sku": "UT-PHI-HUE-03"
    },
    "status": "approved"
  },
  {
    "name": "Ring Video Doorbell Pro 2",
    "description": "3D motion, head-to-toe video, Bird's Eye View.",
    "price": 259.99,
    "stockQuantity": 28,
    "category": "utility",
    "images": [
      "https://images.unsplash.com/photo-1523206485973-5d1d3372743c?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1523206485973-5d1d3372743c?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Ring",
      "video": "1536p",
      "fov": "Head-to-toe",
      "sku": "UT-RIN-VDP2-04"
    },
    "status": "approved"
  },
  {
    "name": "Coway Airmega 400S Purifier",
    "description": "HEPA + carbon, 1560 sq ft, app/voice control.",
    "price": 449,
    "stockQuantity": 18,
    "category": "utility",
    "images": [
      "https://images.unsplash.com/photo-1535378437323-27168482b3b6?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1535378437323-27168482b3b6?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Coway",
      "coverage": "1560 sq ft",
      "filter": "HEPA+Carbon",
      "sku": "UT-COW-AM400-05"
    },
    "status": "approved"
  },
  {
    "name": "Philips Sonicare 9900 Toothbrush",
    "description": "SenseIQ AI, 62000 strokes/min, premium case.",
    "price": 349.99,
    "stockQuantity": 40,
    "category": "utility",
    "images": [
      "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Philips",
      "strokes": "62000/min",
      "modes": "5",
      "sku": "UT-PHI-9900-06"
    },
    "status": "approved"
  },
  {
    "name": "Braun Series 9 Pro Shaver",
    "description": "5-in-1, Sonic/ProLift, Clean & Charge station.",
    "price": 329.99,
    "stockQuantity": 25,
    "category": "utility",
    "images": [
      "https://images.unsplash.com/photo-1547394765-0e27f3e7c8f7?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1547394765-0e27f3e7c8f7?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Braun",
      "elements": "5",
      "runtime": "60min",
      "sku": "UT-BRA-S9P-07"
    },
    "status": "approved"
  },
  {
    "name": "OXO 20-Piece Food Storage Set",
    "description": "BPA-free snap containers, leakproof, dishwasher safe.",
    "price": 59.99,
    "stockQuantity": 60,
    "category": "utility",
    "images": [
      "https://images.unsplash.com/photo-1518770660439-4636190f1b95?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1518770660439-4636190f1b95?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "OXO",
      "pieces": "20",
      "material": "BPA-free",
      "sku": "UT-OXO-20PC-08"
    },
    "status": "approved"
  },
  {
    "name": "Yeti Rambler 36oz Bottle",
    "description": "Double-wall vacuum insulated, leakproof cap.",
    "price": 49.99,
    "stockQuantity": 80,
    "category": "utility",
    "images": [
      "https://images.unsplash.com/photo-1523206485973-5d1d3372743c?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1523206485973-5d1d3372743c?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "YETI",
      "capacity": "36oz",
      "insulation": "Vacuum",
      "sku": "UT-YET-36OZ-09"
    },
    "status": "approved"
  },
  {
    "name": "Tile Mate Bluetooth Tracker (4-Pack)",
    "description": "250ft range, water-resistant, works with Alexa.",
    "price": 74.99,
    "stockQuantity": 50,
    "category": "utility",
    "images": [
      "https://images.unsplash.com/photo-1535378437323-27168482b3b6?w=600&auto=format&fit=crop&q=80"
    ],
    "thumbnail": "https://images.unsplash.com/photo-1535378437323-27168482b3b6?w=600&auto=format&fit=crop&q=80",
    "specifications": {
      "brand": "Tile",
      "range": "250ft",
      "pack": "4",
      "sku": "UT-TIL-MATE-10"
    },
    "status": "approved"
  }
];

async function ensureVendor() {
  const hash = await bcrypt.hash(MOCK_VENDOR.password, 12);
  const [user] = await User.findOrCreate({
    where: { email: MOCK_VENDOR.email },
    defaults: { id: uuidv4(), role: 'vendor', password: hash, firstName: MOCK_VENDOR.firstName, lastName: MOCK_VENDOR.lastName, phoneNumber: MOCK_VENDOR.phone, isEmailVerified: true }
  });
  if (user.role !== 'vendor') await user.update({ role: 'vendor' });
  await Vendor.findOrCreate({
    where: { userId: user.id },
    defaults: { storeName: MOCK_VENDOR.storeName, storeDescription: MOCK_VENDOR.description, businessEmail: MOCK_VENDOR.email, businessPhone: MOCK_VENDOR.phone, businessAddress: { street: '42 Market St', city: 'Lagos', country: 'Nigeria' }, isApproved: true, status: 'approved' }
  });
  return user.id;
}

async function seedProducts() {
  await sequelize.authenticate();
  const vendorId = await ensureVendor();
  let created = 0, skipped = 0;
  for (const p of ALL_PRODUCTS) {
    const existing = await Product.findOne({ where: { vendorId, name: p.name } });
    if (existing) { skipped++; continue; }
    await Product.create({ vendorId, ...p });
    created++;
  }
  console.log('Seeded ' + created + ' products (skipped ' + skipped + ' duplicates) for ' + MOCK_VENDOR.email);
}

if (require.main === module) {
  seedProducts()
    .then(() => { console.log('Done'); return sequelize.close(); })
    .catch(e => { console.error('Failed:', e); sequelize.close().finally(() => process.exit(1)); });
}
module.exports = { seedProducts };
