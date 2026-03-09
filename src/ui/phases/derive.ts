import { computeStealthKey } from '../../crypto/stealth.js';
import { formatValue } from '../../crypto/utils.js';
import { getCurrentFormat } from '../format.js';
import { Stepper } from '../stepper.js';
import { renderECDiagram } from '../ec-diagram.js';
import type { AppState, StepDef, DeriveResult } from '../../types/index.js';

export function renderDerive(container: HTMLElement, state: AppState): void {
  const section = document.createElement('section');
  section.id = 'derive';
  section.className = 'phase-section';

  section.innerHTML = `
    <h2 class="phase-title">phase 4: derive stealth private key</h2>
    <p class="phase-subtitle">Recipient computes the private key to control the stealth address</p>
    <div class="derive-inputs">
      <div class="input-action-row">
        <div class="info-box">
          <p>Uses p_spend, p_view, and P_ephemeral. <strong>Only the recipient</strong> can derive this key.</p>
        </div>
        <button class="btn btn-primary" id="btn-derive-key">Derive Key</button>
      </div>
    </div>
    <div class="phase-output">
      <div class="derive-stepper" id="derive-stepper"></div>
      <div class="derive-ec-diagram" id="derive-ec-diagram"></div>
    </div>
    <div class="derive-result" id="derive-result"></div>
  `;

  container.appendChild(section);

  const btnDerive = section.querySelector('#btn-derive-key') as HTMLButtonElement;
  const stepperContainer = section.querySelector('#derive-stepper') as HTMLElement;
  const ecDiagramContainer = section.querySelector('#derive-ec-diagram') as HTMLElement;
  const resultContainer = section.querySelector('#derive-result') as HTMLElement;

  let stepper: Stepper | null = null;

  btnDerive.addEventListener('click', () => compute());

  function compute(): void {
    if (!state.viewKeyPair || !state.spendKeyPair || !state.generateResult) {
      resultContainer.innerHTML = '<div class="error-msg">Please complete Phase 1 and Phase 2 first</div>';
      return;
    }

    const result = computeStealthKey(
      state.viewKeyPair.privateKey,
      state.spendKeyPair.privateKey,
      state.generateResult.ephemeralPub
    );
    state.deriveResult = result;
    document.dispatchEvent(new CustomEvent('state-updated'));

    if (state.mode === 'step') {
      renderStepMode(result);
    } else {
      renderLiveMode(result);
    }
  }

  function renderStepMode(r: DeriveResult): void {
    if (stepper) stepper.destroy();
    stepperContainer.innerHTML = '';
    resultContainer.innerHTML = '';
    const fmt = getCurrentFormat();
    const gen = state.generateResult!;

    const steps: StepDef[] = [
      {
        id: 'derive-shared-secret',
        title: 'Compute Shared Secret',
        formula: 's = p_view · P_ephemeral',
        description: 'Same as in the check step: compute the shared secret using the viewing private key and the ephemeral public key.',
        compute: () => {
          renderECDiagram(ecDiagramContainer, 'multiply', [
            { label: 'P_eph', color: 'var(--color-public)' },
            { label: 's', color: 'var(--color-shared)' },
          ]);
          return {
            's = p_view · P_ephemeral': formatValue(r.sharedSecret, fmt),
          };
        },
      },
      {
        id: 'derive-hash',
        title: 'Hash Shared Secret',
        formula: 's_h = keccak256(s)',
        description: 'Hash the shared secret to get a scalar value for key derivation.',
        compute: () => {
          ecDiagramContainer.innerHTML = '';
          return {
            's_h = keccak256(s)': formatValue(r.sharedSecretHash, fmt),
          };
        },
      },
      {
        id: 'derive-stealth-priv',
        title: 'Compute Stealth Private Key',
        formula: 'p_stealth = p_spend + s_h (mod n)',
        description: 'Add the spending private key and the hashed shared secret modulo the curve order n. This is the stealth private key that controls the stealth address.',
        compute: () => ({
          'p_spend': formatValue(state.spendKeyPair!.privateKey, fmt),
          's_h': formatValue(r.sharedSecretHash, fmt),
          'p_stealth = p_spend + s_h': formatValue(r.stealthPriv, fmt),
        }),
      },
    ];

    stepper = new Stepper(steps, stepperContainer);

    // Show verification after all steps
    stepper.setOnStepChange((step) => {
      if (step === 2) {
        showVerification(r, gen.stealthAddress);
      }
    });
  }

  function showVerification(r: DeriveResult, expectedAddress: string): void {
    const match = r.stealthAddress.toLowerCase() === expectedAddress.toLowerCase();
    resultContainer.innerHTML = `
      <div class="verification-box ${match ? 'verification-success' : 'verification-error'}">
        <h3>Verification</h3>
        <div class="result-row">
          <span class="result-label">p_stealth · G = P_stealth:</span>
          <code class="result-value">${formatValue(r.stealthPub, getCurrentFormat())}</code>
        </div>
        <div class="result-row">
          <span class="result-label">pubkeyToAddress(P_stealth):</span>
          <code class="result-value">${r.stealthAddress}</code>
        </div>
        <div class="result-row">
          <span class="result-label">Expected (from Phase 2):</span>
          <code class="result-value">${expectedAddress}</code>
        </div>
        <div class="verification-result ${match ? 'result-success' : 'result-error'}">
          ${match ? 'MATCH — The stealth private key correctly controls the stealth address!' : 'ERROR — Addresses do not match'}
        </div>
      </div>
    `;
  }

  function renderLiveMode(r: DeriveResult): void {
    if (stepper) {
      stepper.destroy();
      stepper = null;
    }
    stepperContainer.innerHTML = '';
    ecDiagramContainer.innerHTML = '';
    const fmt = getCurrentFormat();
    const gen = state.generateResult!;
    const match = r.stealthAddress.toLowerCase() === gen.stealthAddress.toLowerCase();

    resultContainer.innerHTML = `
      <div class="live-results">
        <h3 class="live-title">Derive Stealth Private Key — Live</h3>
        <div class="result-row">
          <span class="result-label shared-secret-color">1. s = p_view · P_ephemeral:</span>
          <code class="result-value">${formatValue(r.sharedSecret, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label shared-secret-color">2. s_h = keccak256(s):</span>
          <code class="result-value">${formatValue(r.sharedSecretHash, fmt)}</code>
        </div>
        <div class="result-row result-highlight">
          <span class="result-label private-key-color">3. p_stealth = p_spend + s_h:</span>
          <code class="result-value">${formatValue(r.stealthPriv, fmt)}</code>
        </div>
        <div class="verification-box ${match ? 'verification-success' : 'verification-error'}">
          <h4>Verification</h4>
          <div class="result-row">
            <span class="result-label">pubkeyToAddress(p_stealth · G):</span>
            <code class="result-value">${r.stealthAddress}</code>
          </div>
          <div class="result-row">
            <span class="result-label">Expected (Phase 2):</span>
            <code class="result-value">${gen.stealthAddress}</code>
          </div>
          <div class="verification-result ${match ? 'result-success' : 'result-error'}">
            ${match ? 'MATCH — Stealth private key verified!' : 'ERROR — Mismatch'}
          </div>
        </div>
      </div>
    `;
  }

  document.addEventListener('mode-change', () => {
    if (state.deriveResult) compute();
  });
  document.addEventListener('format-change', () => {
    if (state.deriveResult && state.mode === 'live') compute();
  });
}
