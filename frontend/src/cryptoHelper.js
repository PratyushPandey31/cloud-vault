// Client-side Zero-Knowledge Cryptography Helpers using Web Crypto API

// Helper: Convert ArrayBuffer to Hex String
export function bufToHex(buffer) {
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

// Helper: Convert Hex String to ArrayBuffer
export function hexToBuf(hexString) {
  if (hexString.length % 2 !== 0) hexString = '0' + hexString;
  const numBytes = hexString.length / 2;
  const array = new Uint8Array(numBytes);
  for (let i = 0; i < numBytes; i++) {
    array[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  return array.buffer;
}

// Helper: Convert ArrayBuffer to Base64
export function bufToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 to ArrayBuffer
export function base64ToBuf(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper: String to ArrayBuffer (UTF-8)
export function strToBuf(str) {
  return new TextEncoder().encode(str);
}

// Helper: ArrayBuffer to String (UTF-8)
export function bufToStr(buf) {
  return new TextDecoder().decode(buf);
}

// 1. Generate RSA-OAEP Key Pair (2048-bit)
export async function generateRSAKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true, // exportable
    ['encrypt', 'decrypt']
  );

  const publicKeyJWK = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJWK = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  return { publicKeyJWK, privateKeyJWK };
}

// 2. Derive Key from Password (PBKDF2)
export async function deriveKeyFromPassword(password, saltBuffer) {
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    strToBuf(password),
    'PBKDF2',
    false,
    ['deriveKey', 'deriveBits']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// 3. Encrypt Private Key (Zero-Knowledge: Encrypts Private Key JWK locally using Password)
export async function encryptPrivateKey(privateKeyJWK, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const derivedKey = await deriveKeyFromPassword(password, salt);
  const privateKeyStr = JSON.stringify(privateKeyJWK);
  
  const encryptedBuf = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    derivedKey,
    strToBuf(privateKeyStr)
  );

  return {
    encryptedPrivateKeyHex: bufToHex(encryptedBuf),
    saltHex: bufToHex(salt),
    ivHex: bufToHex(iv)
  };
}

// 4. Decrypt Private Key (Decrypts Private Key JWK in-browser during login)
export async function decryptPrivateKey(encryptedPrivateKeyHex, password, saltHex, ivHex) {
  const salt = new Uint8Array(hexToBuf(saltHex));
  const iv = new Uint8Array(hexToBuf(ivHex));
  const encryptedData = hexToBuf(encryptedPrivateKeyHex);
  
  const derivedKey = await deriveKeyFromPassword(password, salt);
  
  const decryptedBuf = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    derivedKey,
    encryptedData
  );

  const privateKeyStr = bufToStr(decryptedBuf);
  const privateKeyJWK = JSON.parse(privateKeyStr);
  
  // Import the private key object
  return await window.crypto.subtle.importKey(
    'jwk',
    privateKeyJWK,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['decrypt']
  );
}

// 5. Generate Random AES File Encryption Key
export async function generateFileAESKey() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// 6. Encrypt File (using AES-GCM)
export async function encryptFile(fileBuffer, aesKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedBuf = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    aesKey,
    fileBuffer
  );

  // Compute file integrity hash (SHA-256) of the encrypted file
  const hashBuf = await window.crypto.subtle.digest('SHA-256', encryptedBuf);
  const fileHashHex = bufToHex(hashBuf);

  return {
    ciphertextBuffer: encryptedBuf,
    ivHex: bufToHex(iv),
    fileHash: fileHashHex
  };
}

// 7. Decrypt File (using AES-GCM)
export async function decryptFile(ciphertextBuffer, aesKey, ivHex) {
  const iv = new Uint8Array(hexToBuf(ivHex));
  
  return await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    aesKey,
    ciphertextBuffer
  );
}

// 8. Wrap/Encrypt AES Key using RSA Public Key (for local encryption/sharing)
export async function wrapAESKey(aesKey, rsaPublicKeyJWK) {
  // Import the recipient public key
  const rsaPublicKey = await window.crypto.subtle.importKey(
    'jwk',
    rsaPublicKeyJWK,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['encrypt']
  );

  // Export AES raw bytes
  const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);

  // Encrypt raw AES bytes with RSA public key
  const encryptedKeyBuf = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    rsaPublicKey,
    rawAesKey
  );

  return bufToBase64(encryptedKeyBuf);
}

// 9. Unwrap/Decrypt AES Key using RSA Private Key (for download/decryption)
export async function unwrapAESKey(wrappedAesKeyBase64, rsaPrivateKeyObj) {
  const encryptedKeyBuf = base64ToBuf(wrappedAesKeyBase64);

  // Decrypt raw AES bytes using private key
  const rawAesKeyBuf = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP'
    },
    rsaPrivateKeyObj,
    encryptedKeyBuf
  );

  // Import raw AES bytes back to AES-GCM key object
  return await window.crypto.subtle.importKey(
    'raw',
    rawAesKeyBuf,
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}
