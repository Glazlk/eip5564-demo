import { checkStealthAddress } from '../../crypto/stealth.js';
import { formatValue } from '../../crypto/utils.js';
import { getCurrentFormat } from '../format.js';
import { Stepper } from '../stepper.js';
import { renderECDiagram } from '../ec-diagram.js';
import type { AppState, StepDef, CheckResult } from '../../types/index.js';

export function renderParse(container: HTMLElement, state: AppState): void {
  const section = document.createElement('section');
  section.id = 'parse';
  section.className = 'phase-section';

  section.innerHTML = `
    <h2 class="phase-title">phase 3: parse announcements</h2>
    <p class="phase-subtitle">Recipient checks if a stealth address belongs to them using their viewing key</p>
    <div class="parse-inputs">
      <div class="input-action-row">
        <div class="info-box">
          <p>Uses Phase 1 keys + Phase 2 ephemeral data to check ownership.</p>
        </div>
        <div class="parse-controls">
          <button class="btn btn-primary" id="btn-check-stealth">Check</button>
          <button class="btn btn-secondary" id="btn-wrong-tag">Wrong Tag</button>
        </div>
      </div>
    </div>
    <div class="phase-output">
      <div class="parse-stepper" id="parse-stepper"></div>
      <div class="parse-ec-diagram" id="parse-ec-diagram"></div>
    </div>
    <div class="parse-result" id="parse-result"></div>
  `;

  container.appendChild(section);

  const btnCheck = section.querySelector('#btn-check-stealth') as HTMLButtonElement;
  const btnWrongTag = section.querySelector('#btn-wrong-tag') as HTMLButtonElement;
  const stepperContainer = section.querySelector('#parse-stepper') as HTMLElement;
  const ecDiagramContainer = section.querySelector('#parse-ec-diagram') as HTMLElement;
  const resultContainer = section.querySelector('#parse-result') as HTMLElement;

  let stepper: Stepper | null = null;
  let useWrongTag = false;

  btnCheck.addEventListener('click', () => {
    useWrongTag = false;
    compute();
  });

  btnWrongTag.addEventListener('click', () => {
    useWrongTag = true;
    compute();
  });

  function compute(): void {
    if (!state.viewKeyPair || !state.spendKeyPair || !state.generateResult) {
      resultContainer.innerHTML = '<div class="error-msg">Please complete Phase 1 and Phase 2 first</div>';
      return;
    }

    const gen = state.generateResult;
    const viewTag = useWrongTag ? ((gen.viewTag + 42) % 256) : gen.viewTag;

    const result = checkStealthAddress(
      state.viewKeyPair.privateKey,
      state.spendKeyPair.publicKey,
      gen.ephemeralPub,
      viewTag,
      gen.stealthAddress
    );
    state.checkResult = result;
    document.dispatchEvent(new CustomEvent('state-updated'));

    if (state.mode === 'step') {
      renderStepMode(result, viewTag);
    } else {
      renderLiveMode(result, viewTag);
    }
  }

  function renderStepMode(r: CheckResult, announcedViewTag: number): void {
    if (stepper) stepper.destroy();
    stepperContainer.innerHTML = '';
    resultContainer.innerHTML = '';
    const fmt = getCurrentFormat();
    const gen = state.generateResult!;

    const steps: StepDef[] = [
      {
        id: 'check-shared-secret',
        title: 'Compute Shared Secret',
        formula: 's = p_view · P_ephemeral',
        description: 'The recipient performs ECDH using their viewing private key and the ephemeral public key from the announcement. This produces the same shared secret as the sender computed.',
        compute: () => {
          renderECDiagram(ecDiagramContainer, 'multiply', [
            { label: 'P_eph', color: 'var(--color-public)' },
            { label: 's', color: 'var(--color-shared)' },
          ]);
          return {
            'p_view · P_ephemeral': formatValue(r.sharedSecret, fmt),
          };
        },
      },
      {
        id: 'check-hash',
        title: 'Hash Shared Secret',
        formula: 's_h = keccak256(s)',
        description: 'Hash the shared secret using Keccak-256, same as the sender did.',
        compute: () => {
          ecDiagramContainer.innerHTML = '';
          return {
            's_h = keccak256(s)': formatValue(r.sharedSecretHash, fmt),
          };
        },
      },
      {
        id: 'check-view-tag',
        title: 'Compare View Tags',
        formula: 'v = s_h[0] === announced_view_tag ?',
        description: 'Extract the first byte of the hash and compare it with the announced view tag. If they don\'t match, this announcement is NOT for us — skip remaining steps (~6x speedup).',
        compute: () => ({
          'Computed View Tag': '0x' + r.viewTag.toString(16).padStart(2, '0'),
          'Announced View Tag': '0x' + announcedViewTag.toString(16).padStart(2, '0'),
          'Match': r.viewTagMatch ? 'YES — continue checking' : 'NO — Not for you!',
        }),
      },
    ];

    if (r.earlyExit) {
      // Add dimmed/skipped steps
      const skippedSteps: StepDef[] = [
        {
          id: 'skip-hash-point',
          title: 'Compute Hash Point (SKIPPED)',
          formula: 'S_h = s_h · G',
          description: 'SKIPPED — View tags did not match. This step would compute the hash point by multiplying the hash scalar by G.',
          compute: () => ({ 'Status': 'Skipped — ~6x speedup by checking view tag first' }),
        },
        {
          id: 'skip-stealth-pub',
          title: 'Compute Stealth Public Key (SKIPPED)',
          formula: 'P_stealth = P_spend + S_h',
          description: 'SKIPPED — View tags did not match.',
          compute: () => ({ 'Status': 'Skipped' }),
        },
        {
          id: 'skip-stealth-addr',
          title: 'Derive Stealth Address (SKIPPED)',
          formula: 'a_stealth = pubkeyToAddress(P_stealth)',
          description: 'SKIPPED — View tags did not match.',
          compute: () => ({ 'Status': 'Skipped' }),
        },
        {
          id: 'skip-compare',
          title: 'Compare Addresses (SKIPPED)',
          formula: 'a_stealth === announced_address ?',
          description: 'SKIPPED — View tags did not match.',
          compute: () => ({ 'Status': 'Skipped' }),
        },
      ];
      steps.push(...skippedSteps);
    } else {
      steps.push(
        {
          id: 'check-hash-point',
          title: 'Compute Hash Point',
          formula: 'S_h = s_h · G',
          description: 'View tags matched! Now compute the hash point for full address verification.',
          compute: () => {
            renderECDiagram(ecDiagramContainer, 'multiply', [
              { label: 'G', color: 'var(--color-highlight)' },
              { label: 'S_h', color: 'var(--color-shared)' },
            ]);
            return {
              'S_h': formatValue(r.sharedSecretHashPoint!, fmt),
            };
          },
        },
        {
          id: 'check-stealth-pub',
          title: 'Compute Stealth Public Key',
          formula: 'P_stealth = P_spend + S_h',
          description: 'Add the spending public key and hash point to reconstruct the stealth public key.',
          compute: () => {
            renderECDiagram(ecDiagramContainer, 'add', [
              { label: 'P_spend', color: 'var(--color-public)' },
              { label: 'S_h', color: 'var(--color-shared)' },
              { label: 'P_stealth', color: 'var(--color-address)' },
            ]);
            return {
              'P_stealth': formatValue(r.stealthPub!, fmt),
            };
          },
        },
        {
          id: 'check-stealth-addr',
          title: 'Derive Stealth Address',
          formula: 'a_stealth = pubkeyToAddress(P_stealth)',
          description: 'Compute the Ethereum address from the reconstructed stealth public key.',
          compute: () => {
            ecDiagramContainer.innerHTML = '';
            return {
              'Computed Address': r.stealthAddress!,
            };
          },
        },
        {
          id: 'check-compare',
          title: 'Compare Addresses',
          formula: 'computed_address === announced_address ?',
          description: 'Compare the computed stealth address with the one from the announcement. If they match, this transaction was sent to us!',
          compute: () => ({
            'Computed': r.stealthAddress!,
            'Announced': gen.stealthAddress,
            'Result': r.match ? 'MATCH — This is for you!' : 'NO MATCH — Not for you',
          }),
        }
      );
    }

    stepper = new Stepper(steps, stepperContainer);

    // Mark skipped steps visually
    if (r.earlyExit) {
      stepper.setOnStepChange((step) => {
        if (step >= 3) {
          const panels = stepperContainer.querySelectorAll('.flow-step-card');
          panels.forEach((p, i) => {
            if (i >= 3) {
              p.classList.add('step-skipped');
            }
          });
        }
      });
    }
  }

  function renderLiveMode(r: CheckResult, announcedViewTag: number): void {
    if (stepper) {
      stepper.destroy();
      stepper = null;
    }
    stepperContainer.innerHTML = '';
    ecDiagramContainer.innerHTML = '';
    const fmt = getCurrentFormat();
    const gen = state.generateResult!;

    let html = `
      <div class="live-results">
        <h3 class="live-title">Check Stealth Address — Live</h3>
        <div class="result-row">
          <span class="result-label shared-secret-color">1. s = p_view · P_ephemeral:</span>
          <code class="result-value">${formatValue(r.sharedSecret, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label shared-secret-color">2. s_h = keccak256(s):</span>
          <code class="result-value">${formatValue(r.sharedSecretHash, fmt)}</code>
        </div>
        <div class="result-row ${r.viewTagMatch ? 'result-success' : 'result-error'}">
          <span class="result-label">3. View Tag Check:</span>
          <code class="result-value">computed=0x${r.viewTag.toString(16).padStart(2, '0')} vs announced=0x${announcedViewTag.toString(16).padStart(2, '0')} → ${r.viewTagMatch ? 'MATCH' : 'NO MATCH'}</code>
        </div>
    `;

    if (r.earlyExit) {
      html += `
        <div class="result-row step-skipped">
          <span class="result-label">4-8. Remaining Steps:</span>
          <code class="result-value">SKIPPED — View tag mismatch (~6x speedup)</code>
        </div>
        <div class="result-row result-error result-highlight">
          <span class="result-label">Result:</span>
          <code class="result-value">NOT FOR YOU</code>
        </div>
      `;
    } else {
      html += `
        <div class="result-row">
          <span class="result-label shared-secret-color">5. S_h = s_h · G:</span>
          <code class="result-value">${formatValue(r.sharedSecretHashPoint!, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label public-key-color">6. P_stealth = P_spend + S_h:</span>
          <code class="result-value">${formatValue(r.stealthPub!, fmt)}</code>
        </div>
        <div class="result-row">
          <span class="result-label address-color">7. a_stealth = pubkeyToAddress(P_stealth):</span>
          <code class="result-value">${r.stealthAddress}</code>
        </div>
        <div class="result-row ${r.match ? 'result-success' : 'result-error'} result-highlight">
          <span class="result-label">8. Compare:</span>
          <code class="result-value">${r.match ? 'MATCH — This is for you!' : 'NO MATCH — Not for you'}</code>
        </div>
      `;
    }

    html += '</div>';
    resultContainer.innerHTML = html;
  }

  document.addEventListener('mode-change', () => {
    if (state.checkResult) compute();
  });
  document.addEventListener('format-change', () => {
    if (state.checkResult && state.mode === 'live') compute();
  });
}
