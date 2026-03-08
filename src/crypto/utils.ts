import { keccak_256 } from '@noble/hashes/sha3';
import type { DisplayFormat } from '../types/index.js';

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToDecimal(bytes: Uint8Array): string {
  let result = 0n;
  for (const b of bytes) {
    result = (result << 8n) | BigInt(b);
  }
  return result.toString(10);
}

export function bytesToBinary(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(2).padStart(8, '0'))
    .join(' ');
}

export function formatValue(bytes: Uint8Array, format: DisplayFormat): string {
  switch (format) {
    case 'hex':
      return '0x' + bytesToHex(bytes);
    case 'dec':
      return bytesToDecimal(bytes);
    case 'bin':
      return bytesToBinary(bytes);
  }
}

export function keccak256(data: Uint8Array): Uint8Array {
  return keccak_256(data);
}

export function pubkeyToAddress(uncompressedPubKey: Uint8Array): string {
  // Remove 0x04 prefix if present (uncompressed key is 65 bytes with prefix)
  const key = uncompressedPubKey.length === 65 ? uncompressedPubKey.slice(1) : uncompressedPubKey;
  const hash = keccak256(key);
  const addressBytes = hash.slice(hash.length - 20);
  return '0x' + bytesToHex(addressBytes);
}

export function isValidHex(s: string): boolean {
  const clean = s.startsWith('0x') ? s.slice(2) : s;
  return /^[0-9a-fA-F]*$/.test(clean) && clean.length % 2 === 0;
}

export function isValidPrivateKey(hex: string): boolean {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length !== 64 || !isValidHex(clean)) return false;
  const n = BigInt('0x' + clean);
  const curveOrder = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
  return n > 0n && n < curveOrder;
}

export function truncateHex(hex: string, chars: number = 8): string {
  if (hex.length <= chars * 2 + 4) return hex;
  return hex.slice(0, chars + 2) + '...' + hex.slice(-chars);
}
