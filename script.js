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

// 2. Phone Geometry
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

// Normalize UVs so the texture maps 1:1 across the phone face
const pos = geometry.attributes.position;
const uvs = new Float32Array(pos.count * 2);
for (let i = 0; i < pos.count; i++) {
  uvs[i * 2] = (pos.getX(i) + width / 2) / width;
  uvs[i * 2 + 1] = (pos.getY(i) + height / 2) / height;
}
geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

// 3. Load the PNG wallpaper directly as the texture
const loader = new THREE.TextureLoader();
const wallpaper = loader.load('iPhone 15 Wallpaper.png', (tex) => {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
});

const material = new THREE.MeshBasicMaterial({
  map: wallpaper,
  side: THREE.DoubleSide
});

const phone = new THREE.Mesh(geometry, material);
scene.add(phone);

// 4. Click anywhere → flip 180°
let targetRotationY = 0;
let isFlipping = false;

function handlePointerDown() {
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

// 6. Flip Animation Loop
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
