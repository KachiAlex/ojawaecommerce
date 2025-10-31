import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
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

  // Sign in function with improved error handling
  const signin = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Signing in user:', email);
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ AuthContext: Sign in successful, user:', user.uid);
      
      // Fetch user profile to check role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('👤 AuthContext: User profile:', { 
          role: userData.role, 
          email: userData.email,
          displayName: userData.displayName 
        });
        
        // If user has an unrecognized role, default to 'buyer'
        if (userData.role && !['buyer', 'vendor', 'logistics', 'admin'].includes(userData.role)) {
          console.warn('⚠️ AuthContext: Unknown role detected:', userData.role, '- defaulting to buyer');
        }
      } else {
        console.warn('⚠️ AuthContext: User profile not found in Firestore');
      }
      
      return user;
    } catch (error) {
      console.error('❌ AuthContext: Sign in failed:', error);
      console.error('❌ AuthContext: Error code:', error.code);
      console.error('❌ AuthContext: Error message:', error.message);
      throw error;
    }
  };

  // Google Sign-In function with improved error handling and redirect fallback
  const signInWithGoogle = async (userType = 'buyer') => {
    try {
      console.log('🔐 AuthContext: Starting Google Sign-In as:', userType);
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({
        prompt: 'select_account' // Always show account picker
      });
      
      // Store userType for redirect flow
      if (userType) {
        sessionStorage.setItem('google_signin_usertype', userType);
      }
      
      // Detect mobile/tablet and use redirect flow
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Use redirect flow for mobile
        console.log('📱 Mobile detected, using redirect flow');
        await signInWithRedirect(auth, provider);
        return null; // Will complete after redirect
      }
      
      // Use popup for desktop
      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupError) {
        // If popup fails, try redirect as fallback
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
          console.log('⚠️ Popup blocked/failed, falling back to redirect');
          await signInWithRedirect(auth, provider);
          return null; // Will complete after redirect
        }
        throw popupError;
      }
      
      // Clear stored userType on successful popup sign-in
      sessionStorage.removeItem('google_signin_usertype');
      
      const user = result.user;
      console.log('✅ AuthContext: Google Sign-In successful, user:', user.uid);
      
      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // New user - create profile
        console.log('👤 AuthContext: New Google user, creating profile');
        const userProfileData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0],
          name: user.displayName || user.email?.split('@')[0],
          photoURL: user.photoURL || '',
          phone: user.phoneNumber || '',
          address: '',
          createdAt: new Date(),
          role: userType || 'buyer',
          isVendor: userType === 'vendor',
          isLogisticsPartner: userType === 'logistics',
          isAdmin: false,
          vendorProfile: null,
          logisticsProfile: null,
          suspended: false,
          signInMethod: 'google'
        };

        await setDoc(doc(db, 'users', user.uid), userProfileData);
        setUserProfile(userProfileData);
        
        // Create wallet for new user
        try {
          await firebaseService.wallet.createWallet(user.uid, userType || 'buyer');
        } catch (walletError) {
          console.error('Error creating wallet:', walletError);
        }
        
        // Show wallet education for new users
        setNewUserType(userType || 'buyer');
        setShowEscrowEducation(true);
      } else {
        // Existing user - just load profile
        console.log('👤 AuthContext: Existing Google user, loading profile');
        const userData = userDoc.data();
        setUserProfile(userData);
      }
      
      return user;
    } catch (error) {
      console.error('❌ AuthContext: Google Sign-In failed:', error);
      
      // Handle account exists with different credential
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        throw new Error(`An account already exists with ${email}. Please sign in with your email and password, or use the same Google account you used to sign up.`);
      }
      
      // Don't retry on user cancellation or popup blocked
      if (error.code === 'auth/popup-closed-by-user' || 
          error.code === 'auth/cancelled-popup-request' ||
          error.code === 'auth/popup-blocked') {
        console.log('ℹ️ User cancelled or blocked Google Sign-In');
        return null;
      }
      
      throw error;
    }
  };

  // Sign out function
  const logout = async () => {
    try {
      // Clear sensitive encrypted items
      try {
        const { default: secureStorage } = await import('../utils/secureStorage');
        await Promise.all([
          secureStorage.removeItem('cart'),
          secureStorage.removeItem('enhanced_cart'),
          secureStorage.removeItem('payment_records'),
          secureStorage.removeItem('searchHistory')
        ]);
      } catch (_) {}

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

      // Note: Store creation is now handled by VendorStoreManager component
      // to prevent duplicate store creation

      return vendorProfile;
    } catch (error) {
      console.error('Vendor onboarding error:', error);
      throw error;
    }
  };

  // Listen for auth state changes - Simplified for faster admin access
  useEffect(() => {
    // Check for redirect result first (for mobile Google Sign-In)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          console.log('✅ AuthContext: Redirect result received');
          const user = result.user;
          
          // Get stored userType from redirect
          const storedUserType = sessionStorage.getItem('google_signin_usertype') || 'buyer';
          sessionStorage.removeItem('google_signin_usertype');
          
          // Check if user profile exists
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (!userDoc.exists()) {
            // New user from redirect - create profile
            const userProfileData = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0],
              name: user.displayName || user.email?.split('@')[0],
              photoURL: user.photoURL || '',
              phone: user.phoneNumber || '',
              address: '',
              createdAt: new Date(),
              role: storedUserType || 'buyer',
              isVendor: storedUserType === 'vendor',
              isLogisticsPartner: storedUserType === 'logistics',
              isAdmin: false,
              vendorProfile: null,
              logisticsProfile: null,
              suspended: false,
              signInMethod: 'google'
            };

            await setDoc(doc(db, 'users', user.uid), userProfileData);
            setUserProfile(userProfileData);
            
            // Create wallet with correct userType
            try {
              await firebaseService.wallet.createWallet(user.uid, storedUserType || 'buyer');
            } catch (walletError) {
              console.error('Error creating wallet:', walletError);
            }
            
            setNewUserType(storedUserType || 'buyer');
            setShowEscrowEducation(true);
          } else {
            // Existing user from redirect - load profile
            const userData = userDoc.data();
            setUserProfile(userData);
          }
        }
      })
      .catch((error) => {
        console.error('❌ AuthContext: Redirect result error:', error);
      });
    
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
      
      // Set loading to false immediately for faster admin access
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    signin,
    signInWithGoogle,
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
      {children}
    </AuthContext.Provider>
  );
};
