export function renderOverview(container: HTMLElement): void {
  const section = document.createElement('section');
  section.id = 'overview';
  section.className = 'phase-section overview-section';

  section.innerHTML = `
    <h2 class="phase-title">Protocol Overview</h2>
    <p class="phase-subtitle">EIP-5564 stealth address protocol — click a phase to explore</p>
    <div class="overview-flow">
      <a href="#keygen" class="overview-phase-box">
        <div class="phase-box-title">1. Key Setup</div>
        <div class="phase-box-desc">Generate spend & view key pairs</div>
        <div class="phase-box-formula">p → P = p · G</div>
      </a>
      <div class="overview-arrow">→</div>
      <a href="#generate" class="overview-phase-box">
        <div class="phase-box-title">2. Generate</div>
        <div class="phase-box-desc">Sender creates stealth address via ECDH</div>
        <div class="phase-box-formula">P_st = P_spend + H(s) · G</div>
      </a>
      <div class="overview-arrow">→</div>
      <a href="#parse" class="overview-phase-box">
        <div class="phase-box-title">3. Parse</div>
        <div class="phase-box-desc">Recipient checks ownership via view tag</div>
        <div class="phase-box-formula">v = H(s)[0] → verify</div>
      </a>
      <div class="overview-arrow">→</div>
      <a href="#derive" class="overview-phase-box">
        <div class="phase-box-title">4. Derive</div>
        <div class="phase-box-desc">Recipient computes stealth private key</div>
        <div class="phase-box-formula">p_st = p_spend + H(s)</div>
      </a>
    </div>
    <div class="overview-announcer-link">
      <a href="#announcer" class="overview-phase-box">
        <div class="phase-box-title">Announcer Contract</div>
        <div class="phase-box-desc">ERC5564Announcer — on-chain announcement events</div>
        <div class="phase-box-formula">emit Announcement(schemeId, addr, ephKey, metadata)</div>
      </a>
    </div>
  `;

  container.appendChild(section);
}
