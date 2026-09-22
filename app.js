import * as THREE from 'three';

// 1. Scene Setup
const scene = new THREE.Scene();

const dpr = Math.min(window.devicePixelRatio || 1, 2);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const aspect = window.innerWidth / window.innerHeight;
camera.position.z = aspect < 1 ? 8 : 5.5;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. Base Phone Geometry Setup (No Width/Depth, No Physical Buttons)
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

// Normalize UV coordinates for geometry mapping
const pos = geometry.attributes.position;
const uvs = new Float32Array(pos.count * 2);
for (let i = 0; i < pos.count; i++) {
  uvs[i * 2] = (pos.getX(i) + width / 2) / width;
  uvs[i * 2 + 1] = (pos.getY(i) + height / 2) / height;
}
geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

// 3. Dynamic Canvas Generation using "iPhone 15 Wallpaper.png"
const canvas = document.createElement('canvas');
canvas.width = 1024;
canvas.height = 2048;
const ctx = canvas.getContext('2d');

const texture = new THREE.CanvasTexture(canvas);
texture.generateMipmaps = true;
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;

// Load the updated wallpaper image filename
const wallpaperImg = new Image();
wallpaperImg.src = 'iPhone 15 Wallpaper.png';
wallpaperImg.onload = () => {
  renderScreenContent();
};

function renderScreenContent() {
  // Render wallpaper exclusively across phone screen canvas
  ctx.drawImage(wallpaperImg, 0, 0, canvas.width, canvas.height);

  // App Grid Overlay
  const appList = [
    { name: 'About', color: 'rgba(59, 130, 246, 0.85)', icon: 'i' },
    { name: 'Education', color: 'rgba(16, 185, 129, 0.85)', icon: 'E' },
    { name: 'Projects', color: 'rgba(245, 158, 11, 0.85)', icon: 'P' },
    { name: 'GitHub', color: 'rgba(30, 41, 59, 0.85)', icon: 'GH' },
    { name: 'LinkedIn', color: 'rgba(10, 102, 194, 0.85)', icon: 'in' }
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

    ctx.fillStyle = app.color;
    ctx.beginPath();
    ctx.roundRect(x, y, appSize, appSize, 36);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(app.icon, x + appSize / 2, y + appSize / 2);

    ctx.font = '500 36px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(app.name, x + appSize / 2, y + appSize + 48);
  });

  texture.needsUpdate = true;
}

const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.DoubleSide
});

const phone = new THREE.Mesh(geometry, material);
scene.add(phone);

// 4. Viewport-Wide Click & Flip Handler
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let targetRotationY = 0;
let isFlipping = false;

function handlePointerDown(event) {
  const x = event.clientX || (event.touches && event.touches[0].clientX);
  const y = event.clientY || (event.touches && event.touches[0].clientY);

  if (x === undefined || y === undefined) return;

  mouse.x = (x / window.innerWidth) * 2 - 1;
  mouse.y = -(y / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(phone);

  // Check direct interaction on GitHub app icon
  if (intersects.length > 0 && intersects[0].uv) {
    const uv = intersects[0].uv;

    const ghXMin = 400 / canvas.width;
    const ghXMax = 560 / canvas.width;
    const ghYMin = 1308 / canvas.height;
    const ghYMax = 1468 / canvas.height;

    if (uv.x >= ghXMin && uv.x <= ghXMax && uv.y >= ghYMin && uv.y <= ghYMax) {
      window.open('https://github.com/avsarshukla', '_blank', 'noopener,noreferrer');
      return;
    }
  }

  // Trigger 180-degree rotation when clicking anywhere else on the screen
  targetRotationY += Math.PI;
  isFlipping = true;
}

window.addEventListener('click', handlePointerDown);
window.addEventListener('touchstart', handlePointerDown);

// 5. Responsive Resizing
window.addEventListener('resize', () => {
  const newAspect = window.innerWidth / window.innerHeight;
  camera.aspect = newAspect;
  camera.position.z = newAspect < 1 ? 8 : 5.5;
  camera.updateProjectionMatrix();

  const newDpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(newDpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 6. Fast Flip Animation Loop
function animate() {
  requestAnimationFrame(animate);

  if (isFlipping) {
    phone.rotation.y += (targetRotationY - phone.rotation.y) * 0.15;
    if (Math.abs(targetRotationY - phone.rotation.y) < 0.001) {
      phone.rotation.y = targetRotationY;
      isFlipping = false;
    }
  }

  renderer.render(scene, camera);
}

animate();
