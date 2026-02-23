/**
 * lorl-crypto.js — AES-GCM 256-bit encryption/decryption using Web Crypto API
 * Drop into lorl-studio/js/editor/ 
 */

window.LorldCrypto = (() => {
  const PBKDF2_ITERATIONS = 100_000;
  const SALT_LEN = 16;
  const IV_LEN = 12;

  // Derive AES-GCM key from password
  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt a string → ArrayBuffer (salt[16] + iv[12] + ciphertext)
  async function encrypt(plaintext, password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const iv   = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const key  = await deriveKey(password, salt);
    const enc  = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );
    // Combine: salt + iv + ciphertext
    const result = new Uint8Array(SALT_LEN + IV_LEN + ciphertext.byteLength);
    result.set(salt, 0);
    result.set(iv, SALT_LEN);
    result.set(new Uint8Array(ciphertext), SALT_LEN + IV_LEN);
    return result.buffer;
  }

  // Decrypt ArrayBuffer → string
  async function decrypt(encryptedBuffer, password) {
    const data = new Uint8Array(encryptedBuffer);
    if (data.length < SALT_LEN + IV_LEN + 1) throw new Error('Invalid encrypted data');
    const salt       = data.slice(0, SALT_LEN);
    const iv         = data.slice(SALT_LEN, SALT_LEN + IV_LEN);
    const ciphertext = data.slice(SALT_LEN + IV_LEN);
    const key = await deriveKey(password, salt);
    try {
      const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );
      return new TextDecoder().decode(plainBuffer);
    } catch (e) {
      throw new Error('Incorrect password or corrupted data');
    }
  }

  // Convert ArrayBuffer → base64 string
  function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  // Convert base64 string → ArrayBuffer
  function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  return { encrypt, decrypt, bufferToBase64, base64ToBuffer };
})();
