# Ojawa E-commerce Application

A modern, full-stack e-commerce application built with React and Firebase.

## 🚀 Features

- **User Authentication** - Secure login/registration with Firebase Auth
- **Product Management** - Browse, search, and filter products
- **Shopping Cart** - Persistent cart with local storage
- **Payment Processing** - Stripe integration for secure payments
- **Order Management** - Complete order tracking and history
- **Admin Dashboard** - Full product and order management
- **Responsive Design** - Mobile-first, responsive UI with TailwindCSS

## 🏗️ Tech Stack

### Frontend
- **React 19** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **TailwindCSS 4** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Stripe React** - Payment processing components

### Backend
- **Firebase Authentication** - User management
- **Firestore** - NoSQL database with security rules
- **Firebase Functions** - Serverless backend functions
- **Firebase Hosting** - Static site hosting

## 📦 Project Structure

```
ojawa-firebase/
├── apps/
│   └── buyer/                 # React frontend application
│       ├── src/
│       │   ├── components/    # Reusable components
│       │   ├── contexts/      # React context providers
│       │   ├── pages/         # Page components
│       │   ├── utils/         # Utility functions
│       │   └── firebase/      # Firebase configuration
│       └── public/            # Static assets
├── functions/                 # Firebase Functions
├── firestore.rules           # Firestore security rules
├── firestore.indexes.json    # Firestore indexes
└── firebase.json             # Firebase configuration
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ojawa-firebase
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   cd apps/buyer
   npm install
   
   # Install functions dependencies
   cd ../../functions
   npm install
   ```

3. **Firebase Setup**
   ```bash
   # Login to Firebase
   firebase login
   
   # Set your Firebase project
   firebase use <your-project-id>
   ```

4. **Environment Setup**
   - Update Firebase configuration in `apps/buyer/src/firebase/config.js`
   - Add your Stripe keys to the application

### Development

1. **Start the development server**
   ```bash
   cd apps/buyer
   npm run dev
   ```

2. **Deploy Firestore rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Seed the database**
   - Navigate to `/admin` in your app (requires admin role)
   - Use the "Seed Complete Database" button

## 🚀 Deployment

### Deploy to Firebase Hosting

1. **Build the application**
   ```bash
   cd apps/buyer
   npm run build
   ```

2. **Deploy to Firebase**
   ```bash
   # Deploy everything
   firebase deploy
   
   # Or deploy specific services
   firebase deploy --only hosting
   firebase deploy --only functions
   firebase deploy --only firestore:rules
   ```

## 🔐 Security

- **Firestore Rules** - Role-based access control
- **Authentication** - Firebase Auth with email/password
- **Payment Security** - Stripe handles all payment data
- **Admin Access** - Restricted to users with `admin` role

## 🛒 Key Features

### For Customers
- Browse products with search and filtering
- Add items to cart with persistent storage
- Secure checkout with Stripe
- Order history and tracking
- User profile management

### For Administrators
- Product management (CRUD operations)
- Order management and tracking
- User management
- Analytics dashboard
- Database seeding tools

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🔧 Configuration

### Firebase Configuration
Update the Firebase config in `apps/buyer/src/firebase/config.js` with your project details.

### Stripe Configuration
1. Add your Stripe publishable key to the frontend
2. Add your Stripe secret key to Firebase Functions environment
3. Configure webhook endpoints for payment confirmations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please create an issue in the repository or contact the development team.
