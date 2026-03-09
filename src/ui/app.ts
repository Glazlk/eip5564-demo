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
        <span class="app-title">eip-5564</span>
        <span class="app-subtitle">stealth addresses</span>
      </div>
      <div class="header-controls">
        <div class="mode-toggle" id="mode-toggle"></div>
        <div id="format-toggle-container"></div>
      </div>
    `;

    this.root.appendChild(header);

    const modeToggle = header.querySelector('#mode-toggle') as HTMLElement;
    this.renderModeToggle(modeToggle);

    const formatContainer = header.querySelector('#format-toggle-container') as HTMLElement;
    renderFormatToggle(formatContainer);
  }

  private renderModeToggle(container: HTMLElement): void {
    const modes: { id: AppMode; label: string }[] = [
      { id: 'step', label: 'Step' },
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

    renderOverview(content);
    renderKeygen(content, this.state);
    renderGenerate(content, this.state);
    renderParse(content, this.state);
    renderDerive(content, this.state);
    renderAnnouncer(content, this.state);

    // Footer
    const footer = document.createElement('footer');
    footer.className = 'app-footer';
    footer.innerHTML = `
      <a href="https://github.com/Glazlk/eip5564-demo" target="_blank" rel="noopener">GitHub</a>
    `;
    content.appendChild(footer);

    this.root.appendChild(content);
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
