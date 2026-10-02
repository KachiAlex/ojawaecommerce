const fs = require('fs');

const IMAGES = {
  electronics: [
    '1517336714731-489689fd1ca8', '1496181133206-80ce9b88a853', '1511707171634-5f897ff02aa9',
    '1505740420928-5e560c06d30e', '1544244015-0df4b3d15e1f', '1587829741301-dac430f389e7',
    '1527864556-7f3b5e0c6e6d', '1597872208105-2f0f4a700000', '1550751827-4bd3f4f0e5a1',
    '1593642632829-5a0e2f6b5f14'
  ],
  kitchen: [
    '1556909115-6c5e5e5e5e5c', '1495474472287-0a0a0a0a0a0a', '1563206767-5e1b0e5e5f5c',
    '1579632384302-0a2d0e281826', '1588421357574-87938a5380a'
  ],
  utility: [
    '1558317374-067fb5f30001', '1547394765-0e27f3e7c8f7', '1518770660439-4636190f1b95',
    '1523206485973-5d1d3372743c', '1535378437323-27168482b3b6'
  ]
};

const imgUrl = (id) => 'https://images.unsplash.com/photo-' + id + '?w=600&auto=format&fit=crop&q=80';

const IT = [
  ['Apple MacBook Air M3 13"', 'Ultra-thin laptop with M3 chip, 18h battery, Liquid Retina.', 1299.00, 25, { brand:'Apple',chip:'M3',ram:'16GB',storage:'512GB SSD',display:'13.6"',battery:'18h',sku:'IT-MBA-M3-01' }],
  ['iPhone 15 Pro Max 256GB', 'Titanium design, A17 Pro, 48MP camera, Dynamic Island.', 1199.00, 40, { brand:'Apple',chip:'A17 Pro',storage:'256GB',camera:'48MP',display:'6.7"',sku:'IT-IPH-15PM-02' }],
  ['Samsung Galaxy S24 Ultra 512GB', '200MP camera, S Pen, Galaxy AI, SD8Gen3.', 1299.99, 35, { brand:'Samsung',storage:'512GB',camera:'200MP',display:'6.8"',sku:'IT-SAM-S24U-03' }],
  ['Sony WH-1000XM5 Headphones', 'Industry-leading ANC, 30h battery, crystal-clear calls.', 399.99, 60, { brand:'Sony',driver:'30mm',anc:'Yes',battery:'30h',sku:'IT-SON-WH5-04' }],
  ['AirPods Pro 2nd Gen USB-C', 'Adaptive Audio, Transparency, 6h listening with ANC.', 249.00, 80, { brand:'Apple',chip:'H2',anc:'Adaptive',battery:'6h',sku:'IT-AIR-PRO2-05' }],
  ['iPad Air M2 11" 128GB', 'M2 chip, Liquid Retina, Apple Pencil Pro support.', 599.00, 30, { brand:'Apple',chip:'M2',storage:'128GB',display:'11"',sku:'IT-IPA-M2-06' }],
  ['Galaxy Tab S9 Ultra 256GB', '14.6" AMOLED 2X, SD8Gen2, IP68, 11200mAh.', 1199.99, 20, { brand:'Samsung',storage:'256GB',display:'14.6"',sku:'IT-SAM-TAB9-07' }],
  ['Logitech MX Master 3S Mouse', 'MagSpeed scroll, 8000 DPI, ultra-quiet clicks.', 99.99, 100, { brand:'Logitech',dpi:'8000',battery:'70 days',sku:'IT-LOG-MX3S-08' }],
  ['Keychron Q1 Pro Keyboard', 'Wireless custom mech, QMK/VIA, hot-swappable.', 199.00, 45, { brand:'Keychron',layout:'75%',switches:'Hot-swap',sku:'IT-KEY-Q1P-09' }],
  ['Dell UltraSharp U2723QE 27" 4K', '4K USB-C hub monitor, IPS Black, 2000:1 contrast.', 679.99, 18, { brand:'Dell',size:'27"',resolution:'4K',panel:'IPS Black',sku:'IT-DEL-4K27-10' }],
  ['LG 34WN80C-B UltraWide 34"', 'WQHD curved UltraWide, USB-C, HDR10, 99% sRGB.', 449.99, 22, { brand:'LG',size:'34"',resolution:'3440x1440',sku:'IT-LG-UW34-11' }],
  ['Anker 737 PowerCore 24K', '24000mAh, 140W bi-directional, smart display.', 109.99, 70, { brand:'Anker',capacity:'24000mAh',output:'140W',sku:'IT-ANK-24K-12' }],
  ['Elgato Stream Deck MK.2', '15 LCD keys, unlimited actions for streaming/workflow.', 149.99, 55, { brand:'Elgato',keys:'15',connection:'USB-C',sku:'IT-ELG-SDM2-13' }],
  ['Samsung T9 Portable SSD 2TB', '2TB portable SSD, 2000 MB/s, USB 3.2 Gen 2x2.', 239.99, 40, { brand:'Samsung',capacity:'2TB',speed:'2000 MB/s',sku:'IT-SAM-T9-14' }],
  ['Raspberry Pi 5 8GB RAM', '2.4GHz quad-core A76, PCIe 2.0, dual 4K display.', 79.99, 90, { brand:'Raspberry Pi',cpu:'2.4GHz A76',ram:'8GB',sku:'IT-RPI-5-8G-15' }],
  ['DJI Mini 4 Pro Drone', '249g, 4K/60fps HDR, omnidirectional sensing, 34min.', 999.00, 15, { brand:'DJI',weight:'249g',camera:'4K60 HDR',flight:'34min',sku:'IT-DJI-M4P-16' }],
  ['GoPro HERO12 Black', '5.3K60, HyperSmooth 6.0, 177 FOV, waterproof 10m.', 399.99, 30, { brand:'GoPro',video:'5.3K60',stabilization:'HyperSmooth 6',sku:'IT-GPR-H12-17' }],
  ['Apple Watch Series 9 45mm GPS', 'S9 SiP, double-tap, 2000 nits, Blood Oxygen/ECG.', 429.00, 45, { brand:'Apple',size:'45mm',chip:'S9',display:'2000 nits',sku:'IT-AWS-S9-18' }],
  ['Galaxy Watch 6 Classic 47mm', 'Rotating bezel, body composition, sleep coaching.', 399.99, 35, { brand:'Samsung',size:'47mm',bezel:'Rotating',sku:'IT-SAM-GW6C-19' }],
  ['Sony Alpha 7 IV Camera', '33MP full-frame, 4K60p, real-time Eye AF, 5-axis IBIS.', 2498.00, 12, { brand:'Sony',sensor:'33MP',video:'4K60',sku:'IT-SON-A7IV-20' }],
  ['Canon EOS R6 Mark II', '24.2MP full-frame, 40fps e-shutter, 4K60p.', 2499.00, 10, { brand:'Canon',sensor:'24.2MP',shutter:'40fps',sku:'IT-CAN-R6M2-21' }],
  ['NVIDIA GeForce RTX 4080 SUPER', '16GB GDDR6X, DLSS 3.5, 3rd gen ray tracing.', 999.99, 8, { brand:'NVIDIA',vram:'16GB',dlss:'3.5',sku:'IT-NVI-4080S-22' }],
  ['AMD Ryzen 9 7950X3D', '16-core/32-thread, 128MB 3D V-Cache, AM5.', 599.99, 20, { brand:'AMD',cores:'16',threads:'32',cache:'128MB',sku:'IT-AMD-7950X3D-23' }],
  ['Corsair Vengeance DDR5 64GB Kit', 'DDR5-5600, 64GB (2x32GB), Intel XMP 3.0.', 249.99, 40, { brand:'Corsair',type:'DDR5',speed:'5600MHz',capacity:'64GB',sku:'IT-COR-DDR5-64-24' }],
  ['TP-Link Deco X90 Wi-Fi 6E Mesh', 'Tri-band 6.6Gbps, AI mesh, 8500 sq ft coverage.', 499.99, 25, { brand:'TP-Link',standard:'Wi-Fi 6E',speed:'6.6Gbps',sku:'IT-TPL-X90-25' }],
  ['Synology DS923+ NAS', '4-bay, AMD Ryzen R1600, 10GbE add-on, dual M.2.', 599.99, 15, { brand:'Synology',bays:'4',cpu:'Ryzen R1600',sku:'IT-SYN-DS923-26' }],
  ['Sonos Era 300 Speaker', 'Spatial audio, Dolby Atmos, 6 drivers, AirPlay 2.', 449.00, 30, { brand:'Sonos',audio:'Dolby Atmos',drivers:'6',sku:'IT-SON-ERA300-27' }],
  ['JBL Charge 5 Speaker', 'IP67 waterproof, 20h battery, 40W, 7500mAh powerbank.', 179.95, 50, { brand:'JBL',waterproof:'IP67',battery:'20h',sku:'IT-JBL-CH5-28' }],
  ['Steam Deck OLED 512GB', '7.4" OLED 90Hz, 50Wh, AMD Zen 2 + RDNA 2 APU.', 549.00, 22, { brand:'Valve',display:'7.4" OLED',storage:'512GB',sku:'IT-VAL-SDOLED-29' }],
  ['ASUS ROG Ally X 1TB', '7" 120Hz IPS, AMD Z1 Extreme, 24GB RAM, 80Wh.', 799.99, 18, { brand:'ASUS',display:'7" 120Hz',ram:'24GB',storage:'1TB',sku:'IT-ASU-ALLYX-30' }],
];

const KITCHEN = [
  ['Ninja Foodi 10-in-1 Pressure Cooker', 'Pressure cook, air fry, bake, roast, dehydrate.', 199.99, 40, { brand:'Ninja',functions:'10-in-1',power:'1460W',capacity:'8 qt',sku:'KN-NF-10IN1-01' }],
  ['Breville Barista Express Espresso', 'Built-in conical burr grinder, steam wand, 15 bar.', 699.95, 15, { brand:'Breville',power:'1600W',grinder:'Conical Burr',sku:'KN-BRE-BES870-02' }],
  ['Le Creuset Dutch Oven 5.5qt', 'Enameled cast iron, braising, soups, sourdough.', 379.95, 25, { brand:'Le Creuset',material:'Cast Iron',capacity:'5.5 qt',sku:'KN-LC-DO55-03' }],
  ['KitchenAid Artisan Stand Mixer', 'Planetary mixing, 10 speeds, attachment hub.', 449.99, 20, { brand:'KitchenAid',motor:'325W',bowl:'5 qt',speeds:'10',sku:'KN-KA-ART-04' }],
  ['Vitamix A3500 Blender', '5 programs, self-detect, touchscreen, 10yr warranty.', 599.95, 18, { brand:'Vitamix',motor:'2.2 HP',programs:'5',sku:'KN-VIT-A3500-05' }],
  ['Cuisinart 14-Cup Food Processor', 'SS blades, dough blade, extra-large feed tube.', 249.95, 30, { brand:'Cuisinart',capacity:'14 cups',motor:'720W',sku:'KN-CUI-FP14-06' }],
  ['Instant Pot Duo Plus 9-in-1 6qt', '15 smart programs, pressure/slow/sous vide cook.', 129.99, 50, { brand:'Instant Pot',functions:'9-in-1',capacity:'6 qt',sku:'KN-IP-DP6-07' }],
  ['All-Clad D3 Cookware Set 10pc', 'Tri-ply bonded SS, even heating, oven-safe 600F.', 699.99, 12, { brand:'All-Clad',pieces:'10',material:'Tri-ply SS',sku:'KN-AC-D3-10-08' }],
  ['Wusthof Classic 7-Piece Knife Set', 'Precision-forged high-carbon SS, full tang.', 399.99, 22, { brand:'Wusthof',pieces:'7',steel:'High-Carbon SS',sku:'KN-WUS-7PC-09' }],
  ['Breville Smart Oven Air Fryer Pro', 'Element IQ, air fry, dehydrate, super convection.', 449.95, 16, { brand:'Breville',capacity:'1 cu ft',functions:'13',sku:'KN-BRE-OVEN-10' }],
];

const UTILITY = [
  ['Dyson V15 Detect Absolute Vacuum', 'Laser dust detection, 60min runtime, HEPA.', 749.99, 20, { brand:'Dyson',suction:'230 AW',runtime:'60min',filtration:'HEPA',sku:'UT-DYS-V15-01' }],
  ['Roborock S8 Pro Ultra Robot Vac', '6000Pa, sonic mop, self-empty/self-wash dock.', 1599.99, 10, { brand:'Roborock',suction:'6000Pa',dock:'Self-empty',sku:'UT-ROB-S8PU-02' }],
  ['Philips Hue Starter Kit', '3 color bulbs, bridge, 16M colors, Zigbee.', 199.99, 35, { brand:'Philips Hue',bulbs:'3',colors:'16M',sku:'UT-PHI-HUE-03' }],
  ['Ring Video Doorbell Pro 2', '3D motion, head-to-toe video, Bird\'s Eye View.', 259.99, 28, { brand:'Ring',video:'1536p',fov:'Head-to-toe',sku:'UT-RIN-VDP2-04' }],
  ['Coway Airmega 400S Purifier', 'HEPA + carbon, 1560 sq ft, app/voice control.', 449.00, 18, { brand:'Coway',coverage:'1560 sq ft',filter:'HEPA+Carbon',sku:'UT-COW-AM400-05' }],
  ['Philips Sonicare 9900 Toothbrush', 'SenseIQ AI, 62000 strokes/min, premium case.', 349.99, 40, { brand:'Philips',strokes:'62000/min',modes:'5',sku:'UT-PHI-9900-06' }],
  ['Braun Series 9 Pro Shaver', '5-in-1, Sonic/ProLift, Clean & Charge station.', 329.99, 25, { brand:'Braun',elements:'5',runtime:'60min',sku:'UT-BRA-S9P-07' }],
  ['OXO 20-Piece Food Storage Set', 'BPA-free snap containers, leakproof, dishwasher safe.', 59.99, 60, { brand:'OXO',pieces:'20',material:'BPA-free',sku:'UT-OXO-20PC-08' }],
  ['Yeti Rambler 36oz Bottle', 'Double-wall vacuum insulated, leakproof cap.', 49.99, 80, { brand:'YETI',capacity:'36oz',insulation:'Vacuum',sku:'UT-YET-36OZ-09' }],
  ['Tile Mate Bluetooth Tracker (4-Pack)', '250ft range, water-resistant, works with Alexa.', 74.99, 50, { brand:'Tile',range:'250ft',pack:'4',sku:'UT-TIL-MATE-10' }],
];

function toProduct(arr, cat) {
  const pool = IMAGES[cat];
  return arr.map(([name, desc, price, stock, specs], i) => {
    const id = pool[i % pool.length];
    const imageUrl = imgUrl(id);
    return { name, description: desc, price, stockQuantity: stock, category: cat, images: [imageUrl], thumbnail: imageUrl, specifications: specs, status: 'approved' };
  });
}

const ALL_PRODUCTS = [...toProduct(IT, 'electronics'), ...toProduct(KITCHEN, 'kitchen'), ...toProduct(UTILITY, 'utility')];

const out = `const path = require('path');
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

const ALL_PRODUCTS = ${JSON.stringify(ALL_PRODUCTS, null, 2)};

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
`;

fs.writeFileSync('C:/ojawa/backend/scripts/seed50Products.js', out);
console.log('Written seed50Products.js with category-specific images');
