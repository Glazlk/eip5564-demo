export type DisplayFormat = 'hex' | 'dec' | 'bin';

export type AppMode = 'step' | 'live';

export type PhaseId = 'overview' | 'keygen' | 'generate' | 'parse' | 'derive' | 'announcer';

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface StealthMetaAddress {
  spendPubKey: Uint8Array;
  viewPubKey: Uint8Array;
  encoded: string;
}

export interface StepDef {
  id: string;
  title: string;
  formula: string;
  description: string;
  compute: () => Record<string, string>;
}

export interface GenerateResult {
  ephemeralPriv: Uint8Array;
  ephemeralPub: Uint8Array;
  spendPub: Uint8Array;
  viewPub: Uint8Array;
  sharedSecret: Uint8Array;
  sharedSecretHash: Uint8Array;
  viewTag: number;
  sharedSecretHashPoint: Uint8Array;
  stealthPub: Uint8Array;
  stealthAddress: string;
}

export interface CheckResult {
  sharedSecret: Uint8Array;
  sharedSecretHash: Uint8Array;
  viewTag: number;
  viewTagMatch: boolean;
  earlyExit: boolean;
  sharedSecretHashPoint?: Uint8Array;
  stealthPub?: Uint8Array;
  stealthAddress?: string;
  match?: boolean;
}

export interface DeriveResult {
  sharedSecret: Uint8Array;
  sharedSecretHash: Uint8Array;
  stealthPriv: Uint8Array;
  stealthPub: Uint8Array;
  stealthAddress: string;
}

export interface Announcement {
  schemeId: number;
  stealthAddress: string;
  caller: string;
  ephemeralPubKey: Uint8Array;
  metadata: Uint8Array;
}

export interface AnnouncementMetadata {
  viewTag: number;
  functionSelector: Uint8Array;
  tokenAddress: Uint8Array;
  amount: bigint;
}

export interface AppState {
  mode: AppMode;
  format: DisplayFormat;
  spendKeyPair: KeyPair | null;
  viewKeyPair: KeyPair | null;
  metaAddress: StealthMetaAddress | null;
  generateResult: GenerateResult | null;
  checkResult: CheckResult | null;
  deriveResult: DeriveResult | null;
}
