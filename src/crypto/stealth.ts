import {
  generatePrivateKey,
  derivePublicKey,
  getSharedSecret,
  pointMultiply,
  pointAdd,
  scalarAdd,
  pointToUncompressed,
} from './keys.js';
import { keccak256, pubkeyToAddress, bytesToHex } from './utils.js';
import type { GenerateResult, CheckResult, DeriveResult } from '../types/index.js';

/**
 * Generate a stealth address (sender side).
 * Returns all intermediate values for step-by-step visualization.
 */
export function generateStealthAddress(
  spendPub: Uint8Array,
  viewPub: Uint8Array,
  ephPriv?: Uint8Array
): GenerateResult {
  // Step 1: Generate ephemeral private key
  const ephemeralPriv = ephPriv ?? generatePrivateKey();

  // Step 2: Compute ephemeral public key
  const ephemeralPub = derivePublicKey(ephemeralPriv, true);

  // Step 3: Parse P_spend and P_view (already have them)

  // Step 4: Compute shared secret s = p_ephemeral · P_view (ECDH)
  const sharedSecret = getSharedSecret(ephemeralPriv, viewPub);

  // Step 5: Hash shared secret s_h = keccak256(s)
  const sharedSecretHash = keccak256(sharedSecret);

  // Step 6: Extract view tag v = s_h[0]
  const viewTag = sharedSecretHash[0];

  // Step 7: Compute S_h = s_h · G (point multiplication)
  const sharedSecretHashPoint = pointMultiply(sharedSecretHash);

  // Step 8: Compute stealth public key P_stealth = P_spend + S_h
  const stealthPub = pointAdd(spendPub, sharedSecretHashPoint);

  // Step 9: Compute stealth address
  const stealthPubUncompressed = pointToUncompressed(stealthPub);
  const stealthAddress = pubkeyToAddress(stealthPubUncompressed);

  return {
    ephemeralPriv,
    ephemeralPub,
    spendPub,
    viewPub,
    sharedSecret,
    sharedSecretHash,
    viewTag,
    sharedSecretHashPoint,
    stealthPub,
    stealthAddress,
  };
}

/**
 * Check if a stealth address belongs to us (recipient side).
 * Returns all intermediate values for step-by-step visualization.
 */
export function checkStealthAddress(
  viewPriv: Uint8Array,
  spendPub: Uint8Array,
  ephemeralPub: Uint8Array,
  announcedViewTag: number,
  announcedAddress: string
): CheckResult {
  // Step 1: Compute shared secret s = p_view · P_ephemeral
  const sharedSecret = getSharedSecret(viewPriv, ephemeralPub);

  // Step 2: Hash s_h = keccak256(s)
  const sharedSecretHash = keccak256(sharedSecret);

  // Step 3: Extract view tag and compare
  const viewTag = sharedSecretHash[0];
  const viewTagMatch = viewTag === announcedViewTag;

  // Step 4: Early exit if view tags don't match
  if (!viewTagMatch) {
    return {
      sharedSecret,
      sharedSecretHash,
      viewTag,
      viewTagMatch: false,
      earlyExit: true,
    };
  }

  // Step 5: Compute S_h = s_h · G
  const sharedSecretHashPoint = pointMultiply(sharedSecretHash);

  // Step 6: Compute P_stealth = P_spend + S_h
  const stealthPub = pointAdd(spendPub, sharedSecretHashPoint);

  // Step 7: Compute stealth address
  const stealthPubUncompressed = pointToUncompressed(stealthPub);
  const stealthAddress = pubkeyToAddress(stealthPubUncompressed);

  // Step 8: Compare
  const match = stealthAddress.toLowerCase() === announcedAddress.toLowerCase();

  return {
    sharedSecret,
    sharedSecretHash,
    viewTag,
    viewTagMatch: true,
    earlyExit: false,
    sharedSecretHashPoint,
    stealthPub,
    stealthAddress,
    match,
  };
}

/**
 * Compute the stealth private key (recipient side).
 * Returns all intermediate values for step-by-step visualization.
 */
export function computeStealthKey(
  viewPriv: Uint8Array,
  spendPriv: Uint8Array,
  ephemeralPub: Uint8Array
): DeriveResult {
  // Step 1: Compute shared secret s = p_view · P_ephemeral
  const sharedSecret = getSharedSecret(viewPriv, ephemeralPub);

  // Step 2: Hash s_h = keccak256(s)
  const sharedSecretHash = keccak256(sharedSecret);

  // Step 3: Compute stealth private key p_stealth = p_spend + s_h (mod n)
  const stealthPriv = scalarAdd(spendPriv, sharedSecretHash);

  // Verification: derive public key and address
  const stealthPub = derivePublicKey(stealthPriv, true);
  const stealthPubUncompressed = pointToUncompressed(stealthPub);
  const stealthAddress = pubkeyToAddress(stealthPubUncompressed);

  return {
    sharedSecret,
    sharedSecretHash,
    stealthPriv,
    stealthPub,
    stealthAddress,
  };
}
