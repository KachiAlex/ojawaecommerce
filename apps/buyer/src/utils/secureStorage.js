import { auth } from '../firebase/config';

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
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    saltB64 = uint8ToB64(salt);
    localStorage.setItem(key, saltB64);
  }
  return b64ToUint8(saltB64);
}

async function deriveKey(passphrase, salt) {
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
  const uid = auth?.currentUser?.uid || 'guest';
  const salt = await getOrCreateSalt();
  return deriveKey(`ojawa:${uid}`, salt);
}

async function encryptToB64(plaintext) {
  const key = await getKey();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const enc = new TextEncoder();
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  const cipherArr = new Uint8Array(cipherBuf);
  return `${uint8ToB64(iv)}:${uint8ToB64(cipherArr)}`;
}

async function decryptFromB64(payload) {
  const [ivB64, dataB64] = String(payload).split(':');
  if (!ivB64 || !dataB64) return null;
  const key = await getKey();
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
      const plain = await decryptFromB64(val);
      return plain;
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

