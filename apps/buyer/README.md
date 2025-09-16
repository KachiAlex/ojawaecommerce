# Ojawa E-commerce Platform

A modern e-commerce platform built with React, Firebase, and Tailwind CSS.

## Features

### ✅ Completed
- **User Authentication**: Login, register, and logout functionality
- **Product Catalog**: Browse products with search and filtering
- **Shopping Cart**: Add/remove items, update quantities, persistent storage
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Firebase Integration**: Authentication, Firestore database, and hosting

### 🚧 In Progress
- **Checkout Process**: Order placement and payment integration
- **User Dashboard**: Order history and profile management
- **Firebase Functions**: Backend logic for order processing
- **Security Rules**: Proper Firestore security configuration

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Firebase project setup
- Firebase CLI installed

### Installation

1. **Install dependencies**:
   ```bash
   cd apps/buyer
   npm install
   ```

2. **Configure Firebase**:
   - Update `src/firebase/config.js` with your Firebase project credentials
   - Make sure your Firebase project has Authentication and Firestore enabled

3. **Add Sample Data**:
   - Start the development server: `npm run dev`
   - Visit the home page and use the Admin Panel to add sample products

4. **Run the application**:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.jsx      # Navigation bar with cart count
│   ├── ProtectedRoute.jsx # Route protection for authenticated users
│   └── AdminPanel.jsx  # Admin utilities (temporary)
├── contexts/           # React contexts for state management
│   ├── AuthContext.jsx # User authentication state
│   └── CartContext.jsx # Shopping cart state
├── firebase/           # Firebase configuration
│   └── config.js       # Firebase app initialization
├── pages/              # Page components
│   ├── Home.jsx        # Landing page
│   ├── Products.jsx    # Product catalog
│   ├── ProductDetail.jsx # Individual product view
│   ├── Cart.jsx        # Shopping cart
│   ├── Login.jsx       # User login
│   ├── Register.jsx    # User registration
│   ├── Dashboard.jsx   # User dashboard
│   └── Checkout.jsx    # Checkout process (placeholder)
├── utils/              # Utility functions
│   └── sampleData.js   # Sample product data
└── App.jsx             # Main app component with routing
```

## Firebase Configuration

The app uses the following Firebase services:
- **Authentication**: User login/register
- **Firestore**: Product and user data storage
- **Hosting**: Static site hosting
- **Functions**: Backend logic (planned)

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features
1. Create components in `src/components/`
2. Add pages in `src/pages/`
3. Update routing in `src/App.jsx`
4. Add Firebase functions in `functions/` directory

## Deployment

The app is configured for Firebase Hosting with automatic deployment via GitHub Actions.

## Next Steps

1. **Complete Checkout Flow**: Implement order placement and payment
2. **Add Firebase Functions**: Backend logic for order processing
3. **Implement Security Rules**: Proper Firestore access control
4. **Add Product Management**: Admin interface for managing products
5. **Enhance User Experience**: Add loading states, error handling, and notifications

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.