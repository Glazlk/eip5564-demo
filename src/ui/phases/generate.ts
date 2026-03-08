import { generateStealthAddress } from '../../crypto/stealth.js';
import { generatePrivateKey } from '../../crypto/keys.js';
import { bytesToHex, hexToBytes, formatValue, isValidPrivateKey } from '../../crypto/utils.js';
import { getCurrentFormat } from '../format.js';
import { Stepper } from '../stepper.js';
import { renderECDiagram } from '../ec-diagram.js';
import type { AppState, StepDef, GenerateResult } from '../../types/index.js';

export function renderGenerate(container: HTMLElement, state: AppState): void {
  const section = document.createElement('section');
  section.id = 'generate';
  section.className = 'phase-section';

  section.innerHTML = `
    <h2 class="phase-title">Phase 2: Generate Stealth Address</h2>
    <p class="phase-subtitle">Sender creates a one-time stealth address from the recipient's stealth meta-address</p>
    <div class="generate-inputs">
      <div class="key-input-group">
        <label class="key-label">
          <span class="label-text">Stealth Meta-Address (from Phase 1)</span>
          <input type="text" class="key-input meta-input" id="input-meta-address" placeholder="st:eth:0x..." readonly />
        </label>
      </div>
      <div class="key-input-group">
        <label class="key-label">
          <span class="label-text private-key-color">Ephemeral Private Key (p_ephemeral)</span>
          <div class="input-row">
            <input type="text" class="key-input" id="input-eph-priv" placeholder="Auto-generated or enter 64 hex chars" />
            <button class="btn btn-generate" id="btn-gen-eph">Generate</button>
          </div>
        </label>
      </div>
      <button class="btn btn-primary" id="btn-compute-stealth">Compute Stealth Address</button>
    </div>
    <div class="generate-stepper" id="generate-stepper"></div>
    <div class="generate-ec-diagram" id="generate-ec-diagram"></div>
    <div class="generate-result" id="generate-result"></div>
  `;

  container.appendChild(section);

  const inputMeta = section.querySelector('#input-meta-address') as HTMLInputElement;
  const inputEph = section.querySelector('#input-eph-priv') as HTMLInputElement;
  const btnGenEph = section.querySelector('#btn-gen-eph') as HTMLButtonElement;
  const btnCompute = section.querySelector('#btn-compute-stealth') as HTMLButtonElement;
  const stepperContainer = section.querySelector('#generate-stepper') as HTMLElement;
  const ecDiagramContainer = section.querySelector('#generate-ec-diagram') as HTMLElement;
  const resultContainer = section.querySelector('#generate-result') as HTMLElement;

  let stepper: Stepper | null = null;

  // Auto-fill meta address from state
  function syncMetaAddress(): void {
    if (state.metaAddress) {
      inputMeta.value = state.metaAddress.encoded;
    }
  }

  syncMetaAddress();
  document.addEventListener('state-updated', syncMetaAddress);

  btnGenEph.addEventListener('click', () => {
    const key = generatePrivateKey();
    inputEph.value = bytesToHex(key);
  });

  btnCompute.addEventListener('click', () => compute());

  function compute(): void {
    if (!state.metaAddress) {
      resultContainer.innerHTML = '<div class="error-msg">Please complete Phase 1 first (Key Setup)</div>';
      return;
    }

    let ephPriv: Uint8Array;
    if (inputEph.value.trim() && isValidPrivateKey(inputEph.value.trim())) {
      ephPriv = hexToBytes(inputEph.value.trim());
    } else {
      ephPriv = generatePrivateKey();
      inputEph.value = bytesToHex(ephPriv);
    }

    const result = generateStealthAddress(
      state.metaAddress.spendPubKey,
      state.metaAddress.viewPubKey,
      ephPriv
    );
    state.generateResult = result;
    document.dispatchEvent(new CustomEvent('state-updated'));

    if (state.mode === 'step') {
      renderStepMode(result);
    } else {
      renderLiveMode(result);
    }
  }

  function renderStepMode(r: GenerateResult): void {
    if (stepper) stepper.destroy();
    stepperContainer.innerHTML = '';
    resultContainer.innerHTML = '';
    const fmt = getCurrentFormat();

    const steps: StepDef[] = [
      {
        id: 'gen-eph-priv',
        title: 'Generate Ephemeral Private Key',
        formula: 'p_ephemeral ← random 32 bytes',
        description: 'The sender generates a random ephemeral (one-time) private key. This key is used only for this specific stealth address generation.',
        compute: () => ({
          'p_ephemeral': formatValue(r.ephemeralPriv, fmt),
        }),
      },
      {
        id: 'gen-eph-pub',
        title: 'Compute Ephemeral Public Key',
        formula: 'P_ephemeral = p_ephemeral · G',
        description: 'Multiply the ephemeral private key by the generator point G to get the ephemeral public key. This will be published in the Announcement.',
        compute: () => {
          renderECDiagram(ecDiagramContainer, 'multiply', [
            { label: 'G', color: 'var(--color-highlight)' },
            { label: 'P_eph', color: 'var(--color-public)' },
          ]);
          return {
            'P_ephemeral': formatValue(r.ephemeralPub, fmt),
          };
        },
      },
      {
        id: 'parse-meta',
        title: 'Parse Stealth Meta-Address',
        formula: 'st:eth:0x<P_spend><P_view> → P_spend, P_view',
        description: 'Extract the spending and viewing public keys from the recipient\'s stealth meta-address.',
        compute: () => {
          ecDiagramContainer.innerHTML = '';
          return {
            'P_spend': formatValue(r.spendPub, fmt),
            'P_view': formatValue(r.viewPub, fmt),
          };
        },
      },
      {
        id: 'shared-secret',
        title: 'Compute Shared Secret (ECDH)',
        formula: 's = p_ephemeral · P_view',
        description: 'Perform ECDH: multiply the ephemeral private key by the recipient\'s viewing public key. This shared secret can also be computed by the recipient using p_view · P_ephemeral.',
        compute: () => {
          renderECDiagram(ecDiagramContainer, 'multiply', [
            { label: 'P_view', color: 'var(--color-public)' },
            { label: 's', color: 'var(--color-shared)' },
          ]);
          return {
            's (shared secret)': formatValue(r.sharedSecret, fmt),
          };
        },
      },
      {
        id: 'hash-secret',
        title: 'Hash Shared Secret',
        formula: 's_h = keccak256(s)',
        description: 'Hash the compressed shared secret point using Keccak-256. This produces a 32-byte hash that will be used as a scalar for point multiplication.',
        compute: () => {
          ecDiagramContainer.innerHTML = '';
          return {
            's_h = keccak256(s)': formatValue(r.sharedSecretHash, fmt),
          };
        },
      },
      {
        id: 'view-tag',
        title: 'Extract View Tag',
        formula: 'v = s_h[0]',
        description: 'The view tag is the first byte of the hashed shared secret. Recipients can quickly check this byte to filter announcements without computing the full stealth address (~6x speedup).',
        compute: () => ({
          'View Tag (v)': '0x' + r.viewTag.toString(16).padStart(2, '0'),
          'View Tag (decimal)': String(r.viewTag),
        }),
      },
      {
        id: 'hash-point',
        title: 'Compute Hash Point',
        formula: 'S_h = s_h · G',
        description: 'Multiply the hashed shared secret (as a scalar) by the generator point G. This converts the hash into a point on the curve.',
        compute: () => {
          renderECDiagram(ecDiagramContainer, 'multiply', [
            { label: 'G', color: 'var(--color-highlight)' },
            { label: 'S_h', color: 'var(--color-shared)' },
          ]);
          return {
            'S_h = s_h · G': formatValue(r.sharedSecretHashPoint, fmt),
          };
        },
      },
      {
        id: 'stealth-pub',
        title: 'Compute Stealth Public Key',
        formula: 'P_stealth = P_spend + S_h',
        description: 'Add the spending public key and the hash point using EC point addition. The result is the stealth public key — only the recipient can derive the corresponding private key.',
        compute: () => {
          renderECDiagram(ecDiagramContainer, 'add', [
            { label: 'P_spend', color: 'var(--color-public)' },
            { label: 'S_h', color: 'var(--color-shared)' },
            { label: 'P_stealth', color: 'var(--color-address)' },
          ]);
          return {
            'P_stealth': formatValue(r.stealthPub, fmt),
          };
        },
      },
      {
        id: 'stealth-addr',
        title: 'Derive Stealth Address',
        formula: 'a_stealth = pubkeyToAddress(P_stealth)',
        description: 'Compute the Ethereum address from the stealth public key: take the Keccak-256 hash of the uncompressed public key (without 0x04 prefix), then take the last 20 bytes.',
        compute: () => {
          ecDiagramContainer.innerHTML = '';
          return {
            'Stealth Address': r.stealthAddress,
          };
        },
      },
    ];

    stepper = new Stepper(steps, stepperContainer);
  }

  function renderLiveMode(r: GenerateResult): void {
    if (stepper) {
      stepper.destroy();
      stepper = null;
    }
    stepperContainer.innerHTML = '';
    ecDiagramContainer.innerHTML = '';
    const fmt = getCurrentFormat();

    resultContainer.innerHTML = `
      <div class="live-results">
        <h3 class="live-title">All Steps — Live Computation</h3>
        <div class="result-row">
          <span class="result-label private-key-color">1. p_ephemeral (random):</span>
          <code class="result-value">${formatValue(r.ephemeralPriv, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label public-key-color">2. P_ephemeral = p_eph · G:</span>
          <code class="result-value">${formatValue(r.ephemeralPub, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label public-key-color">3. P_spend (from meta-address):</span>
          <code class="result-value">${formatValue(r.spendPub, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label public-key-color">3. P_view (from meta-address):</span>
          <code class="result-value">${formatValue(r.viewPub, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label shared-secret-color">4. s = p_eph · P_view (ECDH):</span>
          <code class="result-value">${formatValue(r.sharedSecret, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label shared-secret-color">5. s_h = keccak256(s):</span>
          <code class="result-value">${formatValue(r.sharedSecretHash, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label">6. View Tag v = s_h[0]:</span>
          <code class="result-value">0x${r.viewTag.toString(16).padStart(2, '0')} (${r.viewTag})</code>
        </div>
        <div class="result-row">
          <span class="result-label shared-secret-color">7. S_h = s_h · G:</span>
          <code class="result-value">${formatValue(r.sharedSecretHashPoint, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label public-key-color">8. P_stealth = P_spend + S_h:</span>
          <code class="result-value">${formatValue(r.stealthPub, fmt)}</code>
        </div>
        <div class="result-row result-highlight">
          <span class="result-label address-color">9. Stealth Address:</span>
          <code class="result-value">${r.stealthAddress}</code>
        </div>
      </div>
    `;
    resultContainer.classList.add('value-changed');
    setTimeout(() => resultContainer.classList.remove('value-changed'), 600);
  }

  // Auto-compute on mode/format change if we have results
  document.addEventListener('mode-change', () => {
    if (state.generateResult) compute();
  });
  document.addEventListener('format-change', () => {
    if (state.generateResult) {
      if (state.mode === 'live') renderLiveMode(state.generateResult);
    }
  });
}
