/**
 * Token Encryption Utilities
 *
 * Uses JWE (JSON Web Encryption) via the jose library for encrypting
 * sensitive tokens before storing in the database.
 *
 * Based on Better Auth documentation:
 * https://www.better-auth.com/docs/concepts/users-accounts
 */

import { CompactEncrypt, compactDecrypt } from "jose";

// Encryption algorithms
const ALG = "dir"; // Direct encryption (simpler, uses secret directly)
const ENC = "A256GCM"; // AES-256-GCM content encryption

/**
 * Get the encryption key from environment.
 * Uses BETTER_AUTH_SECRET which should be at least 32 bytes.
 */
function getEncryptionKey(): Uint8Array {
  const secret = Bun.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required for token encryption");
  }

  // Ensure key is exactly 32 bytes for A256GCM
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(secret);

  if (keyBytes.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters for encryption");
  }

  // Use first 32 bytes
  return keyBytes.slice(0, 32);
}

/**
 * Encrypt a token string for secure database storage.
 *
 * @param plaintext - The token to encrypt
 * @returns Encrypted JWE string
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = getEncryptionKey();

  const jwe = await new CompactEncrypt(new TextEncoder().encode(plaintext))
    .setProtectedHeader({ alg: ALG, enc: ENC })
    .encrypt(key);

  return jwe;
}

/**
 * Decrypt a JWE-encrypted token.
 *
 * @param ciphertext - The encrypted JWE string
 * @returns Decrypted plaintext token
 */
export async function decryptToken(ciphertext: string): Promise<string> {
  const key = getEncryptionKey();

  try {
    const { plaintext } = await compactDecrypt(ciphertext, key);
    return new TextDecoder().decode(plaintext);
  } catch (error) {
    // If decryption fails, the token might be stored unencrypted (legacy)
    // Log warning but return as-is for backwards compatibility
    console.warn("Token decryption failed, may be unencrypted legacy token");
    return ciphertext;
  }
}

/**
 * Check if a string looks like an encrypted JWE token.
 * JWE compact format has 5 base64url-encoded parts separated by dots.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 5;
}

/**
 * Safely encrypt a token, handling null/undefined.
 */
export async function safeEncrypt(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  return encryptToken(token);
}

/**
 * Safely decrypt a token, handling null/undefined and legacy unencrypted tokens.
 */
export async function safeDecrypt(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;

  // Check if already encrypted (JWE format)
  if (isEncrypted(token)) {
    return decryptToken(token);
  }

  // Return as-is if not encrypted (legacy data)
  return token;
}
