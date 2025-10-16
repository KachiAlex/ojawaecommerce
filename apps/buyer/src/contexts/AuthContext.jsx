import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import firebaseService from '../services/firebaseService';
import { storeService } from '../services/trackingService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEscrowEducation, setShowEscrowEducation] = useState(false);
  const [newUserType, setNewUserType] = useState('buyer');

  // Sign up function
  const signup = async (email, password, userData) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      await updateProfile(user, {
        displayName: userData.displayName
      });

      // Create user profile in Firestore - All users start as buyers
      const userProfileData = {
        uid: user.uid,
        email: user.email,
        displayName: userData.displayName,
        phone: userData.phone || '',
        address: userData.address || '',
        createdAt: new Date(),
        role: userData.role || 'buyer', // Allow admin to set role during registration
        isVendor: false, // Can become vendor through onboarding
        isLogisticsPartner: false, // Can become logistics through onboarding
        isAdmin: userData.role === 'admin', // Admin flag
        vendorProfile: null, // Will be populated after vendor onboarding
        logisticsProfile: null, // Will be populated after logistics onboarding
        suspended: false // User suspension status
      };

      await setDoc(doc(db, 'users', user.uid), userProfileData);
      setUserProfile(userProfileData);
      
      // Create wallet for new user
      try {
        await firebaseService.wallet.createWallet(user.uid, userData.userType || 'buyer');
      } catch (walletError) {
        console.error('Error creating wallet:', walletError);
        // Don't fail registration if wallet creation fails
      }
      
      // Show wallet education for new users
      setNewUserType(userData.userType || 'buyer');
      setShowEscrowEducation(true);
      
      return user;
    } catch (error) {
      throw error;
    }
  };

  // Sign in function
  const signin = async (email, password) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      return user;
    } catch (error) {
      throw error;
    }
  };

  // Sign out function
  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
    } catch (error) {
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      if (!currentUser) throw new Error('No user logged in');
      
      await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
      setUserProfile(prev => ({ ...prev, ...updates }));
    } catch (error) {
      throw error;
    }
  };

  // Check if user profile is complete
  const isProfileComplete = () => {
    if (!userProfile) return false;
    
    // Required fields for a complete profile
    const requiredFields = [
      userProfile.displayName,
      userProfile.phone,
      userProfile.address
    ];
    
    return requiredFields.every(field => field && field.trim().length > 0);
  };

  // Vendor onboarding
  const completeVendorOnboarding = async (vendorData) => {
    if (!currentUser) throw new Error('No user logged in');
    
    try {
      const vendorProfile = {
        nin: vendorData.nin,
        businessName: vendorData.businessName,
        businessAddress: vendorData.businessAddress,
        structuredAddress: vendorData.structuredAddress,
        businessPhone: vendorData.businessPhone,
        businessType: vendorData.businessType,
        storeName: vendorData.storeName,
        storeDescription: vendorData.storeDescription,
        storeSlug: vendorData.storeName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
        verificationStatus: 'pending',
        onboardedAt: new Date()
      };

      // Update user profile to include vendor status
      const updates = {
        isVendor: true,
        vendorProfile: vendorProfile,
        updatedAt: new Date()
      };

      await updateUserProfile(updates);

      // Create vendor wallet
      try {
        await firebaseService.wallet.createWallet(currentUser.uid, 'vendor');
      } catch (walletError) {
        console.error('Error creating vendor wallet:', walletError);
      }

      // Automatically create a store for the vendor
      try {
        const storeData = {
          name: vendorData.storeName,
          description: vendorData.storeDescription,
          category: vendorData.businessType || 'general',
          contactInfo: {
            email: currentUser.email,
            phone: vendorData.businessPhone,
            address: vendorData.businessAddress
          },
          settings: {
            isPublic: true,
            allowReviews: true,
            showContactInfo: true
          }
        };
        
        const createdStore = await storeService.createStore(currentUser.uid, storeData);
        console.log('Store created automatically during onboarding:', createdStore);
      } catch (storeError) {
        console.error('Error creating store during onboarding:', storeError);
        // Don't fail the onboarding if store creation fails
      }

      return vendorProfile;
    } catch (error) {
      console.error('Vendor onboarding error:', error);
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    signin,
    logout,
    updateUserProfile,
    completeVendorOnboarding,
    isProfileComplete,
    loading,
    showEscrowEducation,
    setShowEscrowEducation,
    newUserType
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
