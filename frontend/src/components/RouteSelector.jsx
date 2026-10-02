import { useState, useMemo } from 'react';

/**
 * Clean, from-scratch route selector component
 * Handles intercity and international route selection with proper data normalization
 */
const RouteSelector = ({ 
  routeType, 
  onRoutesSelected, 
  profile,
  calculatePartnerPrice 
}) => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  const [defaultWeight, setDefaultWeight] = useState(1); // Default weight in kg

  // Default vehicle types for all routes
  const DEFAULT_VEHICLES = ['Van', 'Truck', 'Motorcycle', 'Car'];

  // Weight-based pricing multipliers
  const calculateWeightMultiplier = (weight) => {
    if (weight <= 5) return 1.0;           // 0-5kg: base price
    if (weight <= 10) return 1.2;          // 6-10kg: +20%
    if (weight <= 20) return 1.4;          // 11-20kg: +40%
    if (weight <= 50) return 1.7;          // 21-50kg: +70%
    if (weight <= 100) return 2.0;         // 51-100kg: +100%
    if (weight <= 200) return 2.5;         // 101-200kg: +150%
    if (weight <= 500) return 3.0;         // 201-500kg: +200%
    if (weight <= 1000) return 4.0;        // 501-1000kg: +300%
    return 4.0 + ((weight - 1000) / 1000); // 1000kg+: +300% + extra per ton
  };

  // Intercity routes data - Comprehensive African coverage
  const INTERCITY_ROUTES = {
    Nigeria: [
      // Major routes from Lagos
      { from: 'Lagos', to: 'Abuja', distance: 750, price: 45000, time: '8-12 hours' },
      { from: 'Lagos', to: 'Port Harcourt', distance: 630, price: 38000, time: '8-10 hours' },
      { from: 'Lagos', to: 'Ibadan', distance: 130, price: 12000, time: '2-3 hours' },
      { from: 'Lagos', to: 'Benin City', distance: 320, price: 22000, time: '4-6 hours' },
      { from: 'Lagos', to: 'Kano', distance: 1000, price: 60000, time: '12-16 hours' },
      { from: 'Lagos', to: 'Enugu', distance: 650, price: 40000, time: '8-10 hours' },
      { from: 'Lagos', to: 'Calabar', distance: 850, price: 50000, time: '10-14 hours' },
      { from: 'Lagos', to: 'Kaduna', distance: 800, price: 48000, time: '10-12 hours' },
      { from: 'Lagos', to: 'Jos', distance: 900, price: 55000, time: '11-14 hours' },
      { from: 'Lagos', to: 'Ilorin', distance: 310, price: 21000, time: '4-6 hours' },
      { from: 'Lagos', to: 'Owerri', distance: 580, price: 35000, time: '7-9 hours' },
      { from: 'Lagos', to: 'Warri', distance: 420, price: 28000, time: '5-7 hours' },
      { from: 'Lagos', to: 'Akure', distance: 290, price: 20000, time: '4-5 hours' },
      { from: 'Lagos', to: 'Abeokuta', distance: 80, price: 8000, time: '1-2 hours' },
      
      // Major routes from Abuja
      { from: 'Abuja', to: 'Lagos', distance: 750, price: 45000, time: '8-12 hours' },
      { from: 'Abuja', to: 'Kano', distance: 350, price: 25000, time: '5-7 hours' },
      { from: 'Abuja', to: 'Port Harcourt', distance: 700, price: 42000, time: '9-12 hours' },
      { from: 'Abuja', to: 'Kaduna', distance: 160, price: 13000, time: '2-3 hours' },
      { from: 'Abuja', to: 'Jos', distance: 220, price: 16000, time: '3-4 hours' },
      { from: 'Abuja', to: 'Enugu', distance: 290, price: 20000, time: '4-5 hours' },
      { from: 'Abuja', to: 'Makurdi', distance: 280, price: 19000, time: '4-5 hours' },
      
      // Other major intercity routes
      { from: 'Port Harcourt', to: 'Lagos', distance: 630, price: 38000, time: '8-10 hours' },
      { from: 'Port Harcourt', to: 'Abuja', distance: 700, price: 42000, time: '9-12 hours' },
      { from: 'Port Harcourt', to: 'Enugu', distance: 160, price: 13000, time: '2-3 hours' },
      { from: 'Port Harcourt', to: 'Calabar', distance: 220, price: 16000, time: '3-4 hours' },
      { from: 'Port Harcourt', to: 'Owerri', distance: 100, price: 9000, time: '1-2 hours' },
      
      { from: 'Ibadan', to: 'Lagos', distance: 130, price: 12000, time: '2-3 hours' },
      { from: 'Ibadan', to: 'Abuja', distance: 650, price: 40000, time: '8-10 hours' },
      { from: 'Ibadan', to: 'Ilorin', distance: 200, price: 15000, time: '3-4 hours' },
      
      { from: 'Kano', to: 'Lagos', distance: 1000, price: 60000, time: '12-16 hours' },
      { from: 'Kano', to: 'Abuja', distance: 350, price: 25000, time: '5-7 hours' },
      { from: 'Kano', to: 'Kaduna', distance: 210, price: 15000, time: '3-4 hours' },
      
      { from: 'Enugu', to: 'Lagos', distance: 650, price: 40000, time: '8-10 hours' },
      { from: 'Enugu', to: 'Port Harcourt', distance: 160, price: 13000, time: '2-3 hours' },
      { from: 'Enugu', to: 'Abuja', distance: 290, price: 20000, time: '4-5 hours' },
    ],
    
    Ghana: [
      { from: 'Accra', to: 'Kumasi', distance: 250, price: 15000, time: '3-4 hours' },
      { from: 'Accra', to: 'Tamale', distance: 400, price: 25000, time: '6-8 hours' },
      { from: 'Accra', to: 'Takoradi', distance: 230, price: 14000, time: '3-4 hours' },
      { from: 'Accra', to: 'Cape Coast', distance: 150, price: 11000, time: '2-3 hours' },
      { from: 'Accra', to: 'Sunyani', distance: 380, price: 23000, time: '5-7 hours' },
      { from: 'Accra', to: 'Ho', distance: 160, price: 12000, time: '2-3 hours' },
      
      { from: 'Kumasi', to: 'Accra', distance: 250, price: 15000, time: '3-4 hours' },
      { from: 'Kumasi', to: 'Tamale', distance: 320, price: 20000, time: '5-6 hours' },
      { from: 'Kumasi', to: 'Takoradi', distance: 270, price: 17000, time: '4-5 hours' },
      { from: 'Kumasi', to: 'Sunyani', distance: 130, price: 10000, time: '2-3 hours' },
      
      { from: 'Tamale', to: 'Accra', distance: 400, price: 25000, time: '6-8 hours' },
      { from: 'Tamale', to: 'Kumasi', distance: 320, price: 20000, time: '5-6 hours' },
      
      { from: 'Takoradi', to: 'Accra', distance: 230, price: 14000, time: '3-4 hours' },
      { from: 'Takoradi', to: 'Kumasi', distance: 270, price: 17000, time: '4-5 hours' },
    ],
    
    Kenya: [
      { from: 'Nairobi', to: 'Mombasa', distance: 480, price: 28000, time: '6-8 hours' },
      { from: 'Nairobi', to: 'Kisumu', distance: 350, price: 22000, time: '5-7 hours' },
      { from: 'Nairobi', to: 'Nakuru', distance: 160, price: 12000, time: '2-3 hours' },
      { from: 'Nairobi', to: 'Eldoret', distance: 310, price: 20000, time: '4-6 hours' },
      { from: 'Nairobi', to: 'Thika', distance: 45, price: 5000, time: '1 hour' },
      { from: 'Nairobi', to: 'Nyeri', distance: 150, price: 11000, time: '2-3 hours' },
      { from: 'Nairobi', to: 'Machakos', distance: 65, price: 6000, time: '1-2 hours' },
      
      { from: 'Mombasa', to: 'Nairobi', distance: 480, price: 28000, time: '6-8 hours' },
      { from: 'Mombasa', to: 'Malindi', distance: 120, price: 9000, time: '2-3 hours' },
      { from: 'Mombasa', to: 'Lamu', distance: 240, price: 16000, time: '4-5 hours' },
      
      { from: 'Kisumu', to: 'Nairobi', distance: 350, price: 22000, time: '5-7 hours' },
      { from: 'Kisumu', to: 'Eldoret', distance: 200, price: 14000, time: '3-4 hours' },
      
      { from: 'Nakuru', to: 'Nairobi', distance: 160, price: 12000, time: '2-3 hours' },
      { from: 'Nakuru', to: 'Eldoret', distance: 150, price: 11000, time: '2-3 hours' },
    ],
    
    'South Africa': [
      { from: 'Johannesburg', to: 'Cape Town', distance: 1400, price: 80000, time: '14-18 hours' },
      { from: 'Johannesburg', to: 'Durban', distance: 600, price: 38000, time: '7-9 hours' },
      { from: 'Johannesburg', to: 'Pretoria', distance: 60, price: 8000, time: '1 hour' },
      { from: 'Johannesburg', to: 'Bloemfontein', distance: 400, price: 26000, time: '5-7 hours' },
      { from: 'Johannesburg', to: 'Port Elizabeth', distance: 1050, price: 65000, time: '12-15 hours' },
      { from: 'Johannesburg', to: 'Polokwane', distance: 280, price: 19000, time: '4-5 hours' },
      { from: 'Johannesburg', to: 'Nelspruit', distance: 360, price: 23000, time: '5-6 hours' },
      
      { from: 'Cape Town', to: 'Johannesburg', distance: 1400, price: 80000, time: '14-18 hours' },
      { from: 'Cape Town', to: 'Durban', distance: 1650, price: 95000, time: '16-20 hours' },
      { from: 'Cape Town', to: 'Port Elizabeth', distance: 770, price: 48000, time: '9-11 hours' },
      { from: 'Cape Town', to: 'George', distance: 420, price: 27000, time: '5-7 hours' },
      
      { from: 'Durban', to: 'Johannesburg', distance: 600, price: 38000, time: '7-9 hours' },
      { from: 'Durban', to: 'Cape Town', distance: 1650, price: 95000, time: '16-20 hours' },
      { from: 'Durban', to: 'Port Elizabeth', distance: 950, price: 58000, time: '11-13 hours' },
      { from: 'Durban', to: 'Pietermaritzburg', distance: 90, price: 8000, time: '1-2 hours' },
      
      { from: 'Pretoria', to: 'Johannesburg', distance: 60, price: 8000, time: '1 hour' },
      { from: 'Pretoria', to: 'Polokwane', distance: 270, price: 18000, time: '4-5 hours' },
    ],
    
    Egypt: [
      { from: 'Cairo', to: 'Alexandria', distance: 220, price: 16000, time: '3-4 hours' },
      { from: 'Cairo', to: 'Giza', distance: 20, price: 3000, time: '30 minutes' },
      { from: 'Cairo', to: 'Aswan', distance: 880, price: 55000, time: '11-13 hours' },
      { from: 'Cairo', to: 'Luxor', distance: 670, price: 42000, time: '8-10 hours' },
      { from: 'Cairo', to: 'Port Said', distance: 220, price: 16000, time: '3-4 hours' },
      { from: 'Cairo', to: 'Suez', distance: 140, price: 11000, time: '2-3 hours' },
      { from: 'Cairo', to: 'Sharm El Sheikh', distance: 490, price: 32000, time: '6-8 hours' },
      
      { from: 'Alexandria', to: 'Cairo', distance: 220, price: 16000, time: '3-4 hours' },
      { from: 'Alexandria', to: 'Marsa Matruh', distance: 290, price: 20000, time: '4-5 hours' },
      
      { from: 'Aswan', to: 'Cairo', distance: 880, price: 55000, time: '11-13 hours' },
      { from: 'Aswan', to: 'Luxor', distance: 210, price: 15000, time: '3-4 hours' },
      
      { from: 'Luxor', to: 'Cairo', distance: 670, price: 42000, time: '8-10 hours' },
      { from: 'Luxor', to: 'Aswan', distance: 210, price: 15000, time: '3-4 hours' },
    ],
    
    Morocco: [
      { from: 'Casablanca', to: 'Rabat', distance: 90, price: 8000, time: '1-2 hours' },
      { from: 'Casablanca', to: 'Marrakech', distance: 240, price: 16000, time: '3-4 hours' },
      { from: 'Casablanca', to: 'Fez', distance: 300, price: 20000, time: '4-5 hours' },
      { from: 'Casablanca', to: 'Tangier', distance: 340, price: 22000, time: '4-6 hours' },
      { from: 'Casablanca', to: 'Agadir', distance: 480, price: 30000, time: '6-8 hours' },
      
      { from: 'Rabat', to: 'Casablanca', distance: 90, price: 8000, time: '1-2 hours' },
      { from: 'Rabat', to: 'Fez', distance: 210, price: 15000, time: '3-4 hours' },
      { from: 'Rabat', to: 'Tangier', distance: 250, price: 17000, time: '3-5 hours' },
      
      { from: 'Marrakech', to: 'Casablanca', distance: 240, price: 16000, time: '3-4 hours' },
      { from: 'Marrakech', to: 'Agadir', distance: 250, price: 17000, time: '3-5 hours' },
      { from: 'Marrakech', to: 'Essaouira', distance: 180, price: 13000, time: '3-4 hours' },
      
      { from: 'Fez', to: 'Casablanca', distance: 300, price: 20000, time: '4-5 hours' },
      { from: 'Fez', to: 'Rabat', distance: 210, price: 15000, time: '3-4 hours' },
      { from: 'Fez', to: 'Meknes', distance: 60, price: 6000, time: '1 hour' },
      
      { from: 'Tangier', to: 'Casablanca', distance: 340, price: 22000, time: '4-6 hours' },
      { from: 'Tangier', to: 'Rabat', distance: 250, price: 17000, time: '3-5 hours' },
      { from: 'Tangier', to: 'Fez', distance: 300, price: 20000, time: '4-5 hours' },
    ],
    
    Ethiopia: [
      { from: 'Addis Ababa', to: 'Dire Dawa', distance: 520, price: 32000, time: '7-9 hours' },
      { from: 'Addis Ababa', to: 'Bahir Dar', distance: 560, price: 35000, time: '7-10 hours' },
      { from: 'Addis Ababa', to: 'Hawassa', distance: 280, price: 19000, time: '4-5 hours' },
      { from: 'Addis Ababa', to: 'Mekelle', distance: 780, price: 48000, time: '10-12 hours' },
      { from: 'Addis Ababa', to: 'Jimma', distance: 350, price: 23000, time: '5-7 hours' },
      { from: 'Addis Ababa', to: 'Gondar', distance: 740, price: 46000, time: '9-12 hours' },
      
      { from: 'Dire Dawa', to: 'Addis Ababa', distance: 520, price: 32000, time: '7-9 hours' },
      { from: 'Dire Dawa', to: 'Harar', distance: 55, price: 6000, time: '1 hour' },
      
      { from: 'Bahir Dar', to: 'Addis Ababa', distance: 560, price: 35000, time: '7-10 hours' },
      { from: 'Bahir Dar', to: 'Gondar', distance: 180, price: 13000, time: '3-4 hours' },
      
      { from: 'Hawassa', to: 'Addis Ababa', distance: 280, price: 19000, time: '4-5 hours' },
      { from: 'Mekelle', to: 'Addis Ababa', distance: 780, price: 48000, time: '10-12 hours' },
      { from: 'Gondar', to: 'Addis Ababa', distance: 740, price: 46000, time: '9-12 hours' },
      { from: 'Gondar', to: 'Bahir Dar', distance: 180, price: 13000, time: '3-4 hours' },
    ],
    
    Tanzania: [
      { from: 'Dar es Salaam', to: 'Dodoma', distance: 480, price: 30000, time: '6-8 hours' },
      { from: 'Dar es Salaam', to: 'Arusha', distance: 640, price: 40000, time: '8-10 hours' },
      { from: 'Dar es Salaam', to: 'Mwanza', distance: 1150, price: 70000, time: '14-17 hours' },
      { from: 'Dar es Salaam', to: 'Mbeya', distance: 840, price: 52000, time: '10-13 hours' },
      { from: 'Dar es Salaam', to: 'Tanga', distance: 350, price: 23000, time: '5-7 hours' },
      { from: 'Dar es Salaam', to: 'Morogoro', distance: 200, price: 14000, time: '3-4 hours' },
      
      { from: 'Dodoma', to: 'Dar es Salaam', distance: 480, price: 30000, time: '6-8 hours' },
      { from: 'Dodoma', to: 'Arusha', distance: 450, price: 28000, time: '6-8 hours' },
      
      { from: 'Arusha', to: 'Dar es Salaam', distance: 640, price: 40000, time: '8-10 hours' },
      { from: 'Arusha', to: 'Mwanza', distance: 550, price: 35000, time: '7-9 hours' },
      { from: 'Arusha', to: 'Moshi', distance: 80, price: 7000, time: '1-2 hours' },
      
      { from: 'Mwanza', to: 'Dar es Salaam', distance: 1150, price: 70000, time: '14-17 hours' },
      { from: 'Mwanza', to: 'Arusha', distance: 550, price: 35000, time: '7-9 hours' },
    ],
    
    Uganda: [
      { from: 'Kampala', to: 'Entebbe', distance: 40, price: 5000, time: '1 hour' },
      { from: 'Kampala', to: 'Jinja', distance: 80, price: 7000, time: '1-2 hours' },
      { from: 'Kampala', to: 'Mbarara', distance: 270, price: 18000, time: '4-5 hours' },
      { from: 'Kampala', to: 'Gulu', distance: 340, price: 22000, time: '5-7 hours' },
      { from: 'Kampala', to: 'Mbale', distance: 230, price: 16000, time: '3-5 hours' },
      { from: 'Kampala', to: 'Fort Portal', distance: 300, price: 20000, time: '4-6 hours' },
      
      { from: 'Entebbe', to: 'Kampala', distance: 40, price: 5000, time: '1 hour' },
      { from: 'Jinja', to: 'Kampala', distance: 80, price: 7000, time: '1-2 hours' },
      { from: 'Mbarara', to: 'Kampala', distance: 270, price: 18000, time: '4-5 hours' },
      { from: 'Gulu', to: 'Kampala', distance: 340, price: 22000, time: '5-7 hours' },
      { from: 'Mbale', to: 'Kampala', distance: 230, price: 16000, time: '3-5 hours' },
    ],
    
    Senegal: [
      { from: 'Dakar', to: 'Thiès', distance: 70, price: 7000, time: '1 hour' },
      { from: 'Dakar', to: 'Saint-Louis', distance: 270, price: 18000, time: '4-5 hours' },
      { from: 'Dakar', to: 'Kaolack', distance: 190, price: 14000, time: '3-4 hours' },
      { from: 'Dakar', to: 'Ziguinchor', distance: 450, price: 28000, time: '6-8 hours' },
      { from: 'Dakar', to: 'Touba', distance: 200, price: 15000, time: '3-4 hours' },
      
      { from: 'Thiès', to: 'Dakar', distance: 70, price: 7000, time: '1 hour' },
      { from: 'Saint-Louis', to: 'Dakar', distance: 270, price: 18000, time: '4-5 hours' },
      { from: 'Kaolack', to: 'Dakar', distance: 190, price: 14000, time: '3-4 hours' },
      { from: 'Ziguinchor', to: 'Dakar', distance: 450, price: 28000, time: '6-8 hours' },
    ],
    
    'Ivory Coast': [
      { from: 'Abidjan', to: 'Yamoussoukro', distance: 240, price: 16000, time: '3-4 hours' },
      { from: 'Abidjan', to: 'Bouaké', distance: 360, price: 23000, time: '5-6 hours' },
      { from: 'Abidjan', to: 'San Pedro', distance: 320, price: 21000, time: '4-6 hours' },
      { from: 'Abidjan', to: 'Korhogo', distance: 640, price: 40000, time: '8-10 hours' },
      { from: 'Abidjan', to: 'Daloa', distance: 380, price: 24000, time: '5-7 hours' },
      
      { from: 'Yamoussoukro', to: 'Abidjan', distance: 240, price: 16000, time: '3-4 hours' },
      { from: 'Yamoussoukro', to: 'Bouaké', distance: 120, price: 10000, time: '2-3 hours' },
      
      { from: 'Bouaké', to: 'Abidjan', distance: 360, price: 23000, time: '5-6 hours' },
      { from: 'Bouaké', to: 'Korhogo', distance: 300, price: 20000, time: '4-5 hours' },
    ],
    
    Zimbabwe: [
      { from: 'Harare', to: 'Bulawayo', distance: 440, price: 28000, time: '6-8 hours' },
      { from: 'Harare', to: 'Mutare', distance: 260, price: 18000, time: '4-5 hours' },
      { from: 'Harare', to: 'Gweru', distance: 280, price: 19000, time: '4-5 hours' },
      { from: 'Harare', to: 'Masvingo', distance: 290, price: 20000, time: '4-6 hours' },
      { from: 'Harare', to: 'Chinhoyi', distance: 120, price: 10000, time: '2-3 hours' },
      
      { from: 'Bulawayo', to: 'Harare', distance: 440, price: 28000, time: '6-8 hours' },
      { from: 'Bulawayo', to: 'Victoria Falls', distance: 440, price: 28000, time: '6-8 hours' },
      
      { from: 'Mutare', to: 'Harare', distance: 260, price: 18000, time: '4-5 hours' },
      { from: 'Gweru', to: 'Harare', distance: 280, price: 19000, time: '4-5 hours' },
    ],
  };

  // International routes data
  const INTERNATIONAL_ROUTES = [
    { from: 'Lagos, Nigeria', to: 'Accra, Ghana', distance: 400, price: 120000, time: '5-7 days', vehicles: ['Truck', 'Van', 'Flight'] },
    { from: 'Lagos, Nigeria', to: 'Cotonou, Benin', distance: 120, price: 45000, time: '2-3 days', vehicles: ['Truck', 'Van'] },
    { from: 'Accra, Ghana', to: 'Lagos, Nigeria', distance: 400, price: 120000, time: '5-7 days', vehicles: ['Truck', 'Van', 'Flight'] },
    { from: 'Nairobi, Kenya', to: 'Kampala, Uganda', distance: 650, price: 180000, time: '7-10 days', vehicles: ['Truck', 'Van', 'Flight'] },
    { from: 'Lagos, Nigeria', to: 'London, UK', distance: 5100, price: 850000, time: '7-10 days', vehicles: ['Flight'] },
  ];

  // Get available routes based on type
  const availableRoutes = useMemo(() => {
    if (routeType === 'international') {
      return INTERNATIONAL_ROUTES;
    }
    
    if (routeType === 'intercity' && selectedCountry) {
      return INTERCITY_ROUTES[selectedCountry] || [];
    }
    
    return [];
  }, [routeType, selectedCountry]);

  // Filter routes by search term
  const filteredRoutes = useMemo(() => {
    if (!searchTerm) return availableRoutes;
    
    const term = searchTerm.toLowerCase();
    return availableRoutes.filter(route => 
      route.from.toLowerCase().includes(term) || 
      route.to.toLowerCase().includes(term)
    );
  }, [availableRoutes, searchTerm]);

  // Normalize route data - ensure all routes have same structure
  const normalizeRoute = (route, weight = defaultWeight) => {
    // Get vehicles array - use from route or defaults
    const vehicles = Array.isArray(route.vehicles) && route.vehicles.length > 0 
      ? route.vehicles 
      : DEFAULT_VEHICLES;

    // Calculate weight multiplier
    const weightMultiplier = calculateWeightMultiplier(weight);

    // Calculate base price (with weight factor)
    let basePrice = Math.round(route.price * weightMultiplier);

    // Calculate partner price if available
    let finalPrice = basePrice;
    if (profile?.pricing?.ratePerKm && calculatePartnerPrice) {
      const partnerPricing = calculatePartnerPrice(
        route.distance,
        profile.pricing.ratePerKm,
        2000,
        100000
      );
      finalPrice = Math.round(partnerPricing.finalPrice * weightMultiplier);
    }

    return {
      from: route.from,
      to: route.to,
      distance: route.distance,
      price: finalPrice,
      basePrice: route.price,
      suggestedPrice: basePrice,
      estimatedTime: route.time,
      vehicleType: vehicles[0],
      vehicleTypes: vehicles, // Always an array
      weight: weight,
      weightMultiplier: weightMultiplier,
      routeKey: `${route.from}-${route.to}`
    };
  };

  // Check if route is selected
  const isSelected = (route) => {
    return selectedRoutes.some(r => r.routeKey === `${route.from}-${route.to}`);
  };

  // Toggle route selection
  const toggleRoute = (route) => {
    const routeKey = `${route.from}-${route.to}`;
    
    if (isSelected(route)) {
      // Remove
      setSelectedRoutes(selectedRoutes.filter(r => r.routeKey !== routeKey));
    } else {
      // Add with normalization
      const normalized = normalizeRoute(route);
      setSelectedRoutes([...selectedRoutes, normalized]);
    }
  };

  // Update a selected route field
  const updateRoute = (routeKey, field, value) => {
    setSelectedRoutes(selectedRoutes.map(route => 
      route.routeKey === routeKey 
        ? { ...route, [field]: value }
        : route
    ));
  };

  // Remove a selected route
  const removeRoute = (routeKey) => {
    setSelectedRoutes(selectedRoutes.filter(r => r.routeKey !== routeKey));
  };

  // Save all selected routes
  const handleSave = () => {
    if (selectedRoutes.length === 0) {
      alert('Please select at least one route');
      return;
    }
    onRoutesSelected(selectedRoutes);
  };

  return (
    <div className="space-y-6">
      {/* Weight Input */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-blue-900 mb-2">
          📦 Package Weight (affects pricing)
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={defaultWeight}
            onChange={(e) => {
              const weight = parseFloat(e.target.value) || 1;
              setDefaultWeight(weight);
              // Recalculate all selected routes with new weight
              setSelectedRoutes(selectedRoutes.map(r => ({
                ...r,
                weight: weight,
                weightMultiplier: calculateWeightMultiplier(weight),
                price: Math.round(r.basePrice * calculateWeightMultiplier(weight)),
                suggestedPrice: Math.round(r.basePrice * calculateWeightMultiplier(weight))
              })));
            }}
            min="0.1"
            step="0.5"
            className="w-32 border border-blue-300 rounded-lg px-3 py-2"
          />
          <span className="text-sm text-blue-900 font-medium">kg</span>
          <div className="flex-1">
            <div className="text-xs text-blue-700">
              Multiplier: {calculateWeightMultiplier(defaultWeight).toFixed(2)}x 
              {defaultWeight > 5 && (
                <span className="ml-2">
                  (+{Math.round((calculateWeightMultiplier(defaultWeight) - 1) * 100)}% of base price)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-blue-600">
          💡 Pricing tiers: 0-5kg (base) • 6-10kg (+20%) • 11-20kg (+40%) • 21-50kg (+70%) • 51-100kg (+100%) • 101-200kg (+150%) • 201-500kg (+200%) • 500kg+ (scaled)
        </div>
      </div>

      {/* Country Selector for Intercity */}
      {routeType === 'intercity' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Country</label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">-- Select a country --</option>
            {Object.keys(INTERCITY_ROUTES).map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
      )}

      {/* Search Box */}
      {((routeType === 'intercity' && selectedCountry) || routeType === 'international') && (
        <div>
          <input
            type="text"
            placeholder="Search routes by city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
      )}

      {/* Available Routes */}
      {filteredRoutes.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700">Available Routes ({filteredRoutes.length})</h3>
          {filteredRoutes.map((route, idx) => {
            const selected = isSelected(route);
            return (
              <div
                key={idx}
                onClick={() => toggleRoute(route)}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  selected 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-300 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      readOnly
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {route.from} → {route.to}
                      </div>
                      <div className="text-sm text-gray-600">
                        {route.distance}km • {route.time}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-emerald-600">
                      ₦{route.price.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Routes */}
      {selectedRoutes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Selected Routes ({selectedRoutes.length})
          </h3>
          {selectedRoutes.map((route) => (
            <div key={route.routeKey} className="border border-emerald-500 rounded-lg p-4 bg-emerald-50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-medium text-gray-900">{route.from} → {route.to}</div>
                  <div className="text-sm text-gray-600">{route.distance}km • {route.estimatedTime}</div>
                  <div className="text-xs text-blue-600 mt-1">
                    📦 Weight: {route.weight}kg • Multiplier: {route.weightMultiplier.toFixed(2)}x
                    {route.weight > 5 && (
                      <span className="ml-1">
                        (+{Math.round((route.weightMultiplier - 1) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeRoute(route.routeKey)}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={route.weight}
                    onChange={(e) => {
                      const newWeight = parseFloat(e.target.value) || 1;
                      const newMultiplier = calculateWeightMultiplier(newWeight);
                      const newPrice = Math.round(route.basePrice * newMultiplier);
                      setSelectedRoutes(selectedRoutes.map(r => 
                        r.routeKey === route.routeKey 
                          ? { ...r, weight: newWeight, weightMultiplier: newMultiplier, price: newPrice, suggestedPrice: newPrice }
                          : r
                      ));
                    }}
                    min="0.1"
                    step="0.5"
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price (₦)</label>
                  <input
                    type="number"
                    value={route.price}
                    onChange={(e) => updateRoute(route.routeKey, 'price', parseInt(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                  <div className="text-xs text-gray-500 mt-0.5">
                    Base: ₦{route.basePrice.toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select
                    value={route.vehicleType}
                    onChange={(e) => updateRoute(route.routeKey, 'vehicleType', e.target.value)}
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {route.vehicleTypes.map((vt, idx) => (
                      <option key={idx} value={vt}>{vt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleSave}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 font-medium"
          >
            Add {selectedRoutes.length} Route{selectedRoutes.length > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
};

export default RouteSelector;

