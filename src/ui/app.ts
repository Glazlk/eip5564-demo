import type { AppState, AppMode, PhaseId } from '../types/index.js';
import { renderFormatToggle } from './format.js';
import { renderOverview } from './phases/overview.js';
import { renderKeygen } from './phases/keygen.js';
import { renderGenerate } from './phases/generate.js';
import { renderParse } from './phases/parse.js';
import { renderDerive } from './phases/derive.js';
import { renderAnnouncer } from './phases/announcer.js';

export class App {
  private root: HTMLElement;
  private state: AppState;

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = {
      mode: 'step',
      format: 'hex',
      spendKeyPair: null,
      viewKeyPair: null,
      metaAddress: null,
      generateResult: null,
      checkResult: null,
      deriveResult: null,
    };
  }

  init(): void {
    this.renderHeader();
    this.renderContent();
    this.setupHashNavigation();
    this.handleInitialHash();
  }

  private renderHeader(): void {
    const header = document.createElement('header');
    header.className = 'app-header';

    header.innerHTML = `
      <div class="header-top">
        <h1 class="app-title">EIP-5564 Stealth Addresses</h1>
        <span class="app-subtitle">Interactive Cryptographic Demo</span>
      </div>
      <div class="header-controls">
        <div class="mode-toggle-container">
          <div class="mode-toggle" id="mode-toggle"></div>
        </div>
        <div class="format-toggle-container" id="format-toggle-container"></div>
      </div>
    `;

    this.root.appendChild(header);

    // Render mode toggle
    const modeToggle = header.querySelector('#mode-toggle') as HTMLElement;
    this.renderModeToggle(modeToggle);

    // Render format toggle
    const formatContainer = header.querySelector('#format-toggle-container') as HTMLElement;
    renderFormatToggle(formatContainer);
  }

  private renderModeToggle(container: HTMLElement): void {
    const modes: { id: AppMode; label: string }[] = [
      { id: 'step', label: 'Step-by-step' },
      { id: 'live', label: 'Live' },
    ];

    modes.forEach(({ id, label }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.className = `toggle-btn ${id === this.state.mode ? 'active' : ''}`;
      btn.addEventListener('click', () => {
        container.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.mode = id;
        document.dispatchEvent(new CustomEvent('mode-change', { detail: id }));
      });
      container.appendChild(btn);
    });
  }

  private renderContent(): void {
    const content = document.createElement('main');
    content.className = 'app-content';

    // Run Full Demo button
    const demoBtn = document.createElement('div');
    demoBtn.className = 'full-demo-container';
    demoBtn.innerHTML = `<button class="btn btn-hero" id="btn-full-demo">Run Full Demo</button>`;
    content.appendChild(demoBtn);

    renderOverview(content);
    renderKeygen(content, this.state);
    renderGenerate(content, this.state);
    renderParse(content, this.state);
    renderDerive(content, this.state);
    renderAnnouncer(content, this.state);

    this.root.appendChild(content);

    // Full demo button handler
    const fullDemoBtn = content.querySelector('#btn-full-demo') as HTMLButtonElement;
    fullDemoBtn.addEventListener('click', () => this.runFullDemo());
  }

  private async runFullDemo(): Promise<void> {
    const btn = document.querySelector('#btn-full-demo') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Running Demo...';

    try {
      // Phase 1: Generate keys
      this.scrollToPhase('keygen');
      const genBothBtn = document.querySelector('#btn-gen-both') as HTMLButtonElement;
      genBothBtn.click();
      await this.delay(1500);

      // Phase 2: Generate stealth address
      this.scrollToPhase('generate');
      const computeBtn = document.querySelector('#btn-compute-stealth') as HTMLButtonElement;
      computeBtn.click();
      await this.delay(1500);

      // Phase 3: Check stealth address
      this.scrollToPhase('parse');
      const checkBtn = document.querySelector('#btn-check-stealth') as HTMLButtonElement;
      checkBtn.click();
      await this.delay(1500);

      // Phase 4: Derive stealth key
      this.scrollToPhase('derive');
      const deriveBtn = document.querySelector('#btn-derive-key') as HTMLButtonElement;
      deriveBtn.click();
      await this.delay(1500);

      // Phase 5: Announcer
      this.scrollToPhase('announcer');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Run Full Demo';
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private scrollToPhase(phase: PhaseId): void {
    const el = document.getElementById(phase);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      location.hash = phase;
    }
  }

  private setupHashNavigation(): void {
    window.addEventListener('hashchange', () => {
      const hash = location.hash.slice(1) as PhaseId;
      this.scrollToPhase(hash);
    });
  }

  private handleInitialHash(): void {
    if (location.hash) {
      const hash = location.hash.slice(1) as PhaseId;
      setTimeout(() => this.scrollToPhase(hash), 100);
    }
  }
}
