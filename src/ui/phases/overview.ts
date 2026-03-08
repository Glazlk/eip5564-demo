export function renderOverview(container: HTMLElement): void {
  const section = document.createElement('section');
  section.id = 'overview';
  section.className = 'phase-section overview-section';

  section.innerHTML = `
    <h2 class="phase-title">EIP-5564 Protocol Overview</h2>
    <p class="phase-subtitle">Click any phase to explore its cryptographic operations in detail</p>
    <div class="overview-diagram">
      <div class="overview-flow">
        <a href="#keygen" class="overview-phase-box phase-box-keygen">
          <div class="phase-icon">🔑</div>
          <div class="phase-box-title">Phase 1: Key Setup</div>
          <div class="phase-box-desc">Generate spending & viewing key pairs, derive stealth meta-address</div>
          <div class="phase-box-formula">p → P = p · G</div>
        </a>
        <div class="overview-arrow">→</div>
        <a href="#generate" class="overview-phase-box phase-box-generate">
          <div class="phase-icon">📨</div>
          <div class="phase-box-title">Phase 2: Generate Stealth Address</div>
          <div class="phase-box-desc">Sender creates a one-time stealth address using ECDH</div>
          <div class="phase-box-formula">P_stealth = P_spend + hash(p_eph · P_view) · G</div>
        </a>
        <div class="overview-arrow">→</div>
        <a href="#parse" class="overview-phase-box phase-box-parse">
          <div class="phase-icon">🔍</div>
          <div class="phase-box-title">Phase 3: Parse Announcements</div>
          <div class="phase-box-desc">Recipient checks if a stealth address belongs to them</div>
          <div class="phase-box-formula">Check: view tag match → verify address</div>
        </a>
        <div class="overview-arrow">→</div>
        <a href="#derive" class="overview-phase-box phase-box-derive">
          <div class="phase-icon">🔓</div>
          <div class="phase-box-title">Phase 4: Derive Stealth Key</div>
          <div class="phase-box-desc">Recipient computes the private key to control the stealth address</div>
          <div class="phase-box-formula">p_stealth = p_spend + hash(p_view · P_eph)</div>
        </a>
      </div>
      <div class="overview-announcer-link">
        <a href="#announcer" class="overview-phase-box phase-box-announcer">
          <div class="phase-icon">📢</div>
          <div class="phase-box-title">Announcer Contract</div>
          <div class="phase-box-desc">ERC5564Announcer singleton — publishing Announcement events on-chain</div>
          <div class="phase-box-formula">emit Announcement(schemeId, stealthAddress, ephPubKey, metadata)</div>
        </a>
      </div>
    </div>
  `;

  container.appendChild(section);
}
