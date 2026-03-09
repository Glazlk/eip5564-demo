import type { StepDef } from '../types/index.js';

export class Stepper {
  private steps: StepDef[];
  private currentStep: number = -1;
  private isPlaying: boolean = false;
  private playSpeed: number = 1200;
  private playTimeout: number | null = null;
  private container: HTMLElement;
  private navContainer: HTMLElement;
  private flowContainer: HTMLElement;
  private onStepChange: ((step: number, values: Record<string, string>) => void) | null = null;
  private typewriterTimers: number[] = [];

  constructor(steps: StepDef[], container: HTMLElement) {
    this.steps = steps;
    this.container = container;

    this.navContainer = document.createElement('div');
    this.navContainer.className = 'stepper-nav';

    this.flowContainer = document.createElement('div');
    this.flowContainer.className = 'flow-pipeline';

    container.appendChild(this.navContainer);
    container.appendChild(this.flowContainer);

    this.renderNav();
    this.renderPipeline();
  }

  setOnStepChange(cb: (step: number, values: Record<string, string>) => void): void {
    this.onStepChange = cb;
  }

  private renderNav(): void {
    this.navContainer.innerHTML = '';

    // Play / Pause
    const btnPlay = document.createElement('button');
    btnPlay.className = 'stepper-btn flow-btn-play';
    btnPlay.innerHTML = this.isPlaying
      ? '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="3" height="8" fill="currentColor"/><rect x="6" y="1" width="3" height="8" fill="currentColor"/></svg>'
      : '<svg width="10" height="10" viewBox="0 0 10 10"><polygon points="2,1 9,5 2,9" fill="currentColor"/></svg>';
    btnPlay.title = this.isPlaying ? 'Pause' : 'Play animation';
    btnPlay.addEventListener('click', () => this.togglePlay());
    this.navContainer.appendChild(btnPlay);

    // Step forward
    const btnNext = document.createElement('button');
    btnNext.className = 'stepper-btn';
    btnNext.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><polygon points="1,1 6,5 1,9" fill="currentColor"/><rect x="7" y="1" width="2" height="8" fill="currentColor"/></svg>';
    btnNext.title = 'Next step';
    btnNext.addEventListener('click', () => this.next());
    this.navContainer.appendChild(btnNext);

    // Skip to end
    const btnEnd = document.createElement('button');
    btnEnd.className = 'stepper-btn';
    btnEnd.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><polygon points="0,1 4,5 0,9" fill="currentColor"/><polygon points="4,1 8,5 4,9" fill="currentColor"/><rect x="8" y="1" width="2" height="8" fill="currentColor"/></svg>';
    btnEnd.title = 'Show all steps';
    btnEnd.addEventListener('click', () => this.showAllInstant());
    this.navContainer.appendChild(btnEnd);

    // Reset
    const btnReset = document.createElement('button');
    btnReset.className = 'stepper-btn';
    btnReset.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M8,2 A4,4 0 1,0 8,8" fill="none" stroke="currentColor" stroke-width="1.5"/><polygon points="8,0 10,2.5 6,2.5" fill="currentColor"/></svg>';
    btnReset.title = 'Reset';
    btnReset.addEventListener('click', () => this.reset());
    this.navContainer.appendChild(btnReset);

    // Counter
    const counter = document.createElement('span');
    counter.className = 'step-counter';
    counter.textContent = `${Math.max(0, this.currentStep + 1)} / ${this.steps.length}`;
    this.navContainer.appendChild(counter);

    // Speed
    const speedControl = document.createElement('div');
    speedControl.className = 'speed-control';
    const speedLabel = document.createElement('span');
    speedLabel.textContent = 'Speed';
    const speedInput = document.createElement('input');
    speedInput.type = 'range';
    speedInput.min = '300';
    speedInput.max = '3000';
    speedInput.step = '100';
    // Invert: slider left = fast, right = slow visually
    // We store delay, so invert the slider value
    speedInput.value = String(3300 - this.playSpeed);
    speedInput.addEventListener('input', () => {
      this.playSpeed = 3300 - parseInt(speedInput.value);
      // Reschedule if currently playing
      if (this.isPlaying && this.playTimeout !== null) {
        clearTimeout(this.playTimeout);
        this.playTimeout = window.setTimeout(() => this.playNext(), this.playSpeed);
      }
    });
    speedControl.appendChild(speedLabel);
    speedControl.appendChild(speedInput);
    this.navContainer.appendChild(speedControl);
  }

  private renderPipeline(): void {
    this.flowContainer.innerHTML = '';

    this.steps.forEach((step, i) => {
      // Arrow connector (before each step except first)
      if (i > 0) {
        const arrow = document.createElement('div');
        arrow.className = 'flow-arrow-connector';
        arrow.innerHTML = `
          <svg width="24" height="32" viewBox="0 0 24 32">
            <line x1="12" y1="0" x2="12" y2="22" stroke="var(--border-accent)" stroke-width="1.5" stroke-dasharray="3,3" class="flow-arrow-line"/>
            <polygon points="7,20 12,28 17,20" fill="var(--border-accent)" class="flow-arrow-head"/>
          </svg>
        `;
        this.flowContainer.appendChild(arrow);
      }

      // Step card
      const card = document.createElement('div');
      card.className = 'flow-step-card flow-pending';
      card.id = `step-${step.id}`;
      card.dataset.stepIndex = String(i);

      // Step number badge
      const badge = document.createElement('div');
      badge.className = 'flow-step-badge';
      badge.textContent = String(i + 1);

      // Header
      const header = document.createElement('div');
      header.className = 'flow-step-header';
      header.appendChild(badge);
      const title = document.createElement('span');
      title.className = 'flow-step-title';
      title.textContent = step.title;
      header.appendChild(title);

      // Formula
      const formula = document.createElement('div');
      formula.className = 'flow-step-formula';
      formula.textContent = step.formula;

      // Description
      const desc = document.createElement('div');
      desc.className = 'flow-step-desc';
      desc.textContent = step.description;

      // Values output area
      const values = document.createElement('div');
      values.className = 'flow-step-values';

      card.appendChild(header);
      card.appendChild(formula);
      card.appendChild(desc);
      card.appendChild(values);
      this.flowContainer.appendChild(card);
    });
  }

  next(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.activateStep(this.currentStep + 1);
    }
  }

  prev(): void {
    if (this.currentStep > 0) {
      this.activateStep(this.currentStep - 1);
    }
  }

  goToStart(): void {
    this.activateStep(0);
  }

  goToEnd(): void {
    this.showAllInstant();
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;
    for (let i = 0; i <= index; i++) {
      this.executeStep(i);
    }
    this.currentStep = index;
    this.updateCardStates();
    this.updateNav();
  }

  showAll(): void {
    this.showAllInstant();
  }

  private activateStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;

    // Execute all prior steps instantly if skipped
    for (let i = 0; i < index; i++) {
      const card = this.flowContainer.querySelector(`[data-step-index="${i}"]`) as HTMLElement;
      if (card && card.classList.contains('flow-pending')) {
        this.executeStep(i);
      }
    }

    this.currentStep = index;
    this.executeStepAnimated(index);
    this.updateCardStates();
    this.updateNav();
    this.scrollToStep(index);
  }

  private executeStep(index: number): void {
    const step = this.steps[index];
    const values = step.compute();
    const card = this.flowContainer.querySelector(`[data-step-index="${index}"]`) as HTMLElement;
    if (!card) return;

    const valuesContainer = card.querySelector('.flow-step-values') as HTMLElement;
    if (valuesContainer) {
      valuesContainer.innerHTML = '';
      Object.entries(values).forEach(([key, val]) => {
        const row = document.createElement('div');
        row.className = 'flow-value-row';
        row.innerHTML = `<span class="flow-value-key">${key}</span><code class="flow-value-val">${val}</code>`;
        valuesContainer.appendChild(row);
      });
    }

    card.classList.remove('flow-pending');
    card.classList.add('flow-done');

    if (this.onStepChange) {
      this.onStepChange(index, values);
    }
  }

  private executeStepAnimated(index: number): void {
    const step = this.steps[index];
    const values = step.compute();
    const card = this.flowContainer.querySelector(`[data-step-index="${index}"]`) as HTMLElement;
    if (!card) return;

    // Activate the arrow above this step
    if (index > 0) {
      const arrows = this.flowContainer.querySelectorAll('.flow-arrow-connector');
      const arrow = arrows[index - 1] as HTMLElement;
      if (arrow) {
        arrow.classList.add('flow-arrow-active');
      }
    }

    card.classList.remove('flow-pending');
    card.classList.add('flow-active');

    const valuesContainer = card.querySelector('.flow-step-values') as HTMLElement;
    if (!valuesContainer) return;
    valuesContainer.innerHTML = '';

    // Typewriter animate each value row
    const entries = Object.entries(values);
    entries.forEach(([key, val], rowIndex) => {
      const row = document.createElement('div');
      row.className = 'flow-value-row flow-value-hidden';

      const keySpan = document.createElement('span');
      keySpan.className = 'flow-value-key';
      keySpan.textContent = key;

      const valCode = document.createElement('code');
      valCode.className = 'flow-value-val';

      row.appendChild(keySpan);
      row.appendChild(valCode);
      valuesContainer.appendChild(row);

      // Staggered reveal
      const revealDelay = rowIndex * 150;
      const timer1 = window.setTimeout(() => {
        row.classList.remove('flow-value-hidden');
        row.classList.add('flow-value-reveal');
        this.typewriteValue(valCode, val);
      }, revealDelay);
      this.typewriterTimers.push(timer1);
    });

    if (this.onStepChange) {
      this.onStepChange(index, values);
    }
  }

  private typewriteValue(element: HTMLElement, text: string): void {
    const len = text.length;
    // For very long strings, show in chunks
    const chunkSize = len > 40 ? Math.ceil(len / 20) : 1;
    const totalSteps = Math.ceil(len / chunkSize);
    const stepTime = Math.max(8, Math.min(30, 400 / totalSteps));

    let current = 0;
    const tick = () => {
      current += chunkSize;
      if (current >= len) {
        element.textContent = text;
        element.classList.add('flow-value-complete');
        return;
      }
      element.textContent = text.slice(0, current);
      const timer = window.setTimeout(tick, stepTime);
      this.typewriterTimers.push(timer);
    };
    tick();
  }

  private updateCardStates(): void {
    this.flowContainer.querySelectorAll('.flow-step-card').forEach((card) => {
      const idx = parseInt((card as HTMLElement).dataset.stepIndex ?? '-1');
      card.classList.remove('flow-active');
      if (idx < this.currentStep) {
        card.classList.remove('flow-pending');
        card.classList.add('flow-done');
      } else if (idx === this.currentStep) {
        card.classList.add('flow-active');
      }
    });

    // Activate all arrows up to current
    const arrows = this.flowContainer.querySelectorAll('.flow-arrow-connector');
    arrows.forEach((arrow, i) => {
      if (i < this.currentStep) {
        arrow.classList.add('flow-arrow-active');
      }
    });
  }

  private updateNav(): void {
    const counter = this.navContainer.querySelector('.step-counter');
    if (counter) {
      counter.textContent = `${this.currentStep + 1} / ${this.steps.length}`;
    }

    // Update play button icon
    const playBtn = this.navContainer.querySelector('.flow-btn-play');
    if (playBtn) {
      playBtn.innerHTML = this.isPlaying
        ? '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="3" height="8" fill="currentColor"/><rect x="6" y="1" width="3" height="8" fill="currentColor"/></svg>'
        : '<svg width="10" height="10" viewBox="0 0 10 10"><polygon points="2,1 9,5 2,9" fill="currentColor"/></svg>';
    }
  }

  private scrollToStep(index: number): void {
    const card = this.flowContainer.querySelector(`[data-step-index="${index}"]`) as HTMLElement;
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.stopPlay();
    } else {
      this.startPlay();
    }
    this.updateNav();
  }

  private startPlay(): void {
    this.isPlaying = true;
    if (this.currentStep >= this.steps.length - 1) {
      this.resetPipeline();
    }
    this.playNext();
  }

  private playNext(): void {
    if (!this.isPlaying) return;
    if (this.currentStep >= this.steps.length - 1) {
      this.stopPlay();
      this.updateNav();
      return;
    }
    this.next();
    this.playTimeout = window.setTimeout(() => this.playNext(), this.playSpeed);
  }

  private stopPlay(): void {
    this.isPlaying = false;
    if (this.playTimeout !== null) {
      clearTimeout(this.playTimeout);
      this.playTimeout = null;
    }
  }

  private showAllInstant(): void {
    this.stopPlay();
    this.clearTypewriters();
    for (let i = 0; i < this.steps.length; i++) {
      this.executeStep(i);
    }
    this.currentStep = this.steps.length - 1;
    this.updateCardStates();
    this.updateNav();

    // Activate all arrows
    this.flowContainer.querySelectorAll('.flow-arrow-connector').forEach((a) =>
      a.classList.add('flow-arrow-active')
    );

    // Make all active (not just done)
    this.flowContainer.querySelectorAll('.flow-step-card').forEach((card) => {
      card.classList.remove('flow-pending', 'flow-done');
      card.classList.add('flow-active');
    });
  }

  reset(): void {
    this.stopPlay();
    this.clearTypewriters();
    this.resetPipeline();
    this.updateNav();
  }

  private resetPipeline(): void {
    this.currentStep = -1;
    this.flowContainer.querySelectorAll('.flow-step-card').forEach((card) => {
      card.classList.remove('flow-active', 'flow-done');
      card.classList.add('flow-pending');
      const vals = card.querySelector('.flow-step-values');
      if (vals) vals.innerHTML = '';
    });
    this.flowContainer.querySelectorAll('.flow-arrow-connector').forEach((a) =>
      a.classList.remove('flow-arrow-active')
    );
  }

  private clearTypewriters(): void {
    this.typewriterTimers.forEach((t) => clearTimeout(t));
    this.typewriterTimers = [];
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  destroy(): void {
    this.stopPlay();
    this.clearTypewriters();
    this.container.innerHTML = '';
  }
}
