// Firebase fully removed: use Render backend API only
// Compatibility shims for modules that still import named exports from this file.
// Prefer replacing imports with the REST `firebaseService` shim in migrated files.
export const db = {};

// If any code still expects `auth` to be exported, provide a null placeholder.
export const auth = null;
