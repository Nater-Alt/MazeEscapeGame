import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/PointerLockControls.js';

const CELL_SIZE = 6;
const PLAYER_HEIGHT = 2;
const PLAYER_RADIUS = 1.2;
const REQUIRED_KEYS = 3;

const rawMazeLayout = [
  '###################',
  '#S....#.....#....E#',
  '#.##.#.###.#.##.#.#',
  '#.#..#...#.#..#.#.#',
  '#.#.###.#.#.##.#.#',
  '#.#.....#.#....#.#',
  '#.#####.#.####.#.#',
  '#.....#.#....#.#.#',
  '###.#.#.####.#.#.#',
  '#...#.#....#.#.#.#',
  '#.###.####.#.#.#.#',
  '#.#B#....#.#.#.#.#',
  '#.#.####.#.#.#.#.#',
  '#.#....#.#.#.#.#.#',
  '#.####.#.#.#.#.#.#',
  '#.....#.#.#.#...#',
  '#.###.#.#.#.###.#',
  '#K..#.#...#..N#.#',
  '###################'
];

const mazeWidth = rawMazeLayout.reduce((max, row) => Math.max(max, row.length), 0);
const mazeLayout = rawMazeLayout.map((row) => row.padEnd(mazeWidth, '#'));

const additionalItems = [
  { row: 5, col: 14, type: 'battery' },
  { row: 9, col: 9, type: 'key' },
  { row: 14, col: 3, type: 'note', text: 'The exit demands three keys.' },
  { row: 3, col: 13, type: 'battery' },
  { row: 7, col: 6, type: 'key' }
];

const enemyWaypoints = [
  { row: 2, col: 2 },
  { row: 2, col: 14 },
  { row: 10, col: 14 },
  { row: 10, col: 2 }
];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060608);
scene.fog = new THREE.Fog(0x060608, 10, 80);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
const player = controls.getObject();
player.position.y = PLAYER_HEIGHT;
scene.add(player);

const clock = new THREE.Clock();
const moveState = { forward: false, backward: false, left: false, right: false };
let canJump = false;
let velocityY = 0;
const gravity = 25;
const jumpStrength = 8;

let stamina = 100;
const maxStamina = 100;
const staminaDrainRate = 25;
const staminaRegenRate = 15;
let isSprinting = false;

let flashlightOn = false;
let flashlightBattery = 100;
let batteryInventory = 0;
let keysInventory = 0;
const notesInventory = [];

const enemyState = {
  mode: 'patrol',
  lostTimer: 0
};

const hud = {
  staminaBar: document.getElementById('staminaBar'),
  flashlightStatus: document.getElementById('flashlightStatus'),
  batteryStatus: document.getElementById('batteryStatus'),
  objective: document.getElementById('objective'),
  messages: document.getElementById('messages'),
  inventory: document.getElementById('inventory'),
  inventoryBatteries: document.getElementById('inventoryBatteries'),
  inventoryKeys: document.getElementById('inventoryKeys'),
  inventoryNotes: document.getElementById('inventoryNotes'),
  result: document.getElementById('result'),
  resultTitle: document.getElementById('resultTitle')
};

let inventoryOpen = false;
let gameActive = false;
let doorMesh = null;
let doorOpened = false;
let exitPosition = new THREE.Vector3();

const walls = [];
const collectibles = [];

const ambientLight = new THREE.HemisphereLight(0x8899ff, 0x332211, 0.3);
scene.add(ambientLight);

const torch = new THREE.PointLight(0xffaa55, 1, 20, 2);
torch.position.set(0, 10, 0);
scene.add(torch);

defaultWorldLighting();

const flashlight = new THREE.SpotLight(0xffffff, 2, 40, Math.PI / 8, 0.5, 2);
flashlight.castShadow = true;
flashlight.visible = false;
player.add(flashlight);
player.add(flashlight.target);
flashlight.target.position.set(0, 0, -1);

const floorGeometry = new THREE.PlaneGeometry(mazeLayout[0].length * CELL_SIZE, mazeLayout.length * CELL_SIZE);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.9 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.receiveShadow = true;
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x2d3142, metalness: 0.1, roughness: 0.8 });
const keyMaterial = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x332200, emissiveIntensity: 0.7 });
const batteryMaterial = new THREE.MeshStandardMaterial({ color: 0x90e0ef, emissive: 0x112233, emissiveIntensity: 0.6 });
const noteMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x111111, emissiveIntensity: 0.3 });

createMaze();

const enemy = createEnemy();
scene.add(enemy);

const raycaster = new THREE.Raycaster();
const tempVec = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);
const cameraDirection = new THREE.Vector3();

const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');

startButton.addEventListener('click', () => {
  overlay.classList.add('hidden');
  controls.lock();
});

controls.addEventListener('lock', () => {
  gameActive = true;
});

controls.addEventListener('unlock', () => {
  gameActive = false;
  inventoryOpen = false;
  hud.inventory.classList.add('hidden');
  if (hud.result.classList.contains('hidden')) {
    overlay.classList.remove('hidden');
  }
});

restartButton.addEventListener('click', () => {
  window.location.reload();
});

window.addEventListener('resize', onWindowResize);
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

updateInventoryUI();
updateFlashlightUI();
updateStaminaUI();

animate();

function defaultWorldLighting() {
  const pillarGeo = new THREE.CylinderGeometry(0.4, 0.6, 6, 8);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.9 });
  const positions = [
    new THREE.Vector3(-10, 3, -10),
    new THREE.Vector3(10, 3, 10),
    new THREE.Vector3(-10, 3, 10),
    new THREE.Vector3(10, 3, -10)
  ];
  positions.forEach((pos) => {
    const mesh = new THREE.Mesh(pillarGeo, pillarMat);
    mesh.castShadow = true;
    mesh.position.copy(pos);
    scene.add(mesh);
  });
}

function createMaze() {
  const rows = mazeLayout.length;
  const cols = mazeLayout[0].length;
  const wallGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
  const itemGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const symbol = mazeLayout[row][col];
      const position = gridToWorld(row, col);
      if (symbol === '#') {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.castShadow = true;
        wall.receiveShadow = true;
        wall.position.set(position.x, CELL_SIZE / 2, position.z);
        scene.add(wall);
        walls.push(wall);
      } else if (symbol === 'S') {
        player.position.set(position.x, PLAYER_HEIGHT, position.z);
      } else if (symbol === 'E') {
        exitPosition.set(position.x, PLAYER_HEIGHT, position.z);
        doorMesh = createDoor(position);
        scene.add(doorMesh);
      } else if (symbol === 'B') {
        const battery = createCollectible('battery', position, batteryMaterial, itemGeometry);
        collectibles.push(battery);
        scene.add(battery.mesh);
      } else if (symbol === 'K') {
        const key = createCollectible('key', position, keyMaterial, itemGeometry);
        collectibles.push(key);
        scene.add(key.mesh);
      } else if (symbol === 'N') {
        const note = createCollectible('note', position, noteMaterial, itemGeometry, 'Someone is watching... stay quiet.');
        collectibles.push(note);
        scene.add(note.mesh);
      }
    }
  }

  additionalItems.forEach((item) => {
    const position = gridToWorld(item.row, item.col);
    let material = batteryMaterial;
    if (item.type === 'key') material = keyMaterial;
    if (item.type === 'note') material = noteMaterial;
    const geometry = item.type === 'note' ? new THREE.BoxGeometry(1.5, 0.4, 2) : new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const collectible = createCollectible(item.type, position, material, geometry, item.text);
    collectibles.push(collectible);
    scene.add(collectible.mesh);
  });
}

function createCollectible(type, position, material, geometry, noteText = '') {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, 1, position.z);
  mesh.castShadow = true;
  mesh.userData.type = type;
  mesh.userData.noteText = noteText;
  return { mesh, type, noteText };
}

function createDoor(position) {
  const doorGeometry = new THREE.BoxGeometry(3, 5, 0.5);
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x6c757d, metalness: 0.5, roughness: 0.4 });
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(position.x, 2.5, position.z);
  door.castShadow = true;
  door.receiveShadow = true;
  door.userData.type = 'door';
  return door;
}

function createEnemy() {
  const geometry = new THREE.SphereGeometry(1.2, 24, 24);
  const material = new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0x440000, emissiveIntensity: 0.7 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  const firstWaypoint = gridToWorld(enemyWaypoints[0].row, enemyWaypoints[0].col);
  mesh.position.set(firstWaypoint.x, 1.2, firstWaypoint.z);
  mesh.userData.waypointIndex = 0;
  return mesh;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
  switch (event.code) {
    case 'KeyW':
      moveState.forward = true;
      break;
    case 'KeyS':
      moveState.backward = true;
      break;
    case 'KeyA':
      moveState.left = true;
      break;
    case 'KeyD':
      moveState.right = true;
      break;
    case 'Space':
      if (canJump) {
        velocityY = jumpStrength;
        canJump = false;
      }
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      isSprinting = true;
      break;
    case 'KeyF':
      flashlightOn = !flashlightOn;
      if (flashlightBattery <= 0) {
        flashlightOn = false;
      }
      updateFlashlightUI();
      break;
    case 'Tab':
      event.preventDefault();
      toggleInventory();
      break;
    case 'KeyE':
      interact();
      break;
    case 'Digit1':
      if (inventoryOpen) {
        useBattery();
      }
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'KeyW':
      moveState.forward = false;
      break;
    case 'KeyS':
      moveState.backward = false;
      break;
    case 'KeyA':
      moveState.left = false;
      break;
    case 'KeyD':
      moveState.right = false;
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      isSprinting = false;
      break;
  }
}

function toggleInventory() {
  inventoryOpen = !inventoryOpen;
  hud.inventory.classList.toggle('hidden', !inventoryOpen);
  if (inventoryOpen) {
    updateInventoryUI();
  }
}

function updateInventoryUI() {
  hud.inventoryBatteries.textContent = batteryInventory;
  hud.inventoryKeys.textContent = keysInventory;
  hud.inventoryNotes.innerHTML = '';
  notesInventory.forEach((note) => {
    const li = document.createElement('li');
    li.textContent = note;
    hud.inventoryNotes.appendChild(li);
  });
}

function updateFlashlightUI() {
  flashlight.visible = flashlightOn && flashlightBattery > 0;
  hud.flashlightStatus.textContent = `Flashlight: ${flashlight.visible ? 'On' : 'Off'}`;
  hud.batteryStatus.textContent = `Battery: ${Math.round(Math.max(flashlightBattery, 0))}%`;
}

function updateStaminaUI() {
  hud.staminaBar.style.width = `${(stamina / maxStamina) * 100}%`;
}

function displayMessage(text, duration = 3) {
  hud.messages.textContent = text;
  if (text) {
    setTimeout(() => {
      if (hud.messages.textContent === text) {
        hud.messages.textContent = '';
      }
    }, duration * 1000);
  }
}

function interact() {
  tempVec.setFromMatrixPosition(camera.matrixWorld);
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  raycaster.set(tempVec, direction);
  const intersects = raycaster.intersectObjects(collectibles.map((c) => c.mesh).concat(doorMesh ? [doorMesh] : []));
  if (intersects.length === 0) return;
  const nearest = intersects[0].object;
  const distance = intersects[0].distance;
  if (distance > 3) return;
  if (nearest.userData.type === 'battery') {
    batteryInventory += 1;
    nearest.parent?.remove(nearest);
    removeCollectible(nearest);
    updateInventoryUI();
    displayMessage('Picked up a battery.');
  } else if (nearest.userData.type === 'key') {
    keysInventory += 1;
    nearest.parent?.remove(nearest);
    removeCollectible(nearest);
    updateInventoryUI();
    hud.objective.textContent = `Find ${Math.max(REQUIRED_KEYS - keysInventory, 0)} more key(s) and escape!`;
    displayMessage('You found a key.');
  } else if (nearest.userData.type === 'note') {
    const noteText = nearest.userData.noteText || 'A faded scribble with no meaning.';
    notesInventory.push(noteText);
    nearest.parent?.remove(nearest);
    removeCollectible(nearest);
    updateInventoryUI();
    displayMessage(`Note added: "${noteText}"`, 5);
  } else if (nearest.userData.type === 'door') {
    if (!doorOpened) {
      if (keysInventory >= REQUIRED_KEYS) {
        doorOpened = true;
        scene.remove(doorMesh);
        displayMessage('You unlocked the exit!');
      } else {
        displayMessage(`The door is locked. You need ${REQUIRED_KEYS - keysInventory} more key(s).`);
      }
    }
  }
}

function removeCollectible(mesh) {
  const index = collectibles.findIndex((c) => c.mesh === mesh);
  if (index >= 0) {
    collectibles.splice(index, 1);
  }
}

function useBattery() {
  if (batteryInventory > 0 && flashlightBattery < 100) {
    batteryInventory -= 1;
    flashlightBattery = Math.min(100, flashlightBattery + 50);
    updateInventoryUI();
    updateFlashlightUI();
    displayMessage('Flashlight recharged.');
  }
}

let footstepSound = null;
let audioContext = null;

function ensureFootsteps() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (!footstepSound) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 40;
    gain.gain.value = 0;
    osc.connect(gain).connect(audioContext.destination);
    osc.start();
    footstepSound = { osc, gain };
  }
}

function startFootsteps() {
  ensureFootsteps();
  if (footstepSound) {
    audioContext.resume();
    footstepSound.gain.gain.setTargetAtTime(0.08, audioContext.currentTime, 0.1);
  }
}

function stopFootsteps() {
  if (footstepSound) {
    footstepSound.gain.gain.setTargetAtTime(0, audioContext.currentTime, 0.2);
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (gameActive) {
    updateMovement(delta);
    updateFlashlight(delta);
    updateEnemy(delta);
    checkWinCondition();
  }

  renderer.render(scene, camera);
}

function updateMovement(delta) {
  const direction = new THREE.Vector3();
  const forward = new THREE.Vector3();
  player.getWorldDirection(forward);
  forward.y = 0;
  if (forward.lengthSq() > 0) {
    forward.normalize();
  }
  const right = new THREE.Vector3().crossVectors(forward, upVector).normalize();

  if (moveState.forward) direction.add(forward);
  if (moveState.backward) direction.sub(forward);
  if (moveState.left) direction.sub(right);
  if (moveState.right) direction.add(right);

  direction.y = 0;
  if (direction.lengthSq() > 0) {
    direction.normalize();
  }

  const moving = direction.lengthSq() > 0;
  const wantsSprint = isSprinting && stamina > 0 && moving;
  const speed = wantsSprint ? 10 : 5;

  if (wantsSprint) {
    stamina = Math.max(0, stamina - staminaDrainRate * delta);
    if (stamina === 0) {
      isSprinting = false;
    }
  } else {
    stamina = Math.min(maxStamina, stamina + staminaRegenRate * delta);
  }
  updateStaminaUI();

  const moveDistance = speed * delta;
  const newPosition = player.position.clone();

  const moveX = direction.x * moveDistance;
  const moveZ = direction.z * moveDistance;

  if (canMoveTo(newPosition.x + moveX, newPosition.z)) {
    newPosition.x += moveX;
  }
  if (canMoveTo(newPosition.x, newPosition.z + moveZ)) {
    newPosition.z += moveZ;
  }

  velocityY -= gravity * delta;
  newPosition.y += velocityY * delta;

  if (newPosition.y < PLAYER_HEIGHT) {
    velocityY = 0;
    newPosition.y = PLAYER_HEIGHT;
    canJump = true;
  }

  player.position.copy(newPosition);
}

function updateFlashlight(delta) {
  if (flashlightOn && flashlightBattery > 0) {
    flashlightBattery = Math.max(0, flashlightBattery - 12 * delta);
    if (flashlightBattery === 0) {
      flashlightOn = false;
    }
    updateFlashlightUI();
  }
}

function updateEnemy(delta) {
  const enemySpeed = enemyState.mode === 'chase' ? 5.5 : 3.5;
  const target = enemyState.mode === 'chase' ? player.position : getCurrentWaypoint();

  const direction = target.clone().sub(enemy.position);
  direction.y = 0;
  const distance = direction.length();
  if (distance > 0.1) {
    direction.normalize();
    const moveDistance = enemySpeed * delta;
    const newPosition = enemy.position.clone();
    const moveX = direction.x * moveDistance;
    const moveZ = direction.z * moveDistance;
    if (canEnemyMoveTo(newPosition.x + moveX, newPosition.z)) {
      newPosition.x += moveX;
    }
    if (canEnemyMoveTo(newPosition.x, newPosition.z + moveZ)) {
      newPosition.z += moveZ;
    }
    newPosition.y = enemy.position.y;
    enemy.position.copy(newPosition);
  }

  if (enemyState.mode === 'patrol' && enemy.position.distanceTo(target) < 1) {
    advanceWaypoint();
  }

  const playerDistance = enemy.position.distanceTo(player.position);
  const detectionRadius = computeDetectionRadius(enemy.position);
  const canSeePlayer = hasLineOfSight(enemy.position, player.position);

  if (enemyState.mode === 'patrol') {
    if (playerDistance < detectionRadius && canSeePlayer) {
      enemyState.mode = 'chase';
      enemyState.lostTimer = 0;
      displayMessage('You have been spotted!');
    }
  } else if (enemyState.mode === 'chase') {
    if (!canSeePlayer || playerDistance > detectionRadius * 1.5) {
      enemyState.lostTimer += delta;
      if (enemyState.lostTimer > 3) {
        enemyState.mode = 'patrol';
        displayMessage('You lost the pursuer.');
      }
    } else {
      enemyState.lostTimer = 0;
    }

    if (playerDistance < 1.5) {
      onPlayerCaught();
    }
  }

  if (playerDistance < 8) {
    startFootsteps();
  } else {
    stopFootsteps();
  }
}

function computeDetectionRadius(enemyPosition) {
  let radius = 12;

  if (isSprinting && stamina > 0) {
    radius += 4;
  }

  if (flashlight.visible) {
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    if (cameraDirection.lengthSq() > 0) {
      cameraDirection.normalize();
    }

    const toEnemy = enemyPosition.clone().sub(player.position);
    toEnemy.y = 0;
    if (toEnemy.lengthSq() > 0) {
      toEnemy.normalize();
      const angle = cameraDirection.angleTo(toEnemy);
      if (angle < Math.PI / 6) {
        radius += 8;
      } else if (angle < Math.PI / 3) {
        radius += 4;
      } else {
        radius += 2;
      }
    } else {
      radius += 6;
    }
  }

  return radius;
}

function hasLineOfSight(from, to) {
  const direction = to.clone().sub(from);
  const distance = direction.length();
  direction.normalize();
  raycaster.set(from, direction);
  const obstacles = (!doorOpened && doorMesh) ? walls.concat([doorMesh]) : walls;
  const intersects = raycaster.intersectObjects(obstacles, true);
  if (intersects.length > 0 && intersects[0].distance < distance) {
    return false;
  }
  return true;
}

function getCurrentWaypoint() {
  const index = enemy.userData.waypointIndex;
  const waypoint = enemyWaypoints[index];
  return gridToWorld(waypoint.row, waypoint.col);
}

function advanceWaypoint() {
  enemy.userData.waypointIndex = (enemy.userData.waypointIndex + 1) % enemyWaypoints.length;
}

function onPlayerCaught() {
  if (!gameActive) return;
  gameActive = false;
  controls.unlock();
  hud.result.classList.remove('hidden');
  hud.resultTitle.textContent = 'Caught!';
  displayMessage('The enemy caught you.');
  stopFootsteps();
}

function checkWinCondition() {
  if (!doorOpened) return;
  const distance = player.position.distanceTo(exitPosition);
  if (distance < 2.5) {
    gameActive = false;
    controls.unlock();
    hud.result.classList.remove('hidden');
    hud.resultTitle.textContent = 'Escaped!';
    displayMessage('You escaped the maze!');
    stopFootsteps();
  }
}

function gridToWorld(row, col) {
  const originX = -(mazeLayout[0].length * CELL_SIZE) / 2 + CELL_SIZE / 2;
  const originZ = -(mazeLayout.length * CELL_SIZE) / 2 + CELL_SIZE / 2;
  return new THREE.Vector3(originX + col * CELL_SIZE, 0, originZ + row * CELL_SIZE);
}

function positionIsWalkable(x, z, radius, considerDoor = true) {
  const offsets = [
    [radius, radius],
    [radius, -radius],
    [-radius, radius],
    [-radius, -radius]
  ];
  return offsets.every(([dx, dz]) => {
    const grid = worldToGrid(x + dx, z + dz);
    if (!grid) return false;
    const symbol = mazeLayout[grid.row][grid.col];
    return !isBlockedSymbol(symbol, considerDoor);
  });
}

function isBlockedSymbol(symbol, considerDoor = true) {
  if (symbol === '#') return true;
  if (symbol === 'E' && considerDoor && !doorOpened) return true;
  return false;
}

function canMoveTo(x, z) {
  return positionIsWalkable(x, z, PLAYER_RADIUS, true);
}

function canEnemyMoveTo(x, z) {
  return positionIsWalkable(x, z, 1, true);
}

function worldToGrid(x, z) {
  const cols = mazeLayout[0].length;
  const rows = mazeLayout.length;
  const originX = -(cols * CELL_SIZE) / 2;
  const originZ = -(rows * CELL_SIZE) / 2;
  const col = Math.floor((x - originX) / CELL_SIZE);
  const row = Math.floor((z - originZ) / CELL_SIZE);
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
  return { row, col };
}
