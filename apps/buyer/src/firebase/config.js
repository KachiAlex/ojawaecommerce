// Firebase config shim - exports lightweight placeholders for migration

const warn = (name) => () => {
  console.warn(`Firebase shim called: ${name}. Replace with Render backend API.`);
  throw new Error(`Firebase shim called: ${name}`);
};

export const auth = {
  currentUser: null,
  signInWithEmailAndPassword: warn('auth.signInWithEmailAndPassword'),
  sendPasswordResetEmail: warn('auth.sendPasswordResetEmail'),
  signOut: warn('auth.signOut')
};

export const db = {
  collection: warn('db.collection'),
  doc: warn('db.doc'),
  get: warn('db.get')
};

export const storage = {
  ref: warn('storage.ref'),
  uploadBytes: warn('storage.uploadBytes'),
  getDownloadURL: warn('storage.getDownloadURL')
};

export const messaging = {
  onMessage: warn('messaging.onMessage')
};

const app = { name: 'firebase-config-shim' };
export default app;
