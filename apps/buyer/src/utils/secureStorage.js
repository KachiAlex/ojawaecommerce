// `auth` may not be exported during the migration away from Firebase SDK.
// Use a dynamic import at runtime to avoid build-time rollup errors.

// Base64 helpers (browser-safe)
function uint8ToB64(uint8) {
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

function b64ToUint8(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getOrCreateSalt() {
  const key = 'ss_salt_v1';
  let saltB64 = localStorage.getItem(key);
  if (!saltB64) {
    // If Web Crypto is not available (eg. some test/node environments), fall back to a deterministic pseudo-random salt
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      const fallback = 'test-salt-000000000000';
      localStorage.setItem(key, fallback);
      return b64ToUint8(fallback);
    }
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    saltB64 = uint8ToB64(salt);
    localStorage.setItem(key, saltB64);
  }
  return b64ToUint8(saltB64);
}

async function deriveKey(passphrase, salt) {
  // If Web Crypto is not available, skip PBKDF2 and return null to indicate no crypto
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 250000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function getKey() {
  let uid = 'guest';
  try {
    // dynamic import so bundlers won't fail if `../firebase/config` no longer exports `auth`
    // and so tests/headless environments that don't have Firebase can continue.
    // eslint-disable-next-line import/no-dynamic-require
    const cfg = await import('../firebase/config');
    uid = cfg?.auth?.currentUser?.uid || uid;
  } catch (_) {
    // ignore — fall back to guest
  }

  const salt = await getOrCreateSalt();
  return deriveKey(`ojawa:${uid}`, salt);
}

async function encryptToB64(plaintext) {
  const key = await getKey();
  // If crypto not available, return plain base64 payload (not secure in tests but acceptable for JS DOM)
  if (!key || typeof crypto === 'undefined' || !crypto.subtle) {
    return `PLAIN:${btoa(String(plaintext))}`;
  }
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const cipherArr = new Uint8Array(cipherBuf);
  return `${uint8ToB64(iv)}:${uint8ToB64(cipherArr)}`;
}

async function decryptFromB64(payload) {
  const str = String(payload);
  if (str.startsWith('PLAIN:')) {
    try { return atob(str.slice(6)); } catch { return null; }
  }
  const [ivB64, dataB64] = str.split(':');
  if (!ivB64 || !dataB64) return null;
  const key = await getKey();
  if (!key || typeof crypto === 'undefined' || !crypto.subtle) {
    // Cannot decrypt in this environment
    return null;
  }
  const iv = b64ToUint8(ivB64);
  const data = b64ToUint8(dataB64);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  const dec = new TextDecoder();
  return dec.decode(plainBuf);
}

const secureStorage = {
  async getItem(key) {
    try {
      const val = localStorage.getItem(`enc_${key}`);
      if (!val) return null;
      try {
        const plain = await decryptFromB64(val);
        return plain;
      } catch (decryptError) {
        console.warn('Decryption failed for key:', key, 'Removing corrupted data', decryptError?.message);
        localStorage.removeItem(`enc_${key}`);
        return null;
      }
    } catch (e) {
      console.warn('secureStorage.getItem failed:', e?.message || e);
      return null;
    }
  },
  async setItem(key, value) {
    try {
      const payload = await encryptToB64(String(value));
      localStorage.setItem(`enc_${key}`, payload);
    } catch (e) {
      console.warn('secureStorage.setItem failed:', e?.message || e);
    }
  },
  async removeItem(key) {
    localStorage.removeItem(`enc_${key}`);
  }
};

export default secureStorage;

