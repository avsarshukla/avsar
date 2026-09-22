import * as THREE from 'three';

// --- CONFIGURATION ---
export const DESIGN = {
  screenWidth: 3.0,
  screenHeight: 6.5,
  cornerRadius: 0.4,
  colors: {
    bgGlass: 0x2c3842,
    squircleBody: 0x1c1c1e,
    dockBg: 0x161c22,
    textPrimary: '#FFFFFF',
    textSecondary: '#8E8E93',
    accentBlue: '#0A84FF',
    accentRed: '#FF453A',
    accentGreen: '#30D158',
  }
};

// Layout constants — use these in the assembly so icons don't overlap.
// Group's vertical extent: icon top +0.25, label bottom -0.435 → 0.685 tall.
// Use spacingY >= 0.75 to keep a gap between a row's label and the row above's icon.
export const APP_LAYOUT = {
  iconSize: 0.5,
  labelOffsetY: -0.36,
  spacingX: 0.7,
  spacingY: 0.85,
};

// --- HELPERS ---
function getIndiaTime() {
  return new Date().toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function createSquircleShape(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x, y + radius);
  shape.lineTo(x, y + height - radius);
  shape.quadraticCurveTo(x, y + height, x + radius, y + height);
  shape.lineTo(x + width - radius, y + height);
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
  shape.lineTo(x + width, y + radius);
  shape.quadraticCurveTo(x + width, y, x + width - radius, y);
  shape.lineTo(x + radius, y);
  shape.quadraticCurveTo(x, y, x, y + radius);
  return shape;
}

function createProceduralMesh(width, height, depth, drawCanvas, bevel = 0.015) {
  const shape = createSquircleShape(width, height, Math.min(width, height) * 0.225);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: bevel > 0,
    bevelSegments: 4,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel
  });
  geometry.center();

  // FIX: ExtrudeGeometry's default UV generator uses raw shape coordinates
  // (centered here, so -w/2..+w/2). With ClampToEdgeWrapping that samples
  // only a corner sliver of the texture → "wonky". Remap UVs to [0,1].
  const uvAttr = geometry.attributes.uv;
  const posAttr = geometry.attributes.position;
  for (let i = 0; i < uvAttr.count; i++) {
    uvAttr.setXY(i,
      (posAttr.getX(i) + width / 2) / width,
      (posAttr.getY(i) + height / 2) / height
    );
  }
  uvAttr.needsUpdate = true;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * 512);
  canvas.height = Math.round(height * 512);
  const ctx = canvas.getContext('2d');

  if (drawCanvas) drawCanvas(ctx, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const frontMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.25,
    metalness: 0.1
  });

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: DESIGN.colors.squircleBody,
    roughness: 0.5,
    metalness: 0.2
  });

  return new THREE.Mesh(geometry, [frontMaterial, bodyMaterial]);
}

// ==========================================
// 1. STATUS BAR (dynamic India time)
// ==========================================
export function createStatusBarMesh() {
  const width = DESIGN.screenWidth;
  const height = 0.4;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Time (India)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 52px -apple-system, SF Pro Display, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(getIndiaTime(), 60, 100);

    // Dynamic Island
    const pillW = 320;
    const pillH = 90;
    const pillX = (canvas.width - pillW) / 2;
    const pillY = 25;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 45);
    ctx.fill();

    // Right-side icons: 5G + battery
    ctx.textAlign = 'right';
    ctx.font = '500 38px -apple-system, SF Pro Text, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('5G', canvas.width - 170, 96);

    const battX = canvas.width - 130;
    const battY = 60;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.strokeRect(battX, battY, 70, 36);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(battX + 4, battY + 4, 54, 28);
    ctx.fillRect(battX + 72, battY + 10, 4, 16);

    ctx.font = 'bold 26px -apple-system, SF Pro Text, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText('87', battX + 35, battY + 27);

    texture.needsUpdate = true;
  }

  draw();
  setInterval(draw, 30000); // refresh India time every 30 s

  const planeGeo = new THREE.PlaneGeometry(width, height);
  const planeMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  return new THREE.Mesh(planeGeo, planeMat);
}

// ==========================================
// 2. APP ICON FACTORY
// ==========================================
export function createLabeledAppIcon(name, drawIconFunction, notificationBadge = null) {
  const group = new THREE.Group();

  const iconMesh = createProceduralMesh(APP_LAYOUT.iconSize, APP_LAYOUT.iconSize, 0.02, (ctx, w, h) => {
    ctx.fillStyle = '#1c1c1e';
    ctx.fillRect(0, 0, w, h);

    drawIconFunction(ctx, w, h);

    if (notificationBadge) {
      ctx.fillStyle = '#FF3B30';
      ctx.beginPath();
      ctx.arc(w - 50, 50, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px -apple-system, SF Pro Text, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(notificationBadge), w - 50, 55);
    }
  });
  group.add(iconMesh);

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 256;
  labelCanvas.height = 64;
  const lCtx = labelCanvas.getContext('2d');
  lCtx.fillStyle = '#FFFFFF';
  lCtx.font = '500 24px -apple-system, SF Pro Text, sans-serif';
  lCtx.textAlign = 'center';
  lCtx.textBaseline = 'middle';
  lCtx.shadowColor = 'rgba(0,0,0,0.8)';
  lCtx.shadowBlur = 4;
  lCtx.fillText(name, 128, 32);

  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;

  const labelGeo = new THREE.PlaneGeometry(0.6, 0.15);
  const labelMat = new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true });
  const labelMesh = new THREE.Mesh(labelGeo, labelMat);
  labelMesh.position.set(0, APP_LAYOUT.labelOffsetY, 0.01);
  group.add(labelMesh);

  return group;
}

// --- SPECIFIC APP ICONS ---

// X (Twitter) — exact path from your portfolio HTML
export function createXIcon() {
  return createLabeledAppIcon('X', (ctx, w, h) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const pad = w * 0.18;
    const scale = (w - pad * 2) / 24;
    ctx.save();
    ctx.translate(pad, pad);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill(new Path2D(
      'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'
    ));
    ctx.restore();
  });
}

// LinkedIn — exact path from your portfolio HTML
export function createLinkedInIcon() {
  return createLabeledAppIcon('LinkedIn', (ctx, w, h) => {
    ctx.fillStyle = '#0A66C2';
    ctx.fillRect(0, 0, w, h);

    const pad = w * 0.14;
    const scale = (w - pad * 2) / 24;
    ctx.save();
    ctx.translate(pad, pad);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill(new Path2D(
      'M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z'
    ), 'evenodd');
    ctx.restore();
  });
}

// Weather icon (unchanged — kept as an example)
export function createWeatherIcon() {
  return createLabeledAppIcon('Weather', (ctx, w, h) => {
    ctx.fillStyle = '#2c2c2e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFCC00';
    ctx.beginPath();
    ctx.arc(w * 0.65, h * 0.38, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E5E5EA';
    ctx.beginPath();
    ctx.arc(w * 0.45, h * 0.55, 45, 0, Math.PI * 2);
    ctx.arc(w * 0.60, h * 0.50, 35, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ==========================================
// 3. WEATHER WIDGET (KOLKATA)
// ==========================================
export function createWeatherWidget() {
  return createProceduralMesh(1.2, 1.2, 0.02, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1c2536');
    grad.addColorStop(1, '#111722');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 32px -apple-system, SF Pro Display, sans-serif';
    ctx.fillText('Kolkata', 40, 60);

    ctx.font = '300 110px -apple-system, SF Pro Display, sans-serif';
    ctx.fillText('31°', 35, 175);

    ctx.font = '500 28px -apple-system, SF Pro Text, sans-serif';
    ctx.fillText('Mostly Sunny', 40, 275);

    ctx.fillStyle = '#8E8E93';
    ctx.font = '500 24px -apple-system, SF Pro Text, sans-serif';
    ctx.fillText('H:33° L:26°', 40, 315);
  });
}

// ==========================================
// 4. GITHUB CONTRIBUTION WIDGET (replaces Music)
// ==========================================
export function createGitHubContributionWidget() {
  return createProceduralMesh(2.6, 1.2, 0.02, (ctx, w, h) => {
    // Dark GitHub card
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Header
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '600 42px -apple-system, SF Pro Display, sans-serif';
    ctx.fillText('Contributions', 40, 68);

    ctx.fillStyle = '#8E8E93';
    ctx.font = '500 26px -apple-system, SF Pro Text, sans-serif';
    ctx.fillText('@avsarshukla', 40, 106);

    // Heatmap grid — 26 cols x 7 rows (GitHub-style)
    const cols = 26;
    const rows = 7;
    const padX = 40;
    const top = 140;
    const gridW = w - padX * 2;
    const gridH = h - top - 30;
    const cellW = gridW / cols;
    const cellH = gridH / rows;
    const gap = Math.min(cellW, cellH) * 0.18;
    const size = Math.min(cellW, cellH) - gap;

    const greens = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = padX + c * cellW + gap / 2;
        const y = top + r * cellH + gap / 2;
        const rand = Math.random();
        let level;
        if (rand > 0.85) level = 4;
        else if (rand > 0.70) level = 3;
        else if (rand > 0.55) level = 2;
        else if (rand > 0.40) level = 1;
        else level = 0;

        ctx.fillStyle = greens[level];
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, Math.min(size * 0.22, 5));
        ctx.fill();
      }
    }
  });
}

// ==========================================
// 5. SEARCH BAR & DOCK (unchanged)
// ==========================================
export function createSearchBarMesh() {
  return createProceduralMesh(1.0, 0.28, 0.01, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 28px -apple-system, SF Pro Text, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔍 Search', w / 2, h / 2 + 2);
  });
}

export function createDockContainerMesh() {
  return createProceduralMesh(2.8, 0.65, 0.02, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(22, 28, 34, 0.75)';
    ctx.fillRect(0, 0, w, h);
  }, 0.04);
}
