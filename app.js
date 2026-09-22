import * as THREE from 'three';

// 1. Scene Setup
const scene = new THREE.Scene();

// High DPI / DPR check for screen clarity across devices
const dpr = Math.min(window.devicePixelRatio || 1, 2);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
// Responsive camera z-distance (further back on narrower screen aspect ratios)
const aspect = window.innerWidth / window.innerHeight;
camera.position.z = aspect < 1 ? 8 : 5.5;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. Base Phone Geometry & Mesh Setup
const width = 2.5;
const height = 5.2;
const radius = 0.35;

const shape = new THREE.Shape();
shape.moveTo(-width / 2 + radius, -height / 2);
shape.lineTo(width / 2 - radius, -height / 2);
shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + radius);
shape.lineTo(width / 2, height / 2 - radius);
shape.quadraticCurveTo(width / 2, height / 2, width / 2 - radius, height / 2);
shape.lineTo(-width / 2 + radius, height / 2);
shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - radius);
shape.lineTo(-width / 2, -height / 2 + radius);
shape.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + radius, -height / 2);

const geometry = new THREE.ShapeGeometry(shape);

// Normalize UV coordinates for accurate texture mapping on custom shape
const pos = geometry.attributes.position;
const uvs = new Float32Array((pos.count) * 2);
for (let i = 0; i < pos.count; i++) {
  uvs[i * 2] = (pos.getX(i) + width / 2) / width;
  uvs[i * 2 + 1] = (pos.getY(i) + height / 2) / height;
}
geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

// Dynamic Screen Texture Canvas
const canvas = document.createElement('canvas');
canvas.width = 1024;
canvas.height = 2048;
const ctx = canvas.getContext('2d');

function generateScreenTexture() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Decorative header area
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(64, 128, 896, 240, 32);
  ctx.fill();

  // Draw Uniform App Grid (Labels without long text descriptions)
  const appList = [
    { name: 'About', color: '#3b82f6', icon: 'i' },
    { name: 'Education', color: '#10b981', icon: 'E' },
    { name: 'Projects', color: '#f59e0b', icon: 'P' },
    { name: 'GitHub', color: '#333333', icon: 'GH' },
    { name: 'LinkedIn', color: '#0a66c2', icon: 'in' }
  ];

  const appSize = 160;
  const startX = 120;
  const startY = 480;
  const colGap = 280;
  const rowGap = 280;

  appList.forEach((app, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = startX + col * colGap;
    const y = startY + row * rowGap;

    // Uniform App Icon Container
    ctx.fillStyle = app.color;
    ctx.beginPath();
    ctx.roundRect(x, y, appSize, appSize, 36);
    ctx.fill();

    // Icon Glyph
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(app.icon, x + appSize / 2, y + appSize / 2);

    // App Label
    ctx.font = '500 36px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(app.name, x + appSize / 2, y + appSize + 48);
  });
}

generateScreenTexture();

const texture = new THREE.CanvasTexture(canvas);
texture.generateMipmaps = true;
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;

const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.DoubleSide
});

const phone = new THREE.Mesh(geometry, material);
scene.add(phone);

// 3. Interaction Handling (GitHub URL Redirect)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function handlePointerDown(event) {
  const x = event.clientX || (event.touches && event.touches[0].clientX);
  const y = event.clientY || (event.touches && event.touches[0].clientY);

  if (x === undefined || y === undefined) return;

  mouse.x = (x / window.innerWidth) * 2 - 1;
  mouse.y = -(y / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(phone);

  if (intersects.length > 0 && intersects[0].uv) {
    const uv = intersects[0].uv;

    // GitHub App Icon Bounds in Canvas UV Coordinates
    const ghXMin = 400 / canvas.width;  // Col 2 start
    const ghXMax = 560 / canvas.width;  // Col 2 end
    const ghYMin = 1308 / canvas.height; // Row 1 inverted UV Y start
    const ghYMax = 1468 / canvas.height; // Row 1 inverted UV Y end

    if (uv.x >= ghXMin && uv.x <= ghXMax && uv.y >= ghYMin && uv.y <= ghYMax) {
      window.open('https://github.com/avsarshukla', '_blank', 'noopener,noreferrer');
    }
  }
}

window.addEventListener('click', handlePointerDown);
window.addEventListener('touchstart', handlePointerDown);

// 4. Responsive Resize Observer
window.addEventListener('resize', () => {
  const newAspect = window.innerWidth / window.innerHeight;
  camera.aspect = newAspect;
  camera.position.z = newAspect < 1 ? 8 : 5.5;
  camera.updateProjectionMatrix();

  const newDpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(newDpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 5. Fast Animation Loop
let lastTime = performance.now();
const speed = 12.0;

function animate(currentTime) {
  requestAnimationFrame(animate);

  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  phone.rotation.y += speed * delta;

  renderer.render(scene, camera);
}

animate(performance.now());
