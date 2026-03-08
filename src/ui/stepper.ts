import type { StepDef } from '../types/index.js';

export class Stepper {
  private steps: StepDef[];
  private currentStep: number = -1;
  private isPlaying: boolean = false;
  private playSpeed: number = 1500;
  private playInterval: number | null = null;
  private container: HTMLElement;
  private navContainer: HTMLElement;
  private stepsContainer: HTMLElement;
  private onStepChange: ((step: number, values: Record<string, string>) => void) | null = null;

  constructor(steps: StepDef[], container: HTMLElement) {
    this.steps = steps;
    this.container = container;

    this.navContainer = document.createElement('div');
    this.navContainer.className = 'stepper-nav';

    this.stepsContainer = document.createElement('div');
    this.stepsContainer.className = 'stepper-steps';

    container.appendChild(this.navContainer);
    container.appendChild(this.stepsContainer);

    this.renderNav();
    this.renderStepPanels();
  }

  setOnStepChange(cb: (step: number, values: Record<string, string>) => void): void {
    this.onStepChange = cb;
  }

  private renderNav(): void {
    this.navContainer.innerHTML = '';

    const controls = [
      { label: '⏮', action: () => this.goToStart(), title: 'Go to start' },
      { label: '◀', action: () => this.prev(), title: 'Previous step' },
      { label: '▶', action: () => this.next(), title: 'Next step' },
      { label: this.isPlaying ? '⏸' : '▶▶', action: () => this.togglePlay(), title: this.isPlaying ? 'Pause' : 'Auto-play' },
      { label: '⏭', action: () => this.goToEnd(), title: 'Go to end' },
    ];

    controls.forEach(({ label, action, title }) => {
      const btn = document.createElement('button');
      btn.className = 'stepper-btn';
      btn.textContent = label;
      btn.title = title;
      btn.addEventListener('click', action);
      this.navContainer.appendChild(btn);
    });

    const counter = document.createElement('span');
    counter.className = 'step-counter';
    counter.textContent = `Step ${this.currentStep + 1} / ${this.steps.length}`;
    this.navContainer.appendChild(counter);

    // Speed control
    const speedControl = document.createElement('div');
    speedControl.className = 'speed-control';
    const speedLabel = document.createElement('label');
    speedLabel.textContent = 'Speed: ';
    const speedInput = document.createElement('input');
    speedInput.type = 'range';
    speedInput.min = '300';
    speedInput.max = '3000';
    speedInput.value = String(this.playSpeed);
    speedInput.addEventListener('input', () => {
      this.playSpeed = parseInt(speedInput.value);
      if (this.isPlaying) {
        this.stopPlay();
        this.startPlay();
      }
    });
    speedControl.appendChild(speedLabel);
    speedControl.appendChild(speedInput);
    this.navContainer.appendChild(speedControl);
  }

  private renderStepPanels(): void {
    this.stepsContainer.innerHTML = '';
    this.steps.forEach((step, i) => {
      const panel = document.createElement('div');
      panel.className = 'step-panel hidden';
      panel.id = `step-${step.id}`;
      panel.dataset.stepIndex = String(i);

      const header = document.createElement('div');
      header.className = 'step-header';
      header.innerHTML = `<span class="step-number">Step ${i + 1}</span> <span class="step-title">${step.title}</span>`;

      const formula = document.createElement('div');
      formula.className = 'step-formula';
      formula.textContent = step.formula;

      const desc = document.createElement('div');
      desc.className = 'step-description';
      desc.textContent = step.description;

      const values = document.createElement('div');
      values.className = 'step-values';

      panel.appendChild(header);
      panel.appendChild(formula);
      panel.appendChild(desc);
      panel.appendChild(values);
      this.stepsContainer.appendChild(panel);
    });
  }

  next(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.goToStep(this.currentStep + 1);
    }
  }

  prev(): void {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
    }
  }

  goToStart(): void {
    this.goToStep(0);
  }

  goToEnd(): void {
    // Execute all steps
    for (let i = 0; i <= this.steps.length - 1; i++) {
      if (i > this.currentStep) {
        this.executeStep(i);
      }
    }
    this.goToStep(this.steps.length - 1);
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;

    // Execute all steps up to and including the target
    for (let i = 0; i <= index; i++) {
      this.executeStep(i);
    }

    this.currentStep = index;
    this.updateUI();
  }

  private executeStep(index: number): void {
    const step = this.steps[index];
    const values = step.compute();
    const panel = this.stepsContainer.querySelector(`[data-step-index="${index}"]`);
    if (panel) {
      const valuesContainer = panel.querySelector('.step-values');
      if (valuesContainer) {
        valuesContainer.innerHTML = '';
        Object.entries(values).forEach(([key, val]) => {
          const row = document.createElement('div');
          row.className = 'step-value-row';
          row.innerHTML = `<span class="step-value-key">${key}:</span> <code class="step-value-val">${val}</code>`;
          valuesContainer.appendChild(row);
        });
      }
    }
    if (this.onStepChange) {
      this.onStepChange(index, values);
    }
  }

  private updateUI(): void {
    // Update step panels visibility
    this.stepsContainer.querySelectorAll('.step-panel').forEach((panel) => {
      const idx = parseInt((panel as HTMLElement).dataset.stepIndex ?? '-1');
      panel.classList.remove('hidden', 'active', 'dimmed');
      if (idx > this.currentStep) {
        panel.classList.add('hidden');
      } else if (idx === this.currentStep) {
        panel.classList.add('active');
      } else {
        panel.classList.add('dimmed');
      }
    });

    // Update counter
    const counter = this.navContainer.querySelector('.step-counter');
    if (counter) {
      counter.textContent = `Step ${this.currentStep + 1} / ${this.steps.length}`;
    }

    // Update play button
    const playBtn = this.navContainer.querySelectorAll('.stepper-btn')[3];
    if (playBtn) {
      playBtn.textContent = this.isPlaying ? '⏸' : '▶▶';
    }
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.stopPlay();
    } else {
      this.startPlay();
    }
    this.updateUI();
  }

  private startPlay(): void {
    this.isPlaying = true;
    this.playInterval = window.setInterval(() => {
      if (this.currentStep >= this.steps.length - 1) {
        this.stopPlay();
        this.updateUI();
        return;
      }
      this.next();
    }, this.playSpeed);
  }

  private stopPlay(): void {
    this.isPlaying = false;
    if (this.playInterval !== null) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  showAll(): void {
    this.goToEnd();
    // Show all panels without dimming
    this.stepsContainer.querySelectorAll('.step-panel').forEach((panel) => {
      panel.classList.remove('hidden', 'dimmed');
      panel.classList.add('active');
    });
  }

  reset(): void {
    this.stopPlay();
    this.currentStep = -1;
    this.stepsContainer.querySelectorAll('.step-panel').forEach((panel) => {
      panel.classList.add('hidden');
      panel.classList.remove('active', 'dimmed');
    });
    this.updateUI();
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  destroy(): void {
    this.stopPlay();
    this.container.innerHTML = '';
  }
}
