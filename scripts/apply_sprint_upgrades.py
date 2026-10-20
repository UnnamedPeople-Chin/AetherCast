import re

with open('D:/Project/AetherCast/app.js', 'r', encoding='utf-8') as f:
    code = f.read()

# -------------------------------------------------------------
# 1. Inject AetherAudioEngine & Sound Effects
# -------------------------------------------------------------
audio_engine_code = '''
// =============================================================
// ZERO-ASSET PROCEDURAL WEB AUDIO SYNTHESIZER ENGINE (SFX)
// =============================================================
class AetherAudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isUnlocked = false;
        this.lastShieldHumTime = 0;
        this.lastBlackholeDroneTime = 0;
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext({ latencyHint: 'interactive' });
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
            this.isUnlocked = true;
        } catch (e) {
            console.warn('Web Audio API not supported or blocked:', e);
        }
    }

    unlock() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // 1. Doctor Strange Shield Hum & Harmonics
    playShieldHum(progress = 1.0) {
        if (!this.isUnlocked || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (now - this.lastShieldHumTime < 0.12) return;
        this.lastShieldHumTime = now;

        try {
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(144, now);
            osc.frequency.exponentialRampToValueAtTime(216, now + 0.14);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(450, now);
            filter.Q.setValueAtTime(3.0, now);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.15 * progress, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    }

    // 2. Cosmic Plasma Projectile Whoosh
    playCosmicThrow() {
        if (!this.isUnlocked || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(580, now);
            osc.frequency.exponentialRampToValueAtTime(160, now + 0.26);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.27);
        } catch (e) {}
    }

    // 3. Gargantua Singularity Sub-Bass Drone
    playBlackholeTether(charge = 0.0) {
        if (!this.isUnlocked || !this.ctx) return;
        const now = this.ctx.currentTime;
        if (now - this.lastBlackholeDroneTime < 0.1) return;
        this.lastBlackholeDroneTime = now;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            const baseFreq = 48 + charge * 36;
            osc.frequency.setValueAtTime(baseFreq, now);

            gain.gain.setValueAtTime(0.08 + charge * 0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.11);
        } catch (e) {}
    }

    // 4. Mega Supernova Explosion (Synthesized White Noise + Sub Thud)
    playSupernova(intensity = 1.0) {
        if (!this.isUnlocked || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const bufferSize = Math.floor(this.ctx.sampleRate * 0.55);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1200, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + 0.5);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.35 * Math.min(2.0, intensity), now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.masterGain);

            // Sub Bass Impact
            const thud = this.ctx.createOscillator();
            const thudGain = this.ctx.createGain();
            thud.frequency.setValueAtTime(110, now);
            thud.frequency.exponentialRampToValueAtTime(28, now + 0.4);
            thudGain.gain.setValueAtTime(0.45 * Math.min(2.0, intensity), now);
            thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

            thud.connect(thudGain);
            thudGain.connect(this.masterGain);

            noise.start(now);
            thud.start(now);
            noise.stop(now + 0.55);
            thud.stop(now + 0.45);
        } catch (e) {}
    }
}

const soundEngine = new AetherAudioEngine();
window.addEventListener('pointerdown', () => soundEngine.unlock(), { once: true });
'''

# -------------------------------------------------------------
# 2. Mathematical Coordinate Transformation Engine (Cover Mode)
# -------------------------------------------------------------
coord_mapping_code = '''
// =============================================================
// MATHEMATICAL COORDINATE TRANSFORMATION ENGINE (OBJECT-FIT: COVER)
// =============================================================
function mapCameraToViewport(normX, normY, camW, camH, winW, winH, isMirrored = true) {
    const scale = Math.max(winW / camW, winH / camH);
    const renderedW = camW * scale;
    const renderedH = camH * scale;

    const offsetX = (winW - renderedW) * 0.5;
    const offsetY = (winH - renderedH) * 0.5;

    const effectiveU = isMirrored ? (1.0 - normX) : normX;

    const xWin = offsetX + (effectiveU * renderedW);
    const yWin = offsetY + (normY * renderedH);

    return {
        x: xWin / winW,
        y: yWin / winH
    };
}
'''

# -------------------------------------------------------------
# 3. Predictive Tracking & Dead-Reckoning Extrapolation
# -------------------------------------------------------------
predictive_tracking_code = '''
// =============================================================
// PREDICTIVE DEAD-RECKONING LANDMARK EXTRAPOLATION
// =============================================================
class PredictiveLandmarkTracker {
    constructor() {
        this.maxExtrapolatedFrames = 3;
        this.extrapolatedCount = 0;
        this.velocity = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
        this.lastLandmarks = null;
        this.lastTimestamp = 0;
    }

    update(rawLandmarks, timestamp) {
        if (!rawLandmarks || rawLandmarks.length === 0) {
            return this.extrapolate(timestamp);
        }

        const dt = Math.max(0.001, (timestamp - this.lastTimestamp) / 1000);
        this.extrapolatedCount = 0;

        if (this.lastLandmarks) {
            for (let i = 0; i < 21; i++) {
                this.velocity[i].x = ((rawLandmarks[i].x - this.lastLandmarks[i].x) / dt) * 0.85;
                this.velocity[i].y = ((rawLandmarks[i].y - this.lastLandmarks[i].y) / dt) * 0.85;
                this.velocity[i].z = ((rawLandmarks[i].z - (this.lastLandmarks[i].z || 0)) / dt) * 0.85;
            }
        }

        this.lastLandmarks = rawLandmarks.map(p => ({ ...p }));
        this.lastTimestamp = timestamp;
        return { landmarks: rawLandmarks, isPredicted: false };
    }

    extrapolate(timestamp) {
        if (!this.lastLandmarks || this.extrapolatedCount >= this.maxExtrapolatedFrames) {
            return null;
        }

        const dt = Math.max(0.001, (timestamp - this.lastTimestamp) / 1000);
        this.extrapolatedCount++;
        const decay = Math.pow(0.72, this.extrapolatedCount);

        const predicted = this.lastLandmarks.map((p, i) => ({
            x: p.x + this.velocity[i].x * dt * decay,
            y: p.y + this.velocity[i].y * dt * decay,
            z: (p.z || 0) + this.velocity[i].z * dt * decay
        }));

        this.lastLandmarks = predicted;
        this.lastTimestamp = timestamp;
        return { landmarks: predicted, isPredicted: true };
    }
}

const predictiveTracker = new PredictiveLandmarkTracker();
'''

# -------------------------------------------------------------
# 4. Secondary Mirrored Mouse Hand for Dual-Hand Emulation
# -------------------------------------------------------------
dual_mouse_code = '''
// =============================================================
// DUAL-HAND VIRTUAL EMULATION SUITE (KEYBOARD + MOUSE)
// =============================================================
const secondaryMouseHand = {
    id: 99,
    isMouse: true,
    trackedFrames: 60,
    lostFrames: 0,
    palm: { x: 0.35, y: 0.5 },
    wrist: { x: 0.35, y: 0.65 },
    fingertips: [
        { x: 0.35, y: 0.5 },
        { x: 0.35, y: 0.5 },
        { x: 0.35, y: 0.5 },
        { x: 0.35, y: 0.5 },
        { x: 0.35, y: 0.5 }
    ],
    isFist: false,
    isOpenPalm: true,
    isShieldTouch: false,
    isPinchTap: false,
    trail: []
};

let isDualMouseSimActive = false;

window.addEventListener('keydown', (e) => {
    if (!enableMouseControl) return;

    if (e.code === 'Space') {
        e.preventDefault();
        isDualMouseSimActive = !isDualMouseSimActive;
        statusText.textContent = isDualMouseSimActive ? 'Dual Hand Sim: AKTIF' : 'Dual Hand Sim: NONAKTIF';
        statusBadge.className = isDualMouseSimActive ? 'badge success' : 'badge info';
    }

    if (e.code === 'KeyF') {
        mouseHand.isFist = true;
        secondaryMouseHand.isFist = true;
    }

    if (e.code === 'KeyS') {
        mouseHand.isShieldTouch = true;
        secondaryMouseHand.isShieldTouch = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'KeyF') {
        mouseHand.isFist = false;
        secondaryMouseHand.isFist = false;
    }
    if (e.code === 'KeyS') {
        mouseHand.isShieldTouch = false;
        secondaryMouseHand.isShieldTouch = false;
    }
});
'''

# -------------------------------------------------------------
# 5. Glassmorphic Camera Error Modal Handlers
# -------------------------------------------------------------
camera_modal_code = '''
// =============================================================
// GLASSMORPHIC CAMERA ERROR & FALLBACK MODAL HANDLERS
// =============================================================
const modalErrorEl = document.getElementById('camera-error-modal');
const modalTitleEl = document.getElementById('error-modal-title');
const modalDescEl = document.getElementById('error-modal-desc');
const cameraSelectDropdown = document.getElementById('camera-select-dropdown');
const btnModalRetry = document.getElementById('btn-modal-retry');
const btnModalMouseFallback = document.getElementById('btn-modal-mouse-fallback');
const btnModalClose = document.getElementById('btn-modal-close');

let userSelectedCameraId = null;

async function populateCameraDevices() {
    if (!cameraSelectDropdown) return;
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        cameraSelectDropdown.innerHTML = '';

        if (videoDevices.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = 'Tidak ada webcam terdeteksi';
            cameraSelectDropdown.appendChild(opt);
            return;
        }

        videoDevices.forEach((dev, idx) => {
            const opt = document.createElement('option');
            opt.value = dev.deviceId;
            opt.textContent = dev.label || `Kamera ${idx + 1}`;
            if (userSelectedCameraId && dev.deviceId === userSelectedCameraId) {
                opt.selected = true;
            }
            cameraSelectDropdown.appendChild(opt);
        });
    } catch (e) {
        console.warn('Gagal membaca daftar perangkat kamera:', e);
    }
}

function showCameraErrorModal(err) {
    if (!modalErrorEl) return;
    populateCameraDevices();

    let title = 'Akses Kamera Terkendala';
    let desc = 'Terjadi kesalahan saat menghubungkan ke perangkat webcam.';

    if (err) {
        switch (err.name) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                title = 'Izin Kamera Ditolak';
                desc = 'Aplikasi tidak memiliki izin mengakses webcam. Berikan izin kamera di pengaturan OS/Browser lalu tekan Coba Lagi.';
                break;
            case 'NotReadableError':
            case 'TrackStartError':
                title = 'Kamera Sedang Dipakai Aplikasi Lain';
                desc = 'Webcam tidak dapat dibuka karena sedang digunakan aplikasi lain (OBS Studio, Zoom, Discord, Teams). Tutup aplikasi tersebut atau pilih kamera alternatif di bawah.';
                break;
            case 'NotFoundError':
            case 'DevicesNotFoundError':
                title = 'Webcam Tidak Ditemukan';
                desc = 'Tidak ada perangkat kamera yang terpasang. Anda tetap dapat menggunakan AetherCast dengan Mode Mouse.';
                break;
            case 'OverconstrainedError':
                title = 'Resolusi Tidak Didukung';
                desc = 'Kamera tidak mendukung profil resolusi HD yang diminta. Coba kamera lain atau profil default.';
                break;
        }
    }

    if (modalTitleEl) modalTitleEl.textContent = title;
    if (modalDescEl) modalDescEl.textContent = desc;
    modalErrorEl.classList.remove('hidden');
}

if (btnModalRetry) {
    btnModalRetry.addEventListener('click', () => {
        if (modalErrorEl) modalErrorEl.classList.add('hidden');
        if (cameraSelectDropdown && cameraSelectDropdown.value) {
            userSelectedCameraId = cameraSelectDropdown.value;
        }
        toggleCamera();
    });
}

if (btnModalMouseFallback) {
    btnModalMouseFallback.addEventListener('click', () => {
        if (modalErrorEl) modalErrorEl.classList.add('hidden');
        enableMouseControl = true;
        btnMouse.classList.add('active');
        statusBadge.className = 'badge info';
        statusText.textContent = 'Mode Mouse Aktif';
    });
}

if (btnModalClose) {
    btnModalClose.addEventListener('click', () => {
        if (modalErrorEl) modalErrorEl.classList.add('hidden');
    });
}
'''

# Apply insertions
# Place audio engine & coordinate mapper near top
code = audio_engine_code + '\n' + coord_mapping_code + '\n' + predictive_tracking_code + '\n' + code

# Wire sound effects into triggers
code = code.replace(
    'function triggerSupernovaExplosion(x, y, intensity = 1.0) {',
    'function triggerSupernovaExplosion(x, y, intensity = 1.0) {\n    soundEngine.playSupernova(intensity);'
)

code = code.replace(
    'function launchCosmicProjectile(fromId, toId, startX, startY, targetX, targetY) {',
    'function launchCosmicProjectile(fromId, toId, startX, startY, targetX, targetY) {\n    soundEngine.playCosmicThrow();'
)

# Wire shield sound into drawDoctorStrangeShield
code = code.replace(
    'function drawDoctorStrangeShield(ctx, x, y, baseRadius = 150, progress = 1.0) {',
    'function drawDoctorStrangeShield(ctx, x, y, baseRadius = 150, progress = 1.0) {\n    soundEngine.playShieldHum(progress);'
)

# Wire blackhole tether sound
code = code.replace(
    'function drawBlackhole(ctx, x, y, chargeRatio = 0, birthProgress = 1.0) {',
    'function drawBlackhole(ctx, x, y, chargeRatio = 0, birthProgress = 1.0) {\n    if (birthProgress > 0.5) soundEngine.playBlackholeTether(chargeRatio);'
)

code = code.replace(
    'function drawGigaBlackhole(ctx, x1, y1, x2, y2, midX, midY, chargeRatio = 0, birthProgress = 1.0) {',
    'function drawGigaBlackhole(ctx, x1, y1, x2, y2, midX, midY, chargeRatio = 0, birthProgress = 1.0) {\n    if (birthProgress > 0.5) soundEngine.playBlackholeTether(chargeRatio * 1.5);'
)

# Coordinate mapping inside onHandResults
old_get_coord = '''            const getCoord = (lm) => ({
                x: isMirrored ? 1 - lm.x : lm.x,
                y: lm.y,
                z: lm.z
            });'''

new_get_coord = '''            const camW = (videoElement && videoElement.videoWidth) ? videoElement.videoWidth : 1280;
            const camH = (videoElement && videoElement.videoHeight) ? videoElement.videoHeight : 720;
            const winW = window.innerWidth || 1920;
            const winH = window.innerHeight || 1080;

            const getCoord = (lm) => {
                const mapped = mapCameraToViewport(lm.x, lm.y, camW, camH, winW, winH, isMirrored);
                return {
                    x: mapped.x,
                    y: mapped.y,
                    z: lm.z || 0
                };
            };'''

code = code.replace(old_get_coord, new_get_coord)

# Replace alert in toggleCamera with showCameraErrorModal
old_camera_error = '''        } catch (err) {
            console.error('Camera access denied or failed:', err);
            alert('Tidak dapat mengakses webcam. Pastikan izin kamera telah diberikan!');
            statusBadge.className = 'badge warning';
            statusText.textContent = 'Akses Kamera Gagal';
        }'''

new_camera_error = '''        } catch (err) {
            console.error('Camera access denied or failed:', err);
            showCameraErrorModal(err);
            statusBadge.className = 'badge warning';
            statusText.textContent = 'Akses Kamera Gagal';
        }'''

code = code.replace(old_camera_error, new_camera_error)

# Update offline MediaPipe path constants
old_urls = '''const VISION_BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs';
const VISION_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';'''

new_urls = '''// Offline-First Asset Resolution: Local Vendor files first, CDN as fallback
const LOCAL_VENDOR_BUNDLE = './assets/vendor/mediapipe/vision_bundle.mjs';
const LOCAL_VENDOR_WASM = './assets/vendor/mediapipe/wasm';
const LOCAL_VENDOR_MODEL = './assets/vendor/mediapipe/hand_landmarker.task';

const CDN_BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs';
const CDN_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const CDN_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';'''

code = code.replace(old_urls, new_urls)

# Update initMediaPipe to attempt offline first
old_init_mediapipe = '''            const { FilesetResolver, HandLandmarker } = await import(VISION_BUNDLE_URL);
            const vision = await FilesetResolver.forVisionTasks(VISION_WASM_URL);
            handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: HAND_MODEL_URL,
                    delegate: 'GPU'
                },'''

new_init_mediapipe = '''            let FilesetResolver, HandLandmarker, vision;
            try {
                const bundle = await import(LOCAL_VENDOR_BUNDLE);
                FilesetResolver = bundle.FilesetResolver;
                HandLandmarker = bundle.HandLandmarker;
                vision = await FilesetResolver.forVisionTasks(LOCAL_VENDOR_WASM);
                handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: LOCAL_VENDOR_MODEL,
                        delegate: 'GPU'
                    },
                    runningMode: 'VIDEO',
                    numHands: 2,
                    minHandDetectionConfidence: 0.5,
                    minHandPresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                console.log('✅ MediaPipe initialized via Local Offline Bundle.');
            } catch (offlineErr) {
                console.warn('Local offline bundle unavailable, falling back to CDN...', offlineErr);
                const bundle = await import(CDN_BUNDLE_URL);
                FilesetResolver = bundle.FilesetResolver;
                HandLandmarker = bundle.HandLandmarker;
                vision = await FilesetResolver.forVisionTasks(CDN_WASM_URL);
                handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: CDN_MODEL_URL,
                        delegate: 'GPU'
                    },'''

code = code.replace(old_init_mediapipe, new_init_mediapipe)

# Update activeHandsList to support secondaryMouseHand
old_hands_list = '''    const activeHandsList = isCameraActive && trackedHands.length > 0
        ? trackedHands
        : (enableMouseControl ? [mouseHand] : []);'''

new_hands_list = '''    const activeHandsList = isCameraActive && trackedHands.length > 0
        ? trackedHands
        : (enableMouseControl ? (isDualMouseSimActive ? [mouseHand, secondaryMouseHand] : [mouseHand]) : []);'''

code = code.replace(old_hands_list, new_hands_list)

# Update mousemove listener to sync secondaryMouseHand
old_mouse_move = '''window.addEventListener('mousemove', (e) => {
    if (!enableMouseControl) return;
    const mouseX = e.clientX / (window.innerWidth || canvas.width);
    const mouseY = e.clientY / (window.innerHeight || canvas.height);

    mouseHand.palm = { x: mouseX, y: mouseY };
    mouseHand.wrist = { x: mouseX, y: Math.min(1.0, mouseY + 0.14) };
    mouseHand.fingertips = [
        { x: mouseX - 0.02, y: mouseY - 0.02 },
        { x: mouseX, y: mouseY },
        { x: mouseX + 0.02, y: mouseY - 0.02 },
        { x: mouseX + 0.03, y: mouseY },
        { x: mouseX + 0.04, y: mouseY + 0.02 }
    ];
});'''

new_mouse_move = '''window.addEventListener('mousemove', (e) => {
    if (!enableMouseControl) return;
    const winW = window.innerWidth || canvas.width;
    const winH = window.innerHeight || canvas.height;
    const mouseX = e.clientX / winW;
    const mouseY = e.clientY / winH;

    mouseHand.palm = { x: mouseX, y: mouseY };
    mouseHand.wrist = { x: mouseX, y: Math.min(1.0, mouseY + 0.14) };
    mouseHand.fingertips = [
        { x: mouseX - 0.02, y: mouseY - 0.02 },
        { x: mouseX, y: mouseY },
        { x: mouseX + 0.02, y: mouseY - 0.02 },
        { x: mouseX + 0.03, y: mouseY },
        { x: mouseX + 0.04, y: mouseY + 0.02 }
    ];

    if (isDualMouseSimActive) {
        const secX = 1.0 - mouseX;
        const secY = mouseY;
        secondaryMouseHand.palm = { x: secX, y: secY };
        secondaryMouseHand.wrist = { x: secX, y: Math.min(1.0, secY + 0.14) };
        secondaryMouseHand.fingertips = [
            { x: secX + 0.02, y: secY - 0.02 },
            { x: secX, y: secY },
            { x: secX - 0.02, y: secY - 0.02 },
            { x: secX - 0.03, y: secY },
            { x: secX - 0.04, y: secY + 0.02 }
        ];
    }
});'''

code = code.replace(old_mouse_move, new_mouse_move)

# Append dual mouse and modal controllers at bottom
code = code + '\n' + dual_mouse_code + '\n' + camera_modal_code

with open('D:/Project/AetherCast/app.js', 'w', encoding='utf-8', newline='\n') as f:
    f.write(code)

print('app.js patched successfully with all Sprint upgrades.')
