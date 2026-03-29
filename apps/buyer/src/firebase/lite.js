// Firebase lite shim - Firebase removed after migration to Render.
// This shim provides minimal placeholders so imports don't break during incremental refactor.

const warn = (name) => () => {
  console.warn(`Firebase stub called: ${name}. This app no longer uses Firebase. Replace with Render backend API.`);
  throw new Error(`Firebase stub called: ${name}`);
};

export const auth = {
  currentUser: null,
  signInWithEmailAndPassword: warn('auth.signInWithEmailAndPassword'),
  signOut: warn('auth.signOut')
};

export const db = {
  collection: warn('db.collection'),
  doc: warn('db.doc'),
  get: warn('db.get')
};

export const storage = {
  ref: warn('storage.ref')
};

const app = { name: 'firebase-shim' };
export default app;
