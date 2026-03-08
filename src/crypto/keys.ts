import * as secp from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from './utils.js';

const CURVE_ORDER = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');

export function generatePrivateKey(): Uint8Array {
  return secp.utils.randomPrivateKey();
}

export function derivePublicKey(privKey: Uint8Array, compressed: boolean = true): Uint8Array {
  return secp.getPublicKey(privKey, compressed);
}

export function generateKeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const privateKey = generatePrivateKey();
  const publicKey = derivePublicKey(privateKey, true);
  return { privateKey, publicKey };
}

export function pointMultiply(scalar: Uint8Array): Uint8Array {
  const point = secp.Point.BASE.multiply(bytesToBigInt(scalar));
  return point.toRawBytes(true);
}

export function pointAdd(p1: Uint8Array, p2: Uint8Array): Uint8Array {
  const point1 = secp.Point.fromHex(bytesToHex(p1));
  const point2 = secp.Point.fromHex(bytesToHex(p2));
  return point1.add(point2).toRawBytes(true);
}

export function scalarAdd(a: Uint8Array, b: Uint8Array): Uint8Array {
  const sum = (bytesToBigInt(a) + bytesToBigInt(b)) % CURVE_ORDER;
  return bigIntToBytes(sum, 32);
}

export function getSharedSecret(privKey: Uint8Array, pubKey: Uint8Array): Uint8Array {
  return secp.getSharedSecret(privKey, pubKey, true);
}

export function encodeMetaAddress(spendPub: Uint8Array, viewPub: Uint8Array): string {
  return `st:eth:0x${bytesToHex(spendPub)}${bytesToHex(viewPub)}`;
}

export function parseMetaAddress(encoded: string): { spendPub: Uint8Array; viewPub: Uint8Array } {
  const hex = encoded.replace('st:eth:0x', '').replace('st:eth:', '');
  // Each compressed public key is 33 bytes = 66 hex chars
  const spendPub = hexToBytes(hex.slice(0, 66));
  const viewPub = hexToBytes(hex.slice(66, 132));
  return { spendPub, viewPub };
}

export function getUncompressedPublicKey(privKey: Uint8Array): Uint8Array {
  return secp.getPublicKey(privKey, false);
}

export function pointToUncompressed(compressed: Uint8Array): Uint8Array {
  const point = secp.Point.fromHex(bytesToHex(compressed));
  return point.toRawBytes(false);
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const b of bytes) {
    result = (result << 8n) | BigInt(b);
  }
  return result;
}

function bigIntToBytes(n: bigint, length: number): Uint8Array {
  const hex = n.toString(16).padStart(length * 2, '0');
  return hexToBytes(hex);
}
