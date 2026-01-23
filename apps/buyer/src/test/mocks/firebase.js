import { vi } from 'vitest'

// Comprehensive Firebase mocks for testing
export const setupFirebaseMocks = () => {
  // Mock Firebase Auth
  vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({
      currentUser: null,
      settings: {
        appVerificationDisabledForTesting: false,
      },
    })),
    onAuthStateChanged: vi.fn(() => {
      // Return unsubscribe function
      return vi.fn()
    }),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    GoogleAuthProvider: vi.fn(),
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
    getRedirectResult: vi.fn(),
    connectAuthEmulator: vi.fn(),
  }))

  // Mock Firebase Firestore
  vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore')
    return {
      ...actual,
      getFirestore: vi.fn(() => ({})),
      collection: vi.fn(),
      doc: vi.fn(),
      getDoc: vi.fn(),
      getDocs: vi.fn(),
      addDoc: vi.fn(),
      setDoc: vi.fn(),
      updateDoc: vi.fn(),
      deleteDoc: vi.fn(),
      query: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      startAfter: vi.fn(),
      serverTimestamp: vi.fn(() => new Date()),
      writeBatch: vi.fn(() => ({
        set: vi.fn(),
        update: vi.fn(),
        commit: vi.fn(),
      })),
      increment: vi.fn(),
      onSnapshot: vi.fn(),
      enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
      enableMultiTabIndexedDbPersistence: vi.fn(() => Promise.resolve()),
      connectFirestoreEmulator: vi.fn(),
      CACHE_SIZE_UNLIMITED: 0,
    }
  })

  // Mock Firebase Storage
  vi.mock('firebase/storage', () => ({
    getStorage: vi.fn(() => ({})),
    ref: vi.fn(),
    uploadBytes: vi.fn(),
    uploadBytesResumable: vi.fn(),
    getDownloadURL: vi.fn(),
    connectStorageEmulator: vi.fn(),
  }))

  // Mock Firebase Functions
  vi.mock('firebase/functions', () => ({
    getFunctions: vi.fn(() => ({})),
    httpsCallable: vi.fn(() => vi.fn()),
    connectFunctionsEmulator: vi.fn(),
  }))

  // Mock Firebase Messaging (for test environment)
  vi.mock('firebase/messaging', () => ({
    getMessaging: vi.fn(() => {
      // Return a mock messaging object
      return {
        // Mock messaging methods if needed
      }
    }),
    isSupported: vi.fn(() => Promise.resolve(false)), // Not supported in test env
  }))

  // Mock Firebase App
  vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(() => ({})),
  }))
}

