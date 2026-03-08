import type { DisplayFormat } from '../types/index.js';
import { formatValue } from '../crypto/utils.js';

let currentFormat: DisplayFormat = 'hex';

export function getCurrentFormat(): DisplayFormat {
  return currentFormat;
}

export function setFormat(f: DisplayFormat): void {
  currentFormat = f;
  document.dispatchEvent(new CustomEvent('format-change', { detail: f }));
}

export function renderFormatToggle(container: HTMLElement): void {
  const wrapper = document.createElement('div');
  wrapper.className = 'format-toggle';

  const formats: DisplayFormat[] = ['hex', 'dec', 'bin'];
  formats.forEach((f) => {
    const btn = document.createElement('button');
    btn.textContent = f.charAt(0).toUpperCase() + f.slice(1);
    btn.className = `toggle-btn ${f === currentFormat ? 'active' : ''}`;
    btn.addEventListener('click', () => {
      wrapper.querySelectorAll('.toggle-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      setFormat(f);
    });
    wrapper.appendChild(btn);
  });

  container.appendChild(wrapper);
}

export function createValueDisplay(
  bytes: Uint8Array,
  cssClass: string = '',
  label?: string
): HTMLElement {
  const el = document.createElement('div');
  el.className = `value-display ${cssClass}`;
  el.dataset.rawHex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  el.dataset.length = String(bytes.length);

  if (label) {
    const labelEl = document.createElement('span');
    labelEl.className = 'value-label';
    labelEl.textContent = label;
    el.appendChild(labelEl);
  }

  const valueEl = document.createElement('code');
  valueEl.className = 'value-content';
  valueEl.textContent = formatValue(bytes, currentFormat);
  el.appendChild(valueEl);

  return el;
}

export function updateAllValueDisplays(): void {
  document.querySelectorAll('.value-display').forEach((el) => {
    const hex = (el as HTMLElement).dataset.rawHex;
    if (!hex) return;
    const bytes = new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
    const valueEl = el.querySelector('.value-content');
    if (valueEl) {
      valueEl.textContent = formatValue(bytes, currentFormat);
      el.classList.add('value-changed');
      setTimeout(() => el.classList.remove('value-changed'), 600);
    }
  });
}

// Listen for format changes and update all displays
document.addEventListener('format-change', () => {
  updateAllValueDisplays();
});
