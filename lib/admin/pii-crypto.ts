/**
 * PII at-rest encryption helpers.
 *
 * Uses pgcrypto.pgp_sym_encrypt / pgp_sym_decrypt with a key sourced
 * from PII_ENCRYPTION_KEY (Worker env). For ergonomic plaintext access
 * inside admin SQL we expose two SECURITY DEFINER functions:
 *
 *   public.pii_encrypt(plaintext text) returns text
 *   public.pii_decrypt(ciphertext text) returns text
 *
 * These exist server-side; this module exposes a typed wrapper so
 * Node/Worker code can encrypt before insert and decrypt after select.
 *
 * IMPORTANT: rotation. When you change PII_ENCRYPTION_KEY you MUST
 * also run `select pii_rotate_all('old-key','new-key')` which walks
 * encrypted columns and re-encrypts. See migration round_j_pii_crypto.
 */

import { serviceClient } from './service-client'

export async function encryptPII(plaintext: string | null): Promise<string | null> {
  if (plaintext == null || plaintext === '') return null
  const sb = serviceClient()
  const { data, error } = await sb.rpc('pii_encrypt', { plaintext })
  if (error) throw new Error(`pii_encrypt failed: ${error.message}`)
  return (data as string) ?? null
}

export async function decryptPII(ciphertext: string | null): Promise<string | null> {
  if (ciphertext == null || ciphertext === '') return null
  const sb = serviceClient()
  const { data, error } = await sb.rpc('pii_decrypt', { ciphertext })
  if (error) return null  // garbled/wrong-key → don't throw, return null
  return (data as string) ?? null
}
