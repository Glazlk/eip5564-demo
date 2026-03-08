/**
 * Schematic elliptic curve diagram (SVG-based).
 * Renders a simplified y² = x³ + 7 curve over real numbers
 * with animated points for visualization purposes.
 */

interface DiagramPoint {
  label: string;
  color: string;
}

export function renderECDiagram(
  container: HTMLElement,
  operation: 'multiply' | 'add',
  points: DiagramPoint[]
): void {
  container.innerHTML = '';

  const width = 320;
  const height = 280;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.classList.add('ec-diagram');

  // Background
  const bg = createSVGElement('rect', {
    x: '0', y: '0', width: String(width), height: String(height),
    fill: 'var(--color-surface)', rx: '8',
  });
  svg.appendChild(bg);

  // Draw axes
  const axisColor = 'var(--color-text-dim)';
  svg.appendChild(createSVGElement('line', {
    x1: '40', y1: String(height / 2), x2: String(width - 20), y2: String(height / 2),
    stroke: axisColor, 'stroke-width': '1', 'stroke-dasharray': '4,4',
  }));
  svg.appendChild(createSVGElement('line', {
    x1: '60', y1: '20', x2: '60', y2: String(height - 20),
    stroke: axisColor, 'stroke-width': '1', 'stroke-dasharray': '4,4',
  }));

  // Draw curve y² = x³ + 7 (schematic, over reals)
  const curvePath = generateCurvePath(width, height);
  const curve = createSVGElement('path', {
    d: curvePath,
    fill: 'none',
    stroke: 'var(--color-accent)',
    'stroke-width': '2',
    opacity: '0.7',
  });
  svg.appendChild(curve);

  // Formula label
  const formulaText = createSVGElement('text', {
    x: String(width / 2), y: '22',
    'text-anchor': 'middle',
    fill: 'var(--color-text)',
    'font-size': '11',
    'font-family': 'monospace',
  });
  formulaText.textContent = 'y² = x³ + 7 (mod p)';
  svg.appendChild(formulaText);

  // Place points on the curve at schematic positions
  const pointPositions = getSchematicPositions(points.length, operation, width, height);

  points.forEach((p, i) => {
    const pos = pointPositions[i];
    if (!pos) return;

    // Animated point
    const circle = createSVGElement('circle', {
      cx: String(pos.x), cy: String(pos.y), r: '0',
      fill: p.color, stroke: 'white', 'stroke-width': '1.5',
    });

    // Animate radius
    const anim = createSVGElement('animate', {
      attributeName: 'r',
      from: '0', to: '6',
      dur: '0.5s',
      begin: `${i * 0.3}s`,
      fill: 'freeze',
    });
    circle.appendChild(anim);
    svg.appendChild(circle);

    // Label
    const label = createSVGElement('text', {
      x: String(pos.x), y: String(pos.y - 12),
      'text-anchor': 'middle',
      fill: p.color,
      'font-size': '11',
      'font-weight': 'bold',
      'font-family': 'monospace',
      opacity: '0',
    });
    label.textContent = p.label;
    const labelAnim = createSVGElement('animate', {
      attributeName: 'opacity',
      from: '0', to: '1',
      dur: '0.3s',
      begin: `${i * 0.3 + 0.2}s`,
      fill: 'freeze',
    });
    label.appendChild(labelAnim);
    svg.appendChild(label);
  });

  // Draw connecting lines for operations
  if (points.length >= 2 && pointPositions.length >= 2) {
    const line = createSVGElement('line', {
      x1: String(pointPositions[0].x), y1: String(pointPositions[0].y),
      x2: String(pointPositions[1].x), y2: String(pointPositions[1].y),
      stroke: 'var(--color-highlight)',
      'stroke-width': '1',
      'stroke-dasharray': '6,3',
      opacity: '0',
    });
    const lineAnim = createSVGElement('animate', {
      attributeName: 'opacity',
      from: '0', to: '0.6',
      dur: '0.3s',
      begin: '0.6s',
      fill: 'freeze',
    });
    line.appendChild(lineAnim);
    svg.appendChild(line);
  }

  // Operation label
  const opLabel = createSVGElement('text', {
    x: String(width / 2), y: String(height - 10),
    'text-anchor': 'middle',
    fill: 'var(--color-text-dim)',
    'font-size': '10',
    'font-family': 'monospace',
  });
  opLabel.textContent = operation === 'multiply' ? 'Scalar Multiplication (k · G)' : 'Point Addition (P₁ + P₂)';
  svg.appendChild(opLabel);

  container.appendChild(svg);
}

function generateCurvePath(width: number, height: number): string {
  const cx = 60;
  const cy = height / 2;
  const scale = 18;
  let path = '';

  // Upper half of the curve
  for (let px = -1.5; px <= 4; px += 0.05) {
    const y2 = px * px * px + 7;
    if (y2 < 0) continue;
    const y = Math.sqrt(y2);
    const sx = cx + px * scale;
    const sy = cy - y * scale;
    if (sx < 20 || sx > width - 10 || sy < 10 || sy > height - 10) continue;
    path += path === '' ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`;
  }

  // Lower half (mirror)
  let lowerPath = '';
  for (let px = 4; px >= -1.5; px -= 0.05) {
    const y2 = px * px * px + 7;
    if (y2 < 0) continue;
    const y = -Math.sqrt(y2);
    const sx = cx + px * scale;
    const sy = cy - y * scale;
    if (sx < 20 || sx > width - 10 || sy < 10 || sy > height - 10) continue;
    lowerPath += lowerPath === '' ? ` M ${sx} ${sy}` : ` L ${sx} ${sy}`;
  }

  return path + lowerPath;
}

function getSchematicPositions(
  count: number,
  operation: 'multiply' | 'add',
  width: number,
  height: number
): { x: number; y: number }[] {
  const cx = 60;
  const cy = height / 2;
  const scale = 18;

  // Pre-defined points on the curve for visualization
  const curvePoints = [
    { px: 0, y: Math.sqrt(7) },
    { px: 1.5, y: Math.sqrt(1.5 ** 3 + 7) },
    { px: 2.5, y: Math.sqrt(2.5 ** 3 + 7) },
    { px: 3.2, y: Math.sqrt(3.2 ** 3 + 7) },
  ];

  return curvePoints.slice(0, count).map((p) => ({
    x: cx + p.px * scale,
    y: cy - p.y * scale,
  }));
}

function createSVGElement(tag: string, attrs: Record<string, string>): SVGElement {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}
