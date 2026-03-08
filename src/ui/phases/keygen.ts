import { generateKeyPair, derivePublicKey, encodeMetaAddress } from '../../crypto/keys.js';
import { bytesToHex, hexToBytes, isValidPrivateKey, formatValue } from '../../crypto/utils.js';
import { getCurrentFormat } from '../format.js';
import { Stepper } from '../stepper.js';
import { renderECDiagram } from '../ec-diagram.js';
import type { AppState, AppMode, StepDef, KeyPair, StealthMetaAddress } from '../../types/index.js';

export function renderKeygen(container: HTMLElement, state: AppState): void {
  const section = document.createElement('section');
  section.id = 'keygen';
  section.className = 'phase-section';

  section.innerHTML = `
    <h2 class="phase-title">Phase 1: Key Setup</h2>
    <p class="phase-subtitle">Generate or enter spending and viewing key pairs, then derive the stealth meta-address</p>
    <div class="keygen-inputs">
      <div class="key-input-group">
        <label class="key-label">
          <span class="label-text private-key-color">Spending Private Key (p_spend)</span>
          <div class="input-row">
            <input type="text" class="key-input" id="input-spend-priv" placeholder="Enter 64 hex chars or generate" />
            <button class="btn btn-generate" id="btn-gen-spend">Generate</button>
          </div>
          <div class="validation-msg" id="validation-spend"></div>
        </label>
      </div>
      <div class="key-input-group">
        <label class="key-label">
          <span class="label-text private-key-color">Viewing Private Key (p_view)</span>
          <div class="input-row">
            <input type="text" class="key-input" id="input-view-priv" placeholder="Enter 64 hex chars or generate" />
            <button class="btn btn-generate" id="btn-gen-view">Generate</button>
          </div>
          <div class="validation-msg" id="validation-view"></div>
        </label>
      </div>
      <button class="btn btn-primary" id="btn-gen-both">Generate Both Keys</button>
    </div>
    <div class="keygen-stepper" id="keygen-stepper"></div>
    <div class="keygen-ec-diagram" id="keygen-ec-diagram"></div>
    <div class="keygen-result" id="keygen-result"></div>
  `;

  container.appendChild(section);

  // Elements
  const inputSpend = section.querySelector('#input-spend-priv') as HTMLInputElement;
  const inputView = section.querySelector('#input-view-priv') as HTMLInputElement;
  const btnGenSpend = section.querySelector('#btn-gen-spend') as HTMLButtonElement;
  const btnGenView = section.querySelector('#btn-gen-view') as HTMLButtonElement;
  const btnGenBoth = section.querySelector('#btn-gen-both') as HTMLButtonElement;
  const validationSpend = section.querySelector('#validation-spend') as HTMLElement;
  const validationView = section.querySelector('#validation-view') as HTMLElement;
  const stepperContainer = section.querySelector('#keygen-stepper') as HTMLElement;
  const ecDiagramContainer = section.querySelector('#keygen-ec-diagram') as HTMLElement;
  const resultContainer = section.querySelector('#keygen-result') as HTMLElement;

  let stepper: Stepper | null = null;

  function setKey(input: HTMLInputElement, key: Uint8Array): void {
    input.value = bytesToHex(key);
    input.dispatchEvent(new Event('input'));
  }

  btnGenSpend.addEventListener('click', () => {
    const kp = generateKeyPair();
    setKey(inputSpend, kp.privateKey);
  });

  btnGenView.addEventListener('click', () => {
    const kp = generateKeyPair();
    setKey(inputView, kp.privateKey);
  });

  btnGenBoth.addEventListener('click', () => {
    const kpSpend = generateKeyPair();
    const kpView = generateKeyPair();
    setKey(inputSpend, kpSpend.privateKey);
    setKey(inputView, kpView.privateKey);
  });

  function validate(input: HTMLInputElement, msgEl: HTMLElement): boolean {
    const val = input.value.trim();
    if (!val) {
      msgEl.textContent = '';
      return false;
    }
    if (!isValidPrivateKey(val)) {
      msgEl.textContent = 'Invalid private key (must be 64 hex chars, within curve order)';
      msgEl.className = 'validation-msg error';
      return false;
    }
    msgEl.textContent = 'Valid';
    msgEl.className = 'validation-msg success';
    return true;
  }

  function computeAll(): void {
    const spendValid = validate(inputSpend, validationSpend);
    const viewValid = validate(inputView, validationView);

    if (!spendValid || !viewValid) return;

    const spendPriv = hexToBytes(inputSpend.value.trim());
    const viewPriv = hexToBytes(inputView.value.trim());
    const spendPub = derivePublicKey(spendPriv, true);
    const viewPub = derivePublicKey(viewPriv, true);
    const metaAddr = encodeMetaAddress(spendPub, viewPub);

    state.spendKeyPair = { privateKey: spendPriv, publicKey: spendPub };
    state.viewKeyPair = { privateKey: viewPriv, publicKey: viewPub };
    state.metaAddress = { spendPubKey: spendPub, viewPubKey: viewPub, encoded: metaAddr };

    if (state.mode === 'step') {
      renderStepMode(spendPriv, viewPriv, spendPub, viewPub, metaAddr);
    } else {
      renderLiveMode(spendPriv, viewPriv, spendPub, viewPub, metaAddr);
    }
  }

  function renderStepMode(
    spendPriv: Uint8Array, viewPriv: Uint8Array,
    spendPub: Uint8Array, viewPub: Uint8Array,
    metaAddr: string
  ): void {
    if (stepper) stepper.destroy();
    stepperContainer.innerHTML = '';
    resultContainer.innerHTML = '';

    const fmt = getCurrentFormat();

    const steps: StepDef[] = [
      {
        id: 'spend-key',
        title: 'Compute Spending Public Key',
        formula: 'P_spend = p_spend · G',
        description: 'Multiply the spending private key by the generator point G on the secp256k1 curve to get the spending public key.',
        compute: () => {
          renderECDiagram(ecDiagramContainer, 'multiply', [
            { label: 'G', color: 'var(--color-highlight)' },
            { label: 'P_spend', color: 'var(--color-public)' },
          ]);
          return {
            'p_spend': formatValue(spendPriv, fmt),
            'P_spend': formatValue(spendPub, fmt),
          };
        },
      },
      {
        id: 'view-key',
        title: 'Compute Viewing Public Key',
        formula: 'P_view = p_view · G',
        description: 'Multiply the viewing private key by the generator point G to get the viewing public key.',
        compute: () => {
          renderECDiagram(ecDiagramContainer, 'multiply', [
            { label: 'G', color: 'var(--color-highlight)' },
            { label: 'P_view', color: 'var(--color-public)' },
          ]);
          return {
            'p_view': formatValue(viewPriv, fmt),
            'P_view': formatValue(viewPub, fmt),
          };
        },
      },
      {
        id: 'meta-address',
        title: 'Compose Stealth Meta-Address',
        formula: 'st:eth:0x<P_spend><P_view>',
        description: 'Concatenate spending and viewing public keys to form the stealth meta-address. This is shared publicly.',
        compute: () => {
          ecDiagramContainer.innerHTML = '';
          return {
            'Stealth Meta-Address': metaAddr,
          };
        },
      },
    ];

    stepper = new Stepper(steps, stepperContainer);
  }

  function renderLiveMode(
    spendPriv: Uint8Array, viewPriv: Uint8Array,
    spendPub: Uint8Array, viewPub: Uint8Array,
    metaAddr: string
  ): void {
    if (stepper) {
      stepper.destroy();
      stepper = null;
    }
    stepperContainer.innerHTML = '';
    ecDiagramContainer.innerHTML = '';
    const fmt = getCurrentFormat();

    resultContainer.innerHTML = `
      <div class="live-results">
        <div class="result-row">
          <span class="result-label private-key-color">p_spend:</span>
          <code class="result-value">${formatValue(spendPriv, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label public-key-color">P_spend = p_spend · G:</span>
          <code class="result-value">${formatValue(spendPub, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label private-key-color">p_view:</span>
          <code class="result-value">${formatValue(viewPriv, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label public-key-color">P_view = p_view · G:</span>
          <code class="result-value">${formatValue(viewPub, fmt)}</code>
        </div>
        <div class="result-row result-highlight">
          <span class="result-label address-color">Stealth Meta-Address:</span>
          <code class="result-value meta-address-value">${metaAddr}</code>
        </div>
      </div>
    `;
    resultContainer.classList.add('value-changed');
    setTimeout(() => resultContainer.classList.remove('value-changed'), 600);
  }

  inputSpend.addEventListener('input', computeAll);
  inputView.addEventListener('input', computeAll);

  // Re-render on mode change
  document.addEventListener('mode-change', () => {
    if (state.spendKeyPair && state.viewKeyPair) {
      computeAll();
    }
  });

  // Re-render on format change
  document.addEventListener('format-change', () => {
    if (state.spendKeyPair && state.viewKeyPair) {
      computeAll();
    }
  });
}
