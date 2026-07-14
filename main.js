// --- 1. グローバルオブジェクトの定義 ---
const SEED = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    return parseInt(`${yyyy}${mm}${dd}${hh}`, 10);
})();

window.Backrooms = {
    levels: {},
    registerLevel: function(id, config) {
        this.levels[id] = config;
    },
    GRID_SCALE: 4,
    CHUNK_SIZE: 8,
    SEED: SEED,
    getRand: function(x, z, seedOffset = 0) {
        const val = Math.sin(x * 12.9898 + z * 78.233 + (this.SEED + seedOffset) * 0.13) * 43758.5453123;
        return val - Math.floor(val);
    }
};

// --- 2. 3Dシーン基本設定 ---
const GRID_SCALE = window.Backrooms.GRID_SCALE;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x13130c, 0.055);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(4 * GRID_SCALE, 1.7, 4 * GRID_SCALE);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x13130c);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// --- 3. デフォルトテクスチャとマテリアルの動的生成 ---
function generateDefaultTextures() {
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 256;
    wallCanvas.height = 256;
    const ctxW = wallCanvas.getContext('2d');
    ctxW.fillStyle = '#dbcca0';
    ctxW.fillRect(0, 0, 256, 256);
    ctxW.fillStyle = '#bfae80';
    for (let i = 0; i < 256; i += 16) {
        ctxW.fillRect(i, 0, 4, 256);
    }
    ctxW.fillStyle = 'rgba(0,0,0,0.03)';
    for (let i = 0; i < 500; i++) {
        ctxW.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 8, Math.random() * 8);
    }

    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 128;
    floorCanvas.height = 128;
    const ctxF = floorCanvas.getContext('2d');
    ctxF.fillStyle = '#807050';
    ctxF.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 5000; i++) {
        const colorVal = Math.random() * 20 - 10;
        ctxF.fillStyle = `rgba(${colorVal}, ${colorVal}, ${colorVal}, 0.12)`;
        ctxF.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
    }

    const ceilCanvas = document.createElement('canvas');
    ceilCanvas.width = 256;
    ceilCanvas.height = 256;
    const ctxC = ceilCanvas.getContext('2d');
    ctxC.fillStyle = '#dfdfd0';
    ctxC.fillRect(0, 0, 256, 256);
    ctxC.strokeStyle = '#9c9c8a';
    ctxC.lineWidth = 4;
    ctxC.strokeRect(0, 0, 256, 256);
    ctxC.fillStyle = '#b0b0a0';
    for (let i = 0; i < 400; i++) {
        ctxC.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    const wallTex = new THREE.CanvasTexture(wallCanvas);
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    const ceilTex = new THREE.CanvasTexture(ceilCanvas);

    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;

    return { wallTex, floorTex, ceilTex };
}

const defaultTextures = generateDefaultTextures();
const defaultWallMat = new THREE.MeshStandardMaterial({ map: defaultTextures.wallTex, roughness: 0.8, metalness: 0.1 });
const defaultFloorMat = new THREE.MeshStandardMaterial({ map: defaultTextures.floorTex, roughness: 0.9, metalness: 0.0 });
const defaultCeilMat = new THREE.MeshStandardMaterial({ map: defaultTextures.ceilTex, roughness: 0.7, metalness: 0.1 });

window.Backrooms.defaultWallMat = defaultWallMat;
window.Backrooms.defaultFloorMat = defaultFloorMat;
window.Backrooms.defaultCeilMat = defaultCeilMat;

// 共有ジオメトリ
const floorTileGeo = new THREE.PlaneGeometry(GRID_SCALE, GRID_SCALE);
const ceilTileGeo = new THREE.PlaneGeometry(GRID_SCALE, GRID_SCALE);
const fixtureGeo = new THREE.BoxGeometry(1.6, 0.08, 0.6);
const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xfffcd0 });

// 照明
const ambientLight = new THREE.AmbientLight(0x2c2c1c, 0.38);
scene.add(ambientLight);

const flashlight = new THREE.SpotLight(0xfffbe0, 2.2, 22, Math.PI / 5.6, 0.5, 1.2);
flashlight.position.set(0, 0, 0);

const flashlightTarget = new THREE.Object3D();
flashlightTarget.position.set(0, 0, -1);
camera.add(flashlightTarget);
flashlight.target = flashlightTarget;

camera.add(flashlight);
scene.add(camera);

// --- 4. レベルマネージャー (LevelManager) ---
let currentLevelId = null;
let currentLevel = null;
let isSwitching = false;

function switchLevel(newLevelId) {
    const nextLevel = window.Backrooms.levels[newLevelId];
    if (!nextLevel) {
        console.error(`Level ${newLevelId} is not registered.`);
        return;
    }

    isSwitching = true;
    currentLevelId = newLevelId;
    currentLevel = nextLevel;

    // グリッチオーバーレイ（赤いフラッシュ）のイージング演出
    const glitchOverlay = document.getElementById('glitch-overlay');
    if (glitchOverlay) {
        glitchOverlay.style.opacity = '1';
    }

    setTimeout(() => {
        // アクティブタイルのメッシュ削除とリソース解放
        for (const [key, tile] of activeTiles.entries()) {
            tile.meshes.forEach(mesh => {
                scene.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(mat => {
                            if (mat.map) mat.map.dispose();
                            mat.dispose();
                        });
                    } else {
                        if (mesh.material.map) mesh.material.map.dispose();
                        mesh.material.dispose();
                    }
                }
            });
        }
        activeTiles.clear();
        lastGridX = NaN;
        lastGridZ = NaN;

        // レベル固有の環境情報（フォグ、環境光）適用
        if (scene.fog) {
            scene.fog.color.setHex(currentLevel.fogColor !== undefined ? currentLevel.fogColor : 0x13130c);
            scene.fog.density = currentLevel.fogDensity !== undefined ? currentLevel.fogDensity : 0.055;
        }
        renderer.setClearColor(currentLevel.fogColor !== undefined ? currentLevel.fogColor : 0x13130c);

        ambientLight.color.setHex(currentLevel.ambientColor !== undefined ? currentLevel.ambientColor : 0x2c2c1c);
        ambientLight.intensity = currentLevel.ambientIntensity !== undefined ? currentLevel.ambientIntensity : 0.38;

        // カメラ位置・角度リセット
        const spawnGrid = currentLevel.spawnPosition || [4, 4];
        camera.position.set(spawnGrid[0] * GRID_SCALE, 1.7, spawnGrid[1] * GRID_SCALE);
        yaw = currentLevel.spawnYaw || 0;
        pitch = 0;
        camera.rotation.set(0, yaw, 0, 'YXZ');

        // レベル固有のカスタム初期化
        if (typeof currentLevel.init === 'function') {
            currentLevel.init(scene);
        }

        updateProceduralMap();

        if (glitchOverlay) {
            glitchOverlay.style.opacity = '0';
        }

        setTimeout(() => {
            isSwitching = false;
        }, 300);

    }, 1000);
}

// --- 5. チャンク/タイル生成のデリゲート ---
const LOAD_RADIUS = 9;
const UNLOAD_RADIUS = 11;
const activeTiles = new Map();

let lastGridX = NaN;
let lastGridZ = NaN;

function getTileType(gridX, gridZ) {
    if (currentLevel && typeof currentLevel.getTileType === 'function') {
        return currentLevel.getTileType(gridX, gridZ, window.Backrooms.SEED);
    }
    return 0;
}

function generateTile(gx, gz) {
    const key = `${gx},${gz}`;
    const tile = {
        meshes: [],
        colliders: []
    };

    const type = getTileType(gx, gz);
    const bx = gx * GRID_SCALE;
    const bz = gz * GRID_SCALE;

    const floorMat = (currentLevel && currentLevel.floorMat) || defaultFloorMat;
    const ceilMat = (currentLevel && currentLevel.ceilMat) || defaultCeilMat;

    // 床（タイプ6: 奈落以外）
    if (type !== 6) {
        const floor = new THREE.Mesh(floorTileGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(bx, 0, bz);
        scene.add(floor);
        tile.meshes.push(floor);
    }

    // 天井
    const ceiling = new THREE.Mesh(ceilTileGeo, ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(bx, GRID_SCALE, bz);
    scene.add(ceiling);
    tile.meshes.push(ceiling);

    // 蛍光灯意匠 (タイプ0のみ)
    if (type === 0) {
        const randLight = window.Backrooms.getRand(gx, gz, 1);
        if (randLight < 0.15) {
            const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
            fixture.position.set(bx, GRID_SCALE - 0.04, bz);
            scene.add(fixture);
            tile.meshes.push(fixture);
        }
    }

    // レベル固有のオブジェクト生成に委譲
    if (currentLevel && typeof currentLevel.generateTileObject === 'function') {
        currentLevel.generateTileObject(gx, gz, type, bx, bz, tile, scene);
    }

    activeTiles.set(key, tile);
}

function updateProceduralMap() {
    const px = camera.position.x;
    const pz = camera.position.z;
    const currentGridX = Math.floor(px / GRID_SCALE + 0.5);
    const currentGridZ = Math.floor(pz / GRID_SCALE + 0.5);

    if (currentGridX === lastGridX && currentGridZ === lastGridZ) {
        return;
    }

    lastGridX = currentGridX;
    lastGridZ = currentGridZ;

    for (let dr = -LOAD_RADIUS; dr <= LOAD_RADIUS; dr++) {
        for (let dc = -LOAD_RADIUS; dc <= LOAD_RADIUS; dc++) {
            if (dr * dr + dc * dc > LOAD_RADIUS * LOAD_RADIUS) continue;

            const gx = currentGridX + dc;
            const gz = currentGridZ + dr;
            const key = `${gx},${gz}`;

            if (!activeTiles.has(key)) {
                generateTile(gx, gz);
            }
        }
    }

    for (const [key, tile] of activeTiles.entries()) {
        const [gx, gz] = key.split(',').map(Number);
        const dx = gx - currentGridX;
        const dz = gz - currentGridZ;

        if (dx * dx + dz * dz > UNLOAD_RADIUS * UNLOAD_RADIUS) {
            tile.meshes.forEach(mesh => {
                scene.remove(mesh);
            });
            activeTiles.delete(key);
        }
    }
}

// --- 6. プレイヤーコントロールと衝突判定 ---
let yaw = 0;
let pitch = 0;
const keys = { w: false, a: false, s: false, d: false };
const mouseSensitivity = 0.0022;
const playerSpeed = 0.055;
const playerRadius = 0.28;

let isFalling = false;
let fallTimer = 0;

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body && !isSwitching) {
        yaw -= e.movementX * mouseSensitivity;
        pitch -= e.movementY * mouseSensitivity;
        pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, pitch));
        camera.rotation.set(pitch, yaw, 0, 'YXZ');
    }
});

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key in keys) keys[key] = true;

    if (key === 'f') {
        if (document.pointerLockElement === document.body && !isFalling && !isSwitching) {
            toggleFlashlight();
        }
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key in keys) keys[key] = false;
});

function toggleFlashlight() {
    flashlight.visible = !flashlight.visible;
    playClickSound();
}

const playerBox = new THREE.Box3();

function checkCollision(x, z) {
    const r = playerRadius;
    playerBox.min.set(x - r, 0.1, z - r);
    playerBox.max.set(x + r, 3.5, z + r);

    const gridX = Math.floor(x / GRID_SCALE + 0.5);
    const gridZ = Math.floor(z / GRID_SCALE + 0.5);

    for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
            const gx = gridX + dc;
            const gz = gridZ + dr;
            const key = `${gx},${gz}`;
            const tile = activeTiles.get(key);

            if (tile && tile.colliders) {
                for (let i = 0; i < tile.colliders.length; i++) {
                    if (playerBox.intersectsBox(tile.colliders[i])) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

// --- 7. Web Audio API による音響合成 ---
let audioCtx = null;

function startHumNoise() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const osc1 = audioCtx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(60, audioCtx.currentTime);
    const osc1Gain = audioCtx.createGain();
    osc1Gain.gain.setValueAtTime(0.2, audioCtx.currentTime);

    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(120, audioCtx.currentTime);
    const osc2Gain = audioCtx.createGain();
    osc2Gain.gain.setValueAtTime(0.08, audioCtx.currentTime);

    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1800;
    noiseFilter.Q.value = 1.2;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.015, audioCtx.currentTime);

    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.55, audioCtx.currentTime);

    osc1.connect(osc1Gain).connect(masterGain);
    osc2.connect(osc2Gain).connect(masterGain);
    whiteNoise.connect(noiseFilter).connect(noiseGain).connect(masterGain);
    masterGain.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    whiteNoise.start();
}

function playClickSound() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.05);

    const noiseLength = audioCtx.sampleRate * 0.015;
    const noiseBuffer = audioCtx.createBuffer(1, noiseLength, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(2500, now);

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.005, now + 0.015);

    noiseSource.connect(noiseFilter).connect(noiseGain).connect(audioCtx.destination);
    noiseSource.start(now);
    noiseSource.stop(now + 0.02);
}

function playGlitchSound() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.linearRampToValueAtTime(25, now + 1.0);

    const mod = audioCtx.createOscillator();
    mod.type = 'square';
    mod.frequency.setValueAtTime(12, now);
    mod.frequency.linearRampToValueAtTime(160, now + 1.0);

    const modGain = audioCtx.createGain();
    modGain.gain.setValueAtTime(320, now);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    mod.connect(modGain);
    modGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    mod.start(now);
    osc.stop(now + 1.0);
    mod.stop(now + 1.0);
}

// --- 8. ポインターロックと開始処理 ---
const overlay = document.getElementById('overlay');
overlay.addEventListener('click', () => {
    document.body.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === document.body) {
        overlay.style.display = 'none';
        startHumNoise();
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } else {
        overlay.style.display = 'flex';
        if (audioCtx && audioCtx.state === 'running') {
            audioCtx.suspend();
        }
    }
});

// --- 9. ゲームループ（更新処理） ---
let bobTimer = 0;

function animate() {
    requestAnimationFrame(animate);

    if (document.pointerLockElement === document.body) {
        updateProceduralMap();

        const px = camera.position.x;
        const pz = camera.position.z;
        const currentGridX = Math.floor(px / GRID_SCALE + 0.5);
        const currentGridZ = Math.floor(pz / GRID_SCALE + 0.5);

        // --- 奈落落下イベントの検知 ---
        if (!isFalling && !isSwitching && getTileType(currentGridX, currentGridZ) === 6) {
            const bx = currentGridX * GRID_SCALE;
            const bz = currentGridZ * GRID_SCALE;
            const distToCenter = Math.sqrt((px - bx) ** 2 + (pz - bz) ** 2);
            if (distToCenter < 1.1) {
                isFalling = true;
                fallTimer = 0;
                playGlitchSound();
            }
        }

        if (isFalling) {
            camera.position.y -= 0.16;
            fallTimer++;

            const glitchOverlay = document.getElementById('glitch-overlay');
            if (glitchOverlay) {
                glitchOverlay.style.opacity = Math.min(1.0, fallTimer / 32);
            }

            if (fallTimer > 50) {
                isFalling = false;
                if (glitchOverlay) {
                    glitchOverlay.style.opacity = '0';
                }
                
                // 次の移行先レベルへ切り替え
                const nextId = (currentLevel && currentLevel.nextLevelId) || 'level0';
                switchLevel(nextId);
            }
        } else {
            let moveX = 0;
            let moveZ = 0;

            if (!isSwitching) {
                const sinY = Math.sin(yaw);
                const cosY = Math.cos(yaw);

                if (keys.w) { moveX -= sinY; moveZ -= cosY; }
                if (keys.s) { moveX += sinY; moveZ += cosY; }
                if (keys.a) { moveX -= cosY; moveZ += sinY; }
                if (keys.d) { moveX += cosY; moveZ -= sinY; }
            }

            const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
            if (len > 0) {
                moveX = (moveX / len) * playerSpeed;
                moveZ = (moveZ / len) * playerSpeed;

                bobTimer += 0.16;
                camera.position.y = 1.7 + Math.sin(bobTimer) * 0.05;
            } else {
                camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.7, 0.1);
            }

            const targetX = camera.position.x + moveX;
            const targetZ = camera.position.z + moveZ;

            if (!checkCollision(targetX, camera.position.z)) {
                camera.position.x = targetX;
            }
            if (!checkCollision(camera.position.x, targetZ)) {
                camera.position.z = targetZ;
            }
        }
    }

    renderer.render(scene, camera);
}

// 初期化実行関数
function initGame() {
    const seedDisplay = document.getElementById('seed-display');
    if (seedDisplay) {
        seedDisplay.innerText = `SEED (LEVEL ID): ${window.Backrooms.SEED}`;
    }
    setTimeout(() => {
        const initialLevelId = 'level0';
        switchLevel(initialLevelId);
    }, 100);
}

// DOMが既にロードされているか確認して実行
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});