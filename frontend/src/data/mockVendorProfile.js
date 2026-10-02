const mockVendorProfile = {
  id: 'mock-vendor-ojawa-generic',
  storeName: 'Ojawa Vendor',
  businessName: 'Ojawa Vendor Ltd',
  displayName: 'Mock Vendor',
  ownerName: 'Mock Vendor Admin',
  email: 'vendor@ojawa.africa',
  password: 'MockVendor123!',
  phone: '+234 809 555 0101',
  businessPhone: '+234 809 555 0101',
  whatsapp: '+234 809 555 0101',
  website: 'https://ojawa.africa/vendor',
  heroImage: 'https://ojawa.africa/assets/catalog/kitchenaid-stand-mixer.jpg',
  logo: 'https://ojawa.africa/assets/catalog/multicooker.jpg',
  businessAddress: '42 Aromire Avenue, Ikeja GRA, Lagos, Nigeria',
  structuredAddress: {
    street: '42 Aromire Avenue',
    city: 'Ikeja',
    state: 'Lagos',
    country: 'Nigeria',
    postalCode: '100271'
  },
  operatingHours: {
    mondayToFriday: '08:00 - 20:00',
    saturday: '09:00 - 18:00',
    sunday: '12:00 - 17:00'
  },
  verificationStatus: 'verified',
  addressVerificationStatus: 'verified',
  escrowOnboardingStatus: 'complete',
  logisticsTier: 'priority',
  rating: 4.8,
  reviewCount: 180,
  averageFulfillmentTimeHours: 8,
  refundRate: 1.2,
  joinedAt: '2024-01-15T08:00:00.000Z',
  highlights: [
    'Same-day delivery within Lagos',
    'Dedicated white-glove installation partners',
    'Escrow-backed warranty on all appliances'
  ],
  fulfillment: {
    shippingRegions: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Abeokuta'],
    freeShippingThresholdNGN: 50000,
    pickupAvailable: true,
    partneredLogistics: ['Ojawa Express', 'SendStack', 'Kwik Delivery']
  },
  metrics: {
    totalOrders: 320,
    monthlyRevenueNGN: 3200000,
    onTimeDeliveryRate: 96,
    activeProducts: 58,
    repeatCustomers: 150
  },
  contactPersons: [
    {
      name: 'Support Desk',
      role: 'Vendor Support Lead',
      phone: '+234 809 555 0101',
      email: 'support@ojawa.africa'
    },
    {
      name: 'Logistics Desk',
      role: 'Fulfilment Coordinator',
      phone: '+234 809 555 0101',
      email: 'logistics@ojawa.africa'
    }
  ],
  showcaseProducts: [
    {
      name: 'KitchenAid Artisan Stand Mixer',
      price: 329900,
      image: 'https://ojawa.africa/assets/catalog/kitchenaid-stand-mixer.jpg'
    },
    {
      name: 'Breville Barista Espresso Machine',
      price: 589900,
      image: 'https://ojawa.africa/assets/catalog/breville-barista.jpg'
    },
    {
      name: 'Le Creuset Signature Dutch Oven',
      price: 289900,
      image: 'https://ojawa.africa/assets/catalog/lecreuset-dutch-oven.jpg'
    }
  ],
  social: {
    instagram: 'https://instagram.com/ojawa.vendor',
    facebook: 'https://facebook.com/ojawa.vendor',
    tiktok: 'https://tiktok.com/@ojawa.vendor'
  }
};

export default mockVendorProfile;
export const MOCK_VENDOR_PROFILE_ID = mockVendorProfile.id;
