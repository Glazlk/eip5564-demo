import { bytesToHex, hexToBytes, formatValue } from '../../crypto/utils.js';
import { getCurrentFormat } from '../format.js';
import type { AppState } from '../../types/index.js';

type TransferType = 'eth' | 'erc20' | 'erc721';

export function renderAnnouncer(container: HTMLElement, state: AppState): void {
  const section = document.createElement('section');
  section.id = 'announcer';
  section.className = 'phase-section';

  section.innerHTML = `
    <h2 class="phase-title">announcer contract</h2>
    <p class="phase-subtitle">ERC5564Announcer &mdash; singleton contract for publishing stealth address Announcement events</p>

    <div class="announcer-flow">
      <div class="flow-diagram">
        <div class="flow-box flow-sender">Sender</div>
        <div class="flow-arrow">→ announce()</div>
        <div class="flow-box flow-contract">ERC5564Announcer</div>
        <div class="flow-arrow">→ emit</div>
        <div class="flow-box flow-event">Announcement Event</div>
        <div class="flow-arrow">→ parse</div>
        <div class="flow-box flow-recipient">Recipient</div>
      </div>
    </div>

    <div class="announcer-event-structure">
      <h3>Announcement Event Structure</h3>
      <div class="event-fields">
        <div class="event-field">
          <span class="field-name">schemeId</span>
          <span class="field-type">uint256</span>
          <span class="field-desc">Cryptographic scheme identifier (1 = SECP256k1)</span>
        </div>
        <div class="event-field">
          <span class="field-name">stealthAddress</span>
          <span class="field-type">address</span>
          <span class="field-desc">The generated stealth address</span>
        </div>
        <div class="event-field">
          <span class="field-name">caller</span>
          <span class="field-type">address (indexed)</span>
          <span class="field-desc">The address calling announce() (msg.sender)</span>
        </div>
        <div class="event-field">
          <span class="field-name">ephemeralPubKey</span>
          <span class="field-type">bytes</span>
          <span class="field-desc">Sender's ephemeral public key (33 bytes compressed)</span>
        </div>
        <div class="event-field">
          <span class="field-name">metadata</span>
          <span class="field-type">bytes</span>
          <span class="field-desc">View tag + optional transfer info</span>
        </div>
      </div>
    </div>

    <div class="announcer-metadata">
      <h3>Metadata Constructor</h3>
      <p class="metadata-description">Build the metadata field interactively. The first byte is always the view tag, followed by optional transfer information.</p>

      <div class="metadata-layout">
        <div class="metadata-byte-map">
          <div class="byte-range">
            <span class="byte-offset">Byte 1</span>
            <span class="byte-label">View Tag</span>
            <span class="byte-value" id="meta-view-tag">0x00</span>
          </div>
          <div class="byte-range">
            <span class="byte-offset">Bytes 2-5</span>
            <span class="byte-label">Function Selector</span>
            <span class="byte-value" id="meta-func-selector">0x00000000</span>
          </div>
          <div class="byte-range">
            <span class="byte-offset">Bytes 6-25</span>
            <span class="byte-label">Token Address</span>
            <span class="byte-value" id="meta-token-addr">0x0000...0000</span>
          </div>
          <div class="byte-range">
            <span class="byte-offset">Bytes 26-57</span>
            <span class="byte-label">Amount / Token ID</span>
            <span class="byte-value" id="meta-amount">0x0000...0000</span>
          </div>
        </div>

        <div class="metadata-inputs">
          <div class="meta-input-group">
            <label>Transfer Type:</label>
            <select id="meta-transfer-type">
              <option value="eth">ETH Transfer</option>
              <option value="erc20">ERC-20 Token</option>
              <option value="erc721">ERC-721 NFT</option>
            </select>
          </div>
          <div class="meta-input-group" id="meta-token-group" style="display:none">
            <label>Token Contract Address:</label>
            <input type="text" class="key-input" id="meta-token-input" placeholder="0x..." />
          </div>
          <div class="meta-input-group">
            <label id="meta-amount-label">Amount (wei):</label>
            <input type="text" class="key-input" id="meta-amount-input" placeholder="1000000000000000000" value="1000000000000000000" />
          </div>
        </div>
      </div>

      <div class="metadata-output">
        <h4>Full Metadata (hex)</h4>
        <code class="metadata-hex" id="meta-full-hex"></code>
      </div>

      <div class="metadata-output">
        <h4>Full Metadata (binary)</h4>
        <code class="metadata-bin" id="meta-full-bin"></code>
      </div>
    </div>

    <div class="announcer-example" id="announcer-example"></div>
  `;

  container.appendChild(section);

  // Wire up metadata constructor
  const transferType = section.querySelector('#meta-transfer-type') as HTMLSelectElement;
  const tokenGroup = section.querySelector('#meta-token-group') as HTMLElement;
  const tokenInput = section.querySelector('#meta-token-input') as HTMLInputElement;
  const amountInput = section.querySelector('#meta-amount-input') as HTMLInputElement;
  const amountLabel = section.querySelector('#meta-amount-label') as HTMLLabelElement;
  const viewTagEl = section.querySelector('#meta-view-tag') as HTMLElement;
  const funcSelectorEl = section.querySelector('#meta-func-selector') as HTMLElement;
  const tokenAddrEl = section.querySelector('#meta-token-addr') as HTMLElement;
  const amountEl = section.querySelector('#meta-amount') as HTMLElement;
  const fullHexEl = section.querySelector('#meta-full-hex') as HTMLElement;
  const fullBinEl = section.querySelector('#meta-full-bin') as HTMLElement;
  const exampleContainer = section.querySelector('#announcer-example') as HTMLElement;

  // Function selectors
  const FUNC_SELECTORS: Record<TransferType, string> = {
    eth: '00000000',
    erc20: 'a9059cbb', // transfer(address,uint256)
    erc721: '42842e0e', // safeTransferFrom(address,address,uint256)
  };

  function updateMetadata(): void {
    const type = transferType.value as TransferType;
    tokenGroup.style.display = type === 'eth' ? 'none' : 'block';
    amountLabel.textContent = type === 'erc721' ? 'Token ID:' : 'Amount (wei):';

    // View tag from state
    const viewTag = state.generateResult ? state.generateResult.viewTag : 0;
    viewTagEl.textContent = '0x' + viewTag.toString(16).padStart(2, '0');

    // Function selector
    const selector = FUNC_SELECTORS[type];
    funcSelectorEl.textContent = '0x' + selector;

    // Token address (20 bytes)
    let tokenAddr = '0000000000000000000000000000000000000000';
    if (type !== 'eth' && tokenInput.value.trim()) {
      const clean = tokenInput.value.trim().replace('0x', '');
      tokenAddr = clean.padStart(40, '0').slice(0, 40);
    }
    tokenAddrEl.textContent = '0x' + tokenAddr.slice(0, 8) + '...' + tokenAddr.slice(-8);

    // Amount (32 bytes)
    let amountHex = '0000000000000000000000000000000000000000000000000000000000000000';
    try {
      const amountBig = BigInt(amountInput.value.trim() || '0');
      amountHex = amountBig.toString(16).padStart(64, '0');
    } catch {
      // Invalid input, keep zeros
    }
    amountEl.textContent = '0x' + amountHex.slice(0, 8) + '...' + amountHex.slice(-8);

    // Full metadata
    const fullHex = viewTag.toString(16).padStart(2, '0') + selector + tokenAddr + amountHex;
    fullHexEl.textContent = '0x' + fullHex;

    // Binary representation
    try {
      const bytes = hexToBytes(fullHex);
      const binary = Array.from(bytes).map(b => b.toString(2).padStart(8, '0')).join(' ');
      fullBinEl.textContent = binary;
    } catch {
      fullBinEl.textContent = 'Invalid input';
    }

    // Show example with actual state data
    renderExample(viewTag, type);
  }

  function renderExample(viewTag: number, type: TransferType): void {
    if (!state.generateResult) {
      exampleContainer.innerHTML = '<div class="info-box"><p>Complete Phase 2 to see a populated example Announcement event.</p></div>';
      return;
    }

    const gen = state.generateResult;
    const fmt = getCurrentFormat();

    exampleContainer.innerHTML = `
      <h3>Example Announcement Event</h3>
      <div class="event-example">
        <div class="event-example-field">
          <span class="field-name">schemeId:</span>
          <code>1</code>
          <span class="field-note">(SECP256k1)</span>
        </div>
        <div class="event-example-field">
          <span class="field-name">stealthAddress:</span>
          <code class="address-color">${gen.stealthAddress}</code>
        </div>
        <div class="event-example-field">
          <span class="field-name">caller:</span>
          <code>0x...sender...</code>
        </div>
        <div class="event-example-field">
          <span class="field-name">ephemeralPubKey:</span>
          <code class="public-key-color">${formatValue(gen.ephemeralPub, fmt)}</code>
        </div>
        <div class="event-example-field">
          <span class="field-name">metadata (view tag):</span>
          <code>0x${viewTag.toString(16).padStart(2, '0')}</code>
        </div>
      </div>
    `;
  }

  transferType.addEventListener('change', updateMetadata);
  tokenInput.addEventListener('input', updateMetadata);
  amountInput.addEventListener('input', updateMetadata);

  // Initial render
  updateMetadata();

  document.addEventListener('state-updated', updateMetadata);
  document.addEventListener('format-change', updateMetadata);
}
