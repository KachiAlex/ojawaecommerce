import { auth } from '../firebase/config';

// Base64 helpers
const toB64 = (arr) => Buffer.from(arr).toString('base64');
const fromB64 = (b64) => Uint8Array.from(Buffer.from(b64, 'base64'));

async function getOrCreateSalt() {
  const key = 'ss_salt_v1';
  let saltB64 = localStorage.getItem(key);
  if (!saltB64) {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    saltB64 = toB64(salt);
    localStorage.setItem(key, saltB64);
  }
  return fromB64(saltB64);
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
  return `${toB64(iv)}:${toB64(cipherArr)}`;
}

async function decryptFromB64(payload) {
  const [ivB64, dataB64] = String(payload).split(':');
  if (!ivB64 || !dataB64) return null;
  const key = await getKey();
  const iv = fromB64(ivB64);
  const data = fromB64(dataB64);
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
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      const payload = await encryptToB64(String(value));
      localStorage.setItem(`enc_${key}`, payload);
    } catch {}
  },
  async removeItem(key) {
    localStorage.removeItem(`enc_${key}`);
  }
};

export default secureStorage;

