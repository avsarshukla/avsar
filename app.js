import * as THREE from 'three';

// 1. Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 6;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. Flat Phone Body (No Depth, No Buttons)
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
const material = new THREE.MeshBasicMaterial({
  color: 0x0f172a,
  side: THREE.DoubleSide
});

const phone = new THREE.Mesh(geometry, material);
scene.add(phone);

// 3. Fast Animation Loop
let lastTime = performance.now();
const speed = 12.0; // Radians per second

function animate(currentTime) {
  requestAnimationFrame(animate);

  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  phone.rotation.y += speed * delta;

  renderer.render(scene, camera);
}

animate(performance.now());
