// --- AETHERCAST: Next-Gen Cinematic Magic Engine (Bugfixes & Ultra-Reliability) ---

// DOM Elements
const canvas = document.getElementById('output_canvas');
const ctx = canvas.getContext('2d');
const videoElement = document.getElementById('input_video');
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const fpsCounter = document.getElementById('fps-counter');

// Offscreen Canvas for Ultra-Fast MediaPipe WASM Processing (Zero-Lag 320x180, GPU-Accelerated)
const offCanvas = document.createElement('canvas');
offCanvas.width = 320;
offCanvas.height = 180;
const offCtx = offCanvas.getContext('2d', { alpha: false });

// Preload & Offscreen Cache for Authentic Doctor Strange Mandala Asset
const shieldImg = new Image();
shieldImg.src = 'Assets/shield_mandala.png';
let isShieldImgLoaded = false;
const cachedShieldCanvas = document.createElement('canvas');
cachedShieldCanvas.width = 600;
cachedShieldCanvas.height = 600;
const cachedShieldCtx = cachedShieldCanvas.getContext('2d');

shieldImg.onload = () => {
    cachedShieldCtx.drawImage(shieldImg, 0, 0, 600, 600);
    isShieldImgLoaded = true;
};
shieldImg.onerror = () => {
    console.warn("shield_mandala.png not loaded, using procedural vector mandala.");
};

// UI Controls
const colorBtns = document.querySelectorAll('.color-btn');
const sliderParticles = document.getElementById('slider-particles');
const sliderGlow = document.getElementById('slider-glow');
const sliderCamTint = document.getElementById('slider-cam-tint');
const colorValDisplay = document.getElementById('color-val-display');
const particleCountDisplay = document.getElementById('particle-count-display');
const glowDisplay = document.getElementById('glow-display');
const camTintDisplay = document.getElementById('cam-tint-display');
const btnWebcam = document.getElementById('btn-webcam');
const btnViewMode = document.getElementById('btn-view-mode');
const btnMirror = document.getElementById('btn-mirror');
const btnSkeleton = document.getElementById('btn-skeleton');
const btnMouse = document.getElementById('btn-mouse');
const btnClear = document.getElementById('btn-clear');
const gestureGuide = document.getElementById('gesture-guide');
const btnCloseGuide = document.getElementById('btn-close-guide');
const btnToggleGuide = document.getElementById('btn-toggle-guide');

// High-Fidelity Color Palette Definitions
const PALETTES = {
    gold: ['#ff3b00', '#ff8c00', '#ffc700', '#fff5a0', '#ffffff'],
    cyan: ['#00f2fe', '#4facfe', '#00d2ff', '#0284c7', '#ffffff'],
    purple: ['#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#ffffff'],
    emerald: ['#10b981', '#34d399', '#059669', '#047857', '#ffffff'],
    rainbow: ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#ec4899']
};

// RANDOM PALETTE SELECTION ON EACH LAUNCH / REFRESH
const paletteKeys = Object.keys(PALETTES);
let activeColorPalette = paletteKeys[Math.floor(Math.random() * paletteKeys.length)];

// Synchronize UI with Random Palette
function syncPaletteUI() {
    colorBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === activeColorPalette);
    });
    if (colorValDisplay) {
        colorValDisplay.textContent = activeColorPalette.toUpperCase();
    }
}
syncPaletteUI();

// Application State
let targetParticleCount = 500;
let glowLevel = 2;
let camTintLevel = 7;
let showSkeleton = true;
let enableMouseControl = false;
let camViewMode = 'fullscreen';
let isCameraActive = false;
let isMirrored = true;
let handLandmarker = null;
let handsDetector = null;
let mediaPipeInitPromise = null;
let isMediaPipeReady = false;
let webcamStream = null;

// Hardware Video Layer Style Synchronizer (Eliminates Main-Thread Fullscreen Video Blitting)
function syncVideoLayerStyle() {
    if (!videoElement) return;
    if (!isCameraActive) {
        videoElement.classList.remove('active', 'pip-hidden');
        return;
    }
    videoElement.classList.add('active');
    videoElement.classList.toggle('pip-hidden', camViewMode === 'pip');
    videoElement.style.transform = isMirrored ? 'scaleX(-1)' : 'scaleX(1)';
    videoElement.style.opacity = String(Math.max(0, Math.min(1, 1 - (camTintLevel / 10))));
}

// Performance & Delta Time Tracking
let frameCount = 0;
let lastFpsUpdate = performance.now();
let lastFrameTime = performance.now();
let dtScale = 1.0;
let screenFlashAlpha = 0;
let screenFlashColor = PALETTES[activeColorPalette][0];

// Persistent State Tracking for Hands & Dual Fusions
let trackedHands = []; 
let targetHandsList = [];
let persistentHandStates = new Map();
let dualFistState = { wasDualFist: false, charge: 0, birthProgress: 0, cooldownTimer: 0, lastMidX: 0, lastMidY: 0 };
let activeCosmicHandId = null; // Single Global Cosmic Orb Authority

// Inter-Hand Cosmic Orb Projectile (Throw & Transfer Engine)
let cosmicProjectile = {
    active: false,
    fromHandId: null,
    toHandId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    progress: 0,
    speed: 0.045,
    arcHeight: -75
};

// Safe Mouse Interaction State
let mouseHand = {
    id: 'mouse',
    isMouse: true,
    trackedFrames: 100,
    lostFrames: 0,
    wrist: { x: 0.5, y: 0.7 },
    palm: { x: 0.5, y: 0.5 },
    fingertips: [
        { x: 0.48, y: 0.48 },
        { x: 0.5, y: 0.45 },
        { x: 0.52, y: 0.48 },
        { x: 0.53, y: 0.5 },
        { x: 0.54, y: 0.52 }
    ],
    isFist: false,
    isOpenPalm: true,
    isShieldTouch: false,
    isPinchTap: false,
    rawLandmarks: null,
    trail: []
};

const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],         // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],         // Index
    [5, 9], [9, 10], [10, 11], [11, 12],    // Middle
    [9, 13], [13, 14], [14, 15], [15, 16],  // Ring
    [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [0, 17], [5, 9], [9, 13], [13, 17]      // Palm base & knuckles
];

function dist(p1, p2) {
    if (!p1 || !p2) return 999;
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function lerp(start, end, amt) {
    return start + (end - start) * amt;
}

// -------------------------------------------------------------
// Adaptive Render Resolution & Pre-Baked Glow Sprites (Zero Per-Frame Gradient Cost)
// -------------------------------------------------------------
function resizeCanvas() {
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;
    const renderScale = Math.min(1.0, 1366 / vw);
    canvas.width = Math.round(vw * renderScale);
    canvas.height = Math.round(vh * renderScale);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const glowSpriteAura = document.createElement('canvas');
glowSpriteAura.width = 256;
glowSpriteAura.height = 256;
const glowSpriteAuraCtx = glowSpriteAura.getContext('2d');

const glowSpriteCore = document.createElement('canvas');
glowSpriteCore.width = 128;
glowSpriteCore.height = 128;
const glowSpriteCoreCtx = glowSpriteCore.getContext('2d');

function rebuildGlowSprites() {
    const colors = PALETTES[activeColorPalette];
    const mainColor = colors[0];
    const secColor = colors[1] || colors[0];
    const accColor = colors[2] || '#ffffff';

    glowSpriteAuraCtx.clearRect(0, 0, 256, 256);
    const auraG = glowSpriteAuraCtx.createRadialGradient(128, 128, 14, 128, 128, 128);
    auraG.addColorStop(0, '#ffffff');
    auraG.addColorStop(0.28, mainColor);
    auraG.addColorStop(0.65, secColor);
    auraG.addColorStop(1, 'rgba(0, 0, 0, 0)');
    glowSpriteAuraCtx.fillStyle = auraG;
    glowSpriteAuraCtx.beginPath();
    glowSpriteAuraCtx.arc(128, 128, 128, 0, Math.PI * 2);
    glowSpriteAuraCtx.fill();

    glowSpriteCoreCtx.clearRect(0, 0, 128, 128);
    const coreG = glowSpriteCoreCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    coreG.addColorStop(0, '#ffffff');
    coreG.addColorStop(0.45, accColor);
    coreG.addColorStop(0.85, mainColor);
    coreG.addColorStop(1, 'rgba(0, 0, 0, 0)');
    glowSpriteCoreCtx.fillStyle = coreG;
    glowSpriteCoreCtx.beginPath();
    glowSpriteCoreCtx.arc(64, 64, 64, 0, Math.PI * 2);
    glowSpriteCoreCtx.fill();
}
rebuildGlowSprites();

// -------------------------------------------------------------
// Ultra-High Speed Zero-GC Pooled Particle & Volumetric Plasma Engine
// -------------------------------------------------------------
class Particle {
    constructor() {
        this.reset();
    }

    reset(originX, originY, speedMultiplier = 1, fixedAngle = null) {
        this.x = originX !== undefined ? originX : Math.random() * canvas.width;
        this.y = originY !== undefined ? originY : Math.random() * canvas.height;
        
        const angle = fixedAngle !== null ? fixedAngle : Math.random() * Math.PI * 2;
        const speed = (Math.random() * 6.0 + 2.5) * speedMultiplier;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.size = Math.random() * 5.0 + 1.8;
        this.life = Math.random() * 0.75 + 0.45;
        this.maxLife = this.life;
        this.decay = Math.random() * 0.016 + 0.006;

        const colors = PALETTES[activeColorPalette];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        this.life -= this.decay * dtScale;

        this.vx *= Math.pow(0.975, dtScale);
        this.vy *= Math.pow(0.975, dtScale);

        if (this.life <= 0 || this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            return false;
        }
        return true;
    }
}

let particles = [];
const particlePool = [];
const colorBatches = {};

function spawnParticle(originX, originY, speedMultiplier = 1, fixedAngle = null) {
    // Allow burst headroom up to +350 above ambient targetParticleCount
    if (particles.length >= targetParticleCount + 350) return null;
    const p = particlePool.length > 0 ? particlePool.pop() : new Particle();
    p.reset(originX, originY, speedMultiplier, fixedAngle);
    particles.push(p);
    return p;
}

function maintainParticles() {
    while (particles.length < targetParticleCount) {
        spawnParticle();
    }
}

function drawParticlesBatched(ctx) {
    for (const color in colorBatches) {
        colorBatches[color].length = 0;
    }
    
    const glowScale = glowLevel === 1 ? 0.65 : (glowLevel === 3 ? 1.45 : 1.0);

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p.update()) {
            if (particles.length <= targetParticleCount) {
                // Recycle ambient particle in-place with zero array mutation
                p.reset();
            } else {
                // O(1) Swap-and-Pop for burst / excess particles
                particlePool.push(p);
                particles[i] = particles[particles.length - 1];
                particles.pop();
                continue;
            }
        }
        let batch = colorBatches[p.color];
        if (!batch) {
            batch = [];
            colorBatches[p.color] = batch;
        }
        batch.push(p);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    for (const color in colorBatches) {
        const batch = colorBatches[color];
        if (batch.length === 0) continue;
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let j = 0; j < batch.length; j++) {
            const p = batch[j];
            const alpha = Math.max(0, p.life / p.maxLife);
            const r = p.size * alpha * glowScale;
            if (r > 2.2) {
                ctx.moveTo(p.x + r, p.y);
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            } else if (r > 0.15) {
                ctx.rect(p.x - r, p.y - r, r * 2, r * 2);
            }
        }
        ctx.fill();
    }
    
    ctx.restore();
}

class Shockwave {
    constructor(x, y, maxRadius = 520, color = '#ff8c00', initialWidth = 24) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.maxRadius = maxRadius;
        this.color = color;
        this.alpha = 1;
        this.lineWidth = initialWidth;
    }

    update() {
        this.radius += 24 * dtScale;
        this.alpha = 1 - (this.radius / this.maxRadius);
        this.lineWidth *= Math.pow(0.92, dtScale);
        return this.radius < this.maxRadius && this.alpha > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(2, this.lineWidth);
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.stroke();
        ctx.restore();
    }
}

let shockwaves = [];

function triggerSupernovaExplosion(x, y, intensity = 1.0) {
    const colors = PALETTES[activeColorPalette];
    
    screenFlashAlpha = Math.min(0.75, 0.55 * intensity);
    screenFlashColor = colors[0];

    shockwaves.push(new Shockwave(x, y, 540 * intensity, colors[0], 26));
    shockwaves.push(new Shockwave(x, y, 400 * intensity, colors[1] || colors[0], 18));
    shockwaves.push(new Shockwave(x, y, 260 * intensity, '#ffffff', 12));

    const count = Math.floor(100 * intensity);
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        spawnParticle(x, y, (Math.random() * 9.5 + 7) * intensity, angle);
    }

    const maxRadiusSq = (440 * intensity) * (440 * intensity);
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const dx = p.x - x;
        const dy = p.y - y;
        const distSq = dx * dx + dy * dy;
        if (distSq < maxRadiusSq && distSq > 1) {
            const d = Math.sqrt(distSq);
            const force = (1 - d / (440 * intensity)) * 34 * intensity;
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
        }
    }
}

function getPersistentState(hand) {
    if (!hand) return null;
    const key = hand.id !== undefined ? `hand_${hand.id}` : (hand.isMouse ? 'hand_mouse' : 'hand_0');
    let state = persistentHandStates.get(key);
    if (!state) {
        state = {
            fistCharge: 0,
            birthProgress: 0,
            noFistDebounce: 0,
            cooldownTimer: 0,
            cosmicProgress: 0,
            cosmicActive: false,
            wasPinchTap: false,
            pinchReleaseFrames: 20,
            shieldProgress: 0
        };
        persistentHandStates.set(key, state);
    }
    return state;
}

// -------------------------------------------------------------
// REALISTIC VOLUMETRIC COSMIC ENERGY ORB RENDERER
// -------------------------------------------------------------
let cosmicOrbRotation = 0;
function drawCosmicEnergyOrb(ctx, x, y, progress = 1.0) {
    if (progress <= 0.01) return;

    ctx.save();
    ctx.translate(x, y);
    cosmicOrbRotation += 0.04 * dtScale;

    const colors = PALETTES[activeColorPalette];
    const mainColor = colors[0];
    const secColor = colors[1] || colors[0];
    const accColor = colors[2] || '#ffffff';

    const glowBoost = glowLevel === 1 ? 0.85 : (glowLevel === 3 ? 1.2 : 1.0);
    const radius = 32 * progress * glowBoost;

    ctx.globalCompositeOperation = 'lighter';

    // 1. Multi-Layer Outer Solar Corona Aura (Pre-baked GPU Sprite Blit)
    ctx.globalAlpha = 0.65 * progress;
    const auraR = radius * 2.4;
    ctx.drawImage(glowSpriteAura, -auraR, -auraR, auraR * 2, auraR * 2);

    // 2. Dual Counter-Rotating Gyroscope Rings
    ctx.globalAlpha = 0.9 * progress;
    ctx.save();
    ctx.rotate(cosmicOrbRotation * 1.5);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 3 * progress;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.6, radius * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 * progress;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.6, radius * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-cosmicOrbRotation * 1.8);
    ctx.strokeStyle = secColor;
    ctx.lineWidth = 2.5 * progress;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.45, radius * 1.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. Volumetric High-Energy Plasma Core (Pre-baked GPU Sprite Blit)
    ctx.globalAlpha = 0.95 * progress;
    ctx.drawImage(glowSpriteCore, -radius, -radius, radius * 2, radius * 2);

    // 4. Radiating Anti-Gravity Micro Sparks
    if (Math.random() < 0.7) {
        const a = Math.random() * Math.PI * 2;
        const r = radius * (1.1 + Math.random() * 0.6);
        spawnParticle(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.4);
    }

    ctx.restore();
}

// -------------------------------------------------------------
// INTER-HAND COSMIC ORB THROW & TRANSFER ENGINE
// -------------------------------------------------------------
function launchCosmicProjectile(fromId, toId, startX, startY, targetX, targetY) {
    if (cosmicProjectile.active) return;

    // Dissolve orb from sender immediately
    const senderState = persistentHandStates.get(`hand_${fromId}`);
    if (senderState) {
        senderState.cosmicActive = false;
        senderState.cosmicProgress = 0;
    }
    activeCosmicHandId = null;

    cosmicProjectile.active = true;
    cosmicProjectile.fromHandId = fromId;
    cosmicProjectile.toHandId = toId;
    cosmicProjectile.startX = startX;
    cosmicProjectile.startY = startY;
    cosmicProjectile.currentX = startX;
    cosmicProjectile.currentY = startY;
    cosmicProjectile.targetX = targetX;
    cosmicProjectile.targetY = targetY;
    cosmicProjectile.progress = 0;
    cosmicProjectile.speed = 0.045; // ~22 frames flight time (fast & energetic)
    // Parabolic arc bends upwards
    cosmicProjectile.arcHeight = -Math.max(65, Math.abs(targetX - startX) * 0.25);

    // Launch burst
    triggerSupernovaExplosion(startX, startY, 0.5);
}

function updateAndDrawCosmicProjectile(ctx, activeHandsList) {
    if (!cosmicProjectile.active) return;

    cosmicProjectile.progress += cosmicProjectile.speed * dtScale;

    // Real-time homing: find receiver hand to update target coordinates dynamically
    const receiverHand = activeHandsList.find(h => h.id === cosmicProjectile.toHandId);
    if (receiverHand) {
        const tip = receiverHand.fingertips[1] || receiverHand.palm;
        cosmicProjectile.targetX = tip.x * canvas.width;
        cosmicProjectile.targetY = tip.y * canvas.height - 45;
    }

    const t = Math.min(1.0, cosmicProjectile.progress);
    const arc = Math.sin(t * Math.PI) * cosmicProjectile.arcHeight;
    const curX = lerp(cosmicProjectile.startX, cosmicProjectile.targetX, t);
    const curY = lerp(cosmicProjectile.startY, cosmicProjectile.targetY, t) + arc;
    cosmicProjectile.currentX = curX;
    cosmicProjectile.currentY = curY;

    // Render High-Speed Plasma Comet Flight
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const colors = PALETTES[activeColorPalette];
    const mainColor = colors[0];
    const secColor = colors[1] || colors[0];
    const accColor = colors[2] || '#ffffff';

    // 1. Electric Lightning Tendrils connecting path
    ctx.strokeStyle = secColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(cosmicProjectile.startX, cosmicProjectile.startY);
    const midArcX = (cosmicProjectile.startX + curX) / 2 + (Math.random() - 0.5) * 20;
    const midArcY = (cosmicProjectile.startY + curY) / 2 + arc * 0.5 + (Math.random() - 0.5) * 20;
    ctx.quadraticCurveTo(midArcX, midArcY, curX, curY);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 2. Cosmic Plasma Projectile Core
    drawCosmicEnergyOrb(ctx, curX, curY, 1.15);

    // 3. Stardust Particle Tail (using pooled spawnParticle with proper life & size)
    if (Math.random() < 0.85) {
        const p = spawnParticle(
            curX + (Math.random() - 0.5) * 16,
            curY + (Math.random() - 0.5) * 16,
            0.65
        );
        if (p) {
            p.vx -= (curX - cosmicProjectile.startX) * 0.015;
            p.size = 3.0 + Math.random() * 3.0;
            p.color = Math.random() > 0.5 ? mainColor : accColor;
        }
    }
    ctx.restore();

    // Arrival / Lock-on at Target Index Fingertip
    if (cosmicProjectile.progress >= 1.0) {
        cosmicProjectile.active = false;
        if (receiverHand) {
            // Lock onto receiving hand!
            activeCosmicHandId = receiverHand.id;
            const receiverState = getPersistentState(receiverHand);
            if (receiverState) {
                receiverState.cosmicActive = true;
                receiverState.cosmicProgress = 1.0;
            }
            // Arrival impact shockwave & sparkle burst (Fixed argument order: x, y, maxRadius, color, initialWidth)
            shockwaves.push(new Shockwave(cosmicProjectile.targetX, cosmicProjectile.targetY, 150, secColor, 16));
            triggerSupernovaExplosion(cosmicProjectile.targetX, cosmicProjectile.targetY, 0.65);
        } else {
            // Target hand was lost in flight, detonate gracefully
            triggerSupernovaExplosion(curX, curY, 0.7);
        }
    }
}

// -------------------------------------------------------------
// Batched Hand Energy Skeleton Renderer (3 Draw Calls vs 45)
// -------------------------------------------------------------
function drawHandSkeleton(ctx, rawLandmarks, colors) {
    if (!showSkeleton || !rawLandmarks || rawLandmarks.length === 0) return;

    ctx.save();
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = 2.5;

    // 1. Batch all 24 bone connections into a single path & stroke
    ctx.beginPath();
    for (let k = 0; k < HAND_CONNECTIONS.length; k++) {
        const [i, j] = HAND_CONNECTIONS[k];
        const p1 = rawLandmarks[i];
        const p2 = rawLandmarks[j];
        if (p1 && p2) {
            const x1 = (isMirrored ? 1 - p1.x : p1.x) * canvas.width;
            const y1 = p1.y * canvas.height;
            const x2 = (isMirrored ? 1 - p2.x : p2.x) * canvas.width;
            const y2 = p2.y * canvas.height;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
    }
    ctx.stroke();

    // 2. Batch inner joints
    ctx.fillStyle = colors[1] || colors[0];
    ctx.beginPath();
    for (let idx = 0; idx < rawLandmarks.length; idx++) {
        if (idx % 4 === 0) continue;
        const lm = rawLandmarks[idx];
        const x = (isMirrored ? 1 - lm.x : lm.x) * canvas.width;
        const y = lm.y * canvas.height;
        ctx.moveTo(x + 3.5, y);
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    }
    ctx.fill();

    // 3. Batch wrist & fingertip nodes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let idx = 0; idx < rawLandmarks.length; idx += 4) {
        const lm = rawLandmarks[idx];
        const x = (isMirrored ? 1 - lm.x : lm.x) * canvas.width;
        const y = lm.y * canvas.height;
        ctx.moveTo(x + 5, y);
        ctx.arc(x, y, 5, 0, Math.PI * 2);
    }
    ctx.fill();

    ctx.restore();
}

// -------------------------------------------------------------
// AUTHENTIC ANCIENT RUNE MANDALA SHIELD (HYBRID ASSET & VECTOR)
// -------------------------------------------------------------
let runeRotation = 0;
function drawDoctorStrangeShield(ctx, x, y, baseRadius = 150, progress = 1.0) {
    if (progress <= 0.01) return;

    ctx.save();
    ctx.translate(x, y);
    runeRotation += 0.018 * dtScale;

    const colors = PALETTES[activeColorPalette];
    const mainColor = colors[0];
    const secColor = colors[1] || colors[0];
    const accColor = colors[2] || '#ffffff';

    const radius = baseRadius * progress;

    ctx.globalCompositeOperation = 'lighter';

    // 0. Soft Volumetric Back Glow (Pre-baked GPU Sprite Blit)
    ctx.globalAlpha = 0.45 * progress;
    const glowR = radius * 1.35;
    ctx.drawImage(glowSpriteAura, -glowR, -glowR, glowR * 2, glowR * 2);

    // 1. Draw High-Resolution Shield Mandala Asset if available
    if (isShieldImgLoaded) {
        ctx.save();
        ctx.rotate(runeRotation * 0.7);
        ctx.globalAlpha = 0.95 * progress;
        ctx.drawImage(cachedShieldCanvas, -radius, -radius, radius * 2, radius * 2);
        ctx.restore();
    } else {
        // Procedural Vector Fallback
        ctx.globalAlpha = 0.95 * progress;

        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 4 * progress;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = secColor;
        ctx.lineWidth = 2.5 * progress;
        ctx.beginPath();
        ctx.arc(0, 0, radius - 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 3.5 * progress;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.84, 0, Math.PI * 2);
        ctx.stroke();

        // Star Layers
        ctx.save();
        ctx.rotate(runeRotation * 0.7);
        ctx.lineWidth = 2.2 * progress;
        for (let s = 0; s < 6; s++) {
            ctx.save();
            ctx.rotate((s * Math.PI) / 12);
            ctx.strokeStyle = s % 2 === 0 ? secColor : mainColor;
            ctx.beginPath();
            ctx.rect(-radius * 0.54, -radius * 0.54, radius * 1.08, radius * 1.08);
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    // 2. Dynamic Rotating Outer Rune Dash Tracks
    ctx.save();
    ctx.rotate(runeRotation * 1.3);
    ctx.strokeStyle = accColor;
    ctx.lineWidth = 3.5 * progress;
    ctx.setLineDash([8, 12, 18, 12]);
    ctx.beginPath();
    ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(-runeRotation * 2.2);
    ctx.strokeStyle = secColor;
    ctx.lineWidth = 2.5 * progress;
    ctx.setLineDash([5, 10, 14, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. Dense Fiery Embers & Spark Bursts
    if (Math.random() < 0.7) {
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkRadius = radius * (0.8 + Math.random() * 0.35);
        const pX = x + Math.cos(sparkAngle) * sparkRadius;
        const pY = y + Math.sin(sparkAngle) * sparkRadius;
        spawnParticle(pX, pY, 2.2);
    }

    ctx.restore();
}

// -------------------------------------------------------------
// AUTHENTIC GIGA DUAL-HAND MULTIVERSE SHIELD ARRAY
// -------------------------------------------------------------
function drawGigaShield(ctx, x1, y1, x2, y2, midX, midY) {
    const radius = 230;
    const colors = PALETTES[activeColorPalette];
    const mainColor = colors[0];
    const secColor = colors[1] || colors[0];
    const accColor = colors[2] || '#ffffff';

    ctx.save();
    
    // Lightning Energy Tethers between hands
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = secColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(midX, midY);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    ctx.translate(midX, midY);
    runeRotation += 0.025 * dtScale;

    ctx.globalCompositeOperation = 'lighter';

    // Volumetric Central Shockwave Glow (Pre-baked GPU Sprite Blit)
    ctx.globalAlpha = 0.5;
    const gigaGlowR = radius * 1.4;
    ctx.drawImage(glowSpriteAura, -gigaGlowR, -gigaGlowR, gigaGlowR * 2, gigaGlowR * 2);

    // High-Resolution Shield Texture Array
    if (isShieldImgLoaded) {
        ctx.save();
        ctx.rotate(runeRotation * 0.8);
        ctx.globalAlpha = 0.95;
        ctx.drawImage(cachedShieldCanvas, -radius, -radius, radius * 2, radius * 2);

        ctx.rotate(-runeRotation * 1.6);
        ctx.globalAlpha = 0.55;
        ctx.drawImage(cachedShieldCanvas, -radius * 0.75, -radius * 0.75, radius * 1.5, radius * 1.5);
        ctx.restore();
    } else {
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = secColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, radius - 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.save();
        ctx.rotate(-runeRotation);
        for (let l = 0; l < 8; l++) {
            ctx.save();
            ctx.rotate((l * Math.PI) / 16);
            ctx.strokeStyle = l % 2 === 0 ? secColor : mainColor;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(-radius * 0.54, -radius * 0.54, radius * 1.08, radius * 1.08);
            ctx.restore();
        }
        ctx.restore();
    }

    // Outer Arcane Rune Track
    ctx.save();
    ctx.rotate(runeRotation * 1.4);
    ctx.strokeStyle = accColor;
    ctx.lineWidth = 5;
    ctx.setLineDash([12, 16, 24, 16]);
    ctx.beginPath();
    ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Intense Giga Embers Explosion
    for (let b = 0; b < 4; b++) {
        const a = Math.random() * Math.PI * 2;
        const r = radius * (0.7 + Math.random() * 0.5);
        spawnParticle(midX + Math.cos(a) * r, midY + Math.sin(a) * r, 2.5);
    }

    ctx.restore();
}

// -------------------------------------------------------------
// CINEMATIC INTERSTELLAR GARGANTUA BLACKHOLE (HIGH REALISM)
// -------------------------------------------------------------
let blackholeRotation = 0;
function drawBlackhole(ctx, x, y, chargeRatio = 0, birthProgress = 1.0) {
    ctx.save();
    ctx.translate(x, y);
    blackholeRotation += 0.035 * dtScale;

    const colors = PALETTES[activeColorPalette];
    const mainColor = colors[0];
    const secColor = colors[1] || colors[0];
    const accColor = colors[2] || '#ffffff';

    const baseRadius = 50 * Math.min(1.0, birthProgress * 1.2);
    const currentRadius = baseRadius + chargeRatio * 45;

    // 1. Relativistic Gravitational Distortion Corona (Volumetric Outer Lensing)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    ctx.globalAlpha = 0.55 * birthProgress;
    const bhGlowR = currentRadius * 2.5;
    ctx.drawImage(glowSpriteAura, -bhGlowR, -bhGlowR, bhGlowR * 2, bhGlowR * 2);

    // 2. Gravitational Lensing Back Accretion Arc (Top & Bottom Bending Arms)
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = (8 + chargeRatio * 5) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, currentRadius * 1.75, currentRadius * 0.52, blackholeRotation * 0.15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = secColor;
    ctx.lineWidth = (4 + chargeRatio * 3) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, currentRadius * 0.52, currentRadius * 1.7, -blackholeRotation * 0.12, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
        const a = blackholeRotation + (i * Math.PI / 2);
        ctx.strokeStyle = accColor;
        ctx.lineWidth = 2.5 * birthProgress;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius * 1.35, a, a + Math.PI / 4);
        ctx.stroke();
    }
    ctx.restore();

    // 3. Pitch-Black Event Horizon Void (SOLID PITCH BLACK SHADOW VOID)
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();

    // 4. Photon Sphere Ultra-Bright Ring & Relativistic Doppler Belt
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.5 * birthProgress;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = (7 + chargeRatio * 4) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, currentRadius * 1.85, currentRadius * 0.38, 0.12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, currentRadius * 1.6, currentRadius * 0.26, 0.12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
}

// -------------------------------------------------------------
// GIGA DUAL-HAND INTERSTELLAR BLACKHOLE FUSION RENDERER (PROCEDURAL ULTRA-FIERCE SINGULARITY)
// -------------------------------------------------------------
function drawGigaBlackhole(ctx, x1, y1, x2, y2, midX, midY, chargeRatio = 0, birthProgress = 1.0) {
    const colors = PALETTES[activeColorPalette];
    const mainColor = colors[0];
    const secColor = colors[1] || colors[0];
    const accColor = colors[2] || '#ffffff';
    
    const baseRadius = 112 * Math.min(1.0, birthProgress * 1.2);
    const pulse = Math.sin(performance.now() * 0.008) * (3 + chargeRatio * 6);
    const radius = baseRadius + chargeRatio * 75 + pulse;

    ctx.save();

    // 1. High-Voltage Crackling Lightning Tethers between both fists and the singularity
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const drawFierceLightning = (fromX, fromY, toX, toY, width, color, jitterAmt) => {
        const segments = 7;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        for (let i = 1; i < segments; i++) {
            const frac = i / segments;
            const nx = fromX + (toX - fromX) * frac + (Math.random() - 0.5) * jitterAmt;
            const ny = fromY + (toY - fromY) * frac + (Math.random() - 0.5) * jitterAmt;
            ctx.lineTo(nx, ny);

            // Occasional lightning branching fork
            if (Math.random() < 0.25 && chargeRatio > 0.1) {
                ctx.moveTo(nx, ny);
                ctx.lineTo(nx + (Math.random() - 0.5) * 35, ny + (Math.random() - 0.5) * 35);
                ctx.moveTo(nx, ny);
            }
        }
        ctx.lineTo(toX, toY);
        ctx.stroke();
    };

    const jitter = (25 + chargeRatio * 35) * birthProgress;
    // Outer lightning aura
    drawFierceLightning(x1, y1, midX, midY, (6 + chargeRatio * 5) * birthProgress, secColor, jitter);
    drawFierceLightning(x2, y2, midX, midY, (6 + chargeRatio * 5) * birthProgress, secColor, jitter);
    // Inner intense core
    drawFierceLightning(x1, y1, midX, midY, 2.5 * birthProgress, '#ffffff', jitter * 0.7);
    drawFierceLightning(x2, y2, midX, midY, 2.5 * birthProgress, '#ffffff', jitter * 0.7);

    // Direct chaotic arc jumping between both fists
    if (Math.random() < 0.65) {
        drawFierceLightning(x1, y1, x2, y2, (3.5 + chargeRatio * 3) * birthProgress, mainColor, jitter * 1.2);
    }
    ctx.restore();

    // 2. Gravitational Singularity Tremor & Screen Shake
    let shakeX = 0, shakeY = 0;
    if (chargeRatio > 0.05) {
        const shakeMag = chargeRatio * 8 * birthProgress;
        shakeX = (Math.random() - 0.5) * shakeMag;
        shakeY = (Math.random() - 0.5) * shakeMag;
    }

    ctx.translate(midX + shakeX, midY + shakeY);
    blackholeRotation += (0.045 + chargeRatio * 0.065) * dtScale;

    // 3. Volumetric Gravitational Lensing Halo (Pre-baked GPU Sprite Blit)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lensR = radius * 3.2;
    ctx.drawImage(glowSpriteAura, -lensR, -lensR, lensR * 2, lensR * 2);

    // Gravitational Shockwave Rings expanding outwards
    const ringTime = (performance.now() * 0.003) % 1.0;
    const pulseRingR = radius * (1.1 + ringTime * 1.6);
    ctx.strokeStyle = secColor;
    ctx.lineWidth = (3 + chargeRatio * 3) * (1 - ringTime) * birthProgress;
    ctx.globalAlpha = (0.7 - ringTime * 0.6) * birthProgress;
    ctx.beginPath();
    ctx.arc(0, 0, pulseRingR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 4. Background Relativistic Lensing Arcs (Einstein Ring Distortion bending above/below)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Upper Gravitational Arc (Light bent over the top of the event horizon)
    ctx.save();
    ctx.rotate(0.12);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = (12 + chargeRatio * 8) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.35, radius * 1.75, radius * 0.85, 0, Math.PI * 0.95, Math.PI * 2.05);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = (4 + chargeRatio * 3) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.35, radius * 1.72, radius * 0.82, 0, Math.PI * 0.98, Math.PI * 2.02);
    ctx.stroke();
    ctx.restore();

    // Lower Gravitational Arc (Light bent under the bottom)
    ctx.save();
    ctx.rotate(0.12);
    ctx.strokeStyle = secColor;
    ctx.lineWidth = (10 + chargeRatio * 6) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.35, radius * 1.65, radius * 0.75, 0, 0, Math.PI);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = (3 + chargeRatio * 2) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.35, radius * 1.62, radius * 0.72, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    // 5. Dynamic Counter-Rotating Differential Accretion Vortex Rings
    // Ring 1: Fast Outer Plasma Stream
    ctx.save();
    ctx.rotate(blackholeRotation * 1.6);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = (8 + chargeRatio * 5) * birthProgress;
    ctx.setLineDash([28, 16, 42, 20]);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 2.1, radius * 0.58, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Ring 2: Counter-Rotating Secondary Plasma Filament
    ctx.save();
    ctx.rotate(-blackholeRotation * 2.2);
    ctx.strokeStyle = secColor;
    ctx.lineWidth = (6 + chargeRatio * 4) * birthProgress;
    ctx.setLineDash([18, 14, 32, 14]);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.85, radius * 0.52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Ring 3: Hyper-Speed Inner Accretion Filament
    ctx.save();
    ctx.rotate(blackholeRotation * 3.0);
    ctx.strokeStyle = accColor;
    ctx.lineWidth = 3.5 * birthProgress;
    ctx.setLineDash([12, 18, 24, 12]);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.45, radius * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 6. Solar Prominence Plasma Jets / Coronal Eruptions
    for (let j = 0; j < 6; j++) {
        const pAngle = blackholeRotation * 1.5 + (j * Math.PI / 3);
        const pLen = radius * (1.3 + Math.sin(performance.now() * 0.006 + j) * 0.45);
        ctx.strokeStyle = j % 2 === 0 ? mainColor : secColor;
        ctx.lineWidth = (4 + chargeRatio * 3) * birthProgress;
        ctx.beginPath();
        ctx.moveTo(Math.cos(pAngle) * radius * 0.9, Math.sin(pAngle) * radius * 0.9);
        const cpX = Math.cos(pAngle + 0.35) * pLen;
        const cpY = Math.sin(pAngle + 0.35) * pLen;
        const epX = Math.cos(pAngle + 0.7) * radius * 1.1;
        const epY = Math.sin(pAngle + 0.7) * radius * 1.1;
        ctx.quadraticCurveTo(cpX, cpY, epX, epY);
        ctx.stroke();
    }
    ctx.restore();

    // 7. PITCH-BLACK EVENT HORIZON VOID (Absorbs All Light with Pure Zero-Albedo Shadow)
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.94, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();

    // 8. Foreground Accretion Disk (Cutting across front of Event Horizon)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.rotate(0.12);

    // Front Main Plasma Belt
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = (16 + chargeRatio * 10) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.95, radius * 0.44, 0, 0, Math.PI);
    ctx.stroke();

    ctx.strokeStyle = secColor;
    ctx.lineWidth = (10 + chargeRatio * 6) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.75, radius * 0.36, 0, 0, Math.PI);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = (4 + chargeRatio * 3) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.6, radius * 0.28, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    // 9. Relativistic Doppler Beaming Blinding Glare (Pre-baked GPU Sprite Blit)
    ctx.save();
    ctx.rotate(0.12);
    const flareX = -radius * 1.15;
    ctx.drawImage(glowSpriteCore, flareX - radius, -radius * 0.48, radius * 2.0, radius * 0.96);
    ctx.restore();

    // 10. Blinding Razor-Sharp Photon Sphere Rim & Relativistic Arc Spikes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = (4 + chargeRatio * 4) * birthProgress;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.96, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = secColor;
    ctx.lineWidth = (7 + chargeRatio * 6) * birthProgress;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.04, 0, Math.PI * 2);
    ctx.stroke();

    // Continuous Eruption of High-Energy Singularity Sparks
    for (let s = 0; s < 3; s++) {
        const sAngle = Math.random() * Math.PI * 2;
        const sDist = radius * (0.95 + Math.random() * 0.35);
        spawnParticle(midX + Math.cos(sAngle) * sDist, midY + Math.sin(sAngle) * sDist, 2.4);
    }

    ctx.restore();
    ctx.restore();
}

// -------------------------------------------------------------
// Render PiP Mini Monitor Box
// -------------------------------------------------------------
function drawMiniMonitor(ctx) {
    if (!isCameraActive || videoElement.readyState < 2) return;

    const pipW = 220;
    const pipH = 135;
    const pipX = canvas.width - pipW - 16;
    const pipY = canvas.height - pipH - 16;
    const radius = 10;

    ctx.save();
    
    ctx.strokeStyle = PALETTES[activeColorPalette][0];
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.roundRect(pipX, pipY, pipW, pipH, radius);
    ctx.stroke();
    ctx.clip();

    if (isMirrored) {
        ctx.translate(pipX + pipW, pipY);
        ctx.scale(-1, 1);
        ctx.drawImage(videoElement, 0, 0, pipW, pipH);
    } else {
        ctx.drawImage(videoElement, pipX, pipY, pipW, pipH);
    }

    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(7, 9, 19, 0.7)';
    ctx.fillRect(pipX + 8, pipY + 8, 120, 22);
    ctx.fillStyle = '#34d399';
    ctx.font = '600 9.5px Outfit, sans-serif';
    ctx.fillText(`● WEBCAM MONITOR`, pipX + 14, pipY + 22);
    ctx.restore();
}

// -------------------------------------------------------------
// One-Euro Filter (1€ Filter — Casiez et al., gesturewatcher architecture)
// Zero-jitter when hand is still, zero-latency 1:1 tracking when moving fast
// -------------------------------------------------------------
class LowPassFilter {
    constructor() {
        this.y = 0;
        this.initialized = false;
    }
    filter(value, alpha) {
        if (!this.initialized) {
            this.y = value;
            this.initialized = true;
            return value;
        }
        this.y = alpha * value + (1 - alpha) * this.y;
        return this.y;
    }
}

class OneEuroFilter {
    constructor(minCutoff = 1.5, beta = 24.0, dCutoff = 1.0) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
        this.xFilter = new LowPassFilter();
        this.dxFilter = new LowPassFilter();
        this.lastTime = null;
        this.lastRaw = null;
    }
    alpha(cutoff, dt) {
        const tau = 1 / (2 * Math.PI * cutoff);
        return 1 / (1 + tau / dt);
    }
    filter(value, timestampMs) {
        if (this.lastTime === null || this.lastRaw === null) {
            this.lastTime = timestampMs;
            this.lastRaw = value;
            this.xFilter.filter(value, 1);
            this.dxFilter.filter(0, 1);
            return value;
        }
        const dt = Math.max((timestampMs - this.lastTime) / 1000, 1e-3);
        if (dt <= 1e-3 && value === this.lastRaw) {
            return this.xFilter.y;
        }
        this.lastTime = timestampMs;
        const dx = (value - this.lastRaw) / dt;
        this.lastRaw = value;
        const edx = this.dxFilter.filter(dx, this.alpha(this.dCutoff, dt));
        const cutoff = this.minCutoff + this.beta * Math.abs(edx);
        return this.xFilter.filter(value, this.alpha(cutoff, dt));
    }
}

class OneEuroLandmarkFilter {
    constructor(minCutoff = 1.5, beta = 24.0, dCutoff = 1.0) {
        this.fx = new OneEuroFilter(minCutoff, beta, dCutoff);
        this.fy = new OneEuroFilter(minCutoff, beta, dCutoff);
    }
    filterInPlace(rawLm, timestampMs, outLm) {
        outLm.x = this.fx.filter(rawLm.x, timestampMs);
        outLm.y = this.fy.filter(rawLm.y, timestampMs);
        outLm.z = rawLm.z || 0;
    }
}

// Hysteresis Thresholds (Schmitt Trigger — prevents gesture boundary flicker)
const PINCH_ON = 0.23;
const PINCH_OFF = 0.33;
const SHIELD_ON = 0.35;
const SHIELD_OFF = 0.46;
const FIST_EXT_ENTER = 1.05;
const FIST_EXT_EXIT = 1.15;

function applyFilteredLandmarksAndClassify(hand, rawLandmarks, timestampMs) {
    if (!rawLandmarks || rawLandmarks.length < 21) return;

    for (let k = 0; k < 21; k++) {
        hand.lmFilters[k].filterInPlace(rawLandmarks[k], timestampMs, hand.filteredLandmarks[k]);
    }
    hand.rawLandmarks = hand.filteredLandmarks;

    const flm = hand.filteredLandmarks;
    const mirrorX = (x) => (isMirrored ? 1 - x : x);

    hand.wrist.x = mirrorX(flm[0].x);
    hand.wrist.y = flm[0].y;
    hand.palm.x = mirrorX(flm[9].x);
    hand.palm.y = flm[9].y;

    const tipIndices = [4, 8, 12, 16, 20];
    for (let t = 0; t < 5; t++) {
        const lm = flm[tipIndices[t]];
        hand.fingertips[t].x = mirrorX(lm.x);
        hand.fingertips[t].y = lm.y;
        hand.fingertips[t].z = lm.z;
    }

    const wrist = flm[0];
    const thumbTip = flm[4];
    const indexPip = flm[6];
    const indexTip = flm[8];
    const middleMcp = flm[9];
    const middlePip = flm[10];
    const middleTip = flm[12];
    const ringPip = flm[14];
    const ringTip = flm[16];
    const pinkyPip = flm[18];
    const pinkyTip = flm[20];

    // 1. Fist Classification with Hysteresis
    const extMult = hand.isFist ? FIST_EXT_EXIT : FIST_EXT_ENTER;
    const indexExt = dist(indexTip, wrist) > dist(indexPip, wrist) * extMult;
    const middleExt = dist(middleTip, wrist) > dist(middlePip, wrist) * extMult;
    const ringExt = dist(ringTip, wrist) > dist(ringPip, wrist) * extMult;
    const pinkyExt = dist(pinkyTip, wrist) > dist(pinkyPip, wrist) * extMult;

    const extendedCount = (indexExt ? 1 : 0) + (middleExt ? 1 : 0) + (ringExt ? 1 : 0) + (pinkyExt ? 1 : 0);
    const isFist = extendedCount === 0;
    const isOpenPalm = extendedCount >= 2 && !isFist;

    // Scale-Invariant Palm Metric
    const handScale = Math.max(0.08, dist(wrist, middleMcp));

    // 2. Doctor Strange Shield Gesture with Hysteresis
    const fingerTouchDist = dist(indexTip, middleTip);
    const normalizedTouchDist = fingerTouchDist / handScale;
    const shieldThresh = hand.isShieldTouch ? SHIELD_OFF : SHIELD_ON;
    const shieldRawMax = hand.isShieldTouch ? 0.08 : 0.06;
    const isShieldTouch = (normalizedTouchDist < shieldThresh || fingerTouchDist < shieldRawMax) && indexExt && middleExt && !isFist;

    // 3. Pinch Tap Gesture with Hysteresis
    const pinchDist = dist(thumbTip, indexTip);
    const normalizedPinchDist = pinchDist / handScale;
    const pinchThresh = hand.isPinchTap ? PINCH_OFF : PINCH_ON;
    const pinchRawMax = hand.isPinchTap ? 0.062 : 0.046;
    const isPinchTap = normalizedPinchDist < pinchThresh && pinchDist < pinchRawMax && !isFist && !isShieldTouch;

    hand.isFist = isFist;
    hand.isOpenPalm = isOpenPalm;
    hand.isShieldTouch = isShieldTouch;
    hand.isPinchTap = isPinchTap;
}

// -------------------------------------------------------------
// Robust Multi-Hand Persistent Tracker (Strict 1-to-1 Pair Lock + 1€ Filter)
// -------------------------------------------------------------
function updateHandTrackingInterpolation(now = performance.now()) {
    const activeTargets = targetHandsList;
    const maxGhostFrames = 3;

    const matchedTargets = new Set();
    const pairMap = new Map(); // trackedIdx -> targetIdx (guarantees strict 1-to-1 assignment)

    // 1. Greedy 1-to-1 Distance-Based Matching
    if (trackedHands.length > 0 && activeTargets.length > 0) {
        let bestDist = Infinity;
        let bestPair = null;

        for (let i = 0; i < trackedHands.length; i++) {
            for (let j = 0; j < activeTargets.length; j++) {
                const d = dist(trackedHands[i].palm, activeTargets[j].palm);
                if (d < bestDist) {
                    bestDist = d;
                    bestPair = [i, j];
                }
            }
        }

        if (bestPair && bestDist < 0.55) {
            pairMap.set(bestPair[0], bestPair[1]);
            matchedTargets.add(bestPair[1]);

            if (trackedHands.length > 1 && activeTargets.length > 1) {
                const otherTracked = bestPair[0] === 0 ? 1 : 0;
                const otherTarget = bestPair[1] === 0 ? 1 : 0;
                const secondDist = dist(trackedHands[otherTracked].palm, activeTargets[otherTarget].palm);
                if (secondDist < 0.55) {
                    pairMap.set(otherTracked, otherTarget);
                    matchedTargets.add(otherTarget);
                }
            }
        }
    }

    // 2. Update Matched Hands with One-Euro Filtering & Hysteresis (Zero Object Allocations)
    for (let idx = 0; idx < trackedHands.length; idx++) {
        const currentHand = trackedHands[idx];
        const targetIdx = pairMap.get(idx);

        if (targetIdx !== undefined) {
            const target = activeTargets[targetIdx];
            currentHand.lostFrames = 0;
            currentHand.trackedFrames = (currentHand.trackedFrames || 0) + 1;

            if (target.rawLandmarks && currentHand.lmFilters) {
                applyFilteredLandmarksAndClassify(currentHand, target.rawLandmarks, now);
            } else {
                currentHand.palm.x = target.palm.x;
                currentHand.palm.y = target.palm.y;
                currentHand.wrist.x = target.wrist.x;
                currentHand.wrist.y = target.wrist.y;
                if (target.fingertips) currentHand.fingertips = target.fingertips;
                currentHand.isFist = target.isFist;
                currentHand.isShieldTouch = target.isShieldTouch;
                currentHand.isOpenPalm = target.isOpenPalm;
                currentHand.isPinchTap = target.isPinchTap;
            }
        } else {
            currentHand.lostFrames = (currentHand.lostFrames || 0) + 1;
            currentHand.trackedFrames = 0;
        }
    }

    // 3. Remove hands that have exceeded the ghost grace period and cleanup their persistent state
    for (let i = trackedHands.length - 1; i >= 0; i--) {
        const h = trackedHands[i];
        if ((h.lostFrames || 0) >= maxGhostFrames) {
            persistentHandStates.delete(`hand_${h.id}`);
            if (activeCosmicHandId === h.id) {
                activeCosmicHandId = null;
            }
            trackedHands.splice(i, 1);
        }
    }

    // 4. Register new incoming targets that weren't matched
    for (let j = 0; j < activeTargets.length; j++) {
        if (!matchedTargets.has(j) && trackedHands.length < 2) {
            const target = activeTargets[j];
            const usedId0 = trackedHands.length > 0 && trackedHands[0].id === 0;
            const newId = usedId0 ? 1 : 0;

            const newHand = {
                id: newId,
                lostFrames: 0,
                trackedFrames: 1,
                palm: { x: target.palm.x, y: target.palm.y },
                wrist: { x: target.wrist.x, y: target.wrist.y },
                fingertips: [
                    { x: 0, y: 0, z: 0 },
                    { x: 0, y: 0, z: 0 },
                    { x: 0, y: 0, z: 0 },
                    { x: 0, y: 0, z: 0 },
                    { x: 0, y: 0, z: 0 }
                ],
                lmFilters: Array.from({ length: 21 }, () => new OneEuroLandmarkFilter(1.5, 24.0, 1.0)),
                filteredLandmarks: Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 })),
                rawLandmarks: target.rawLandmarks,
                isFist: !!target.isFist,
                isOpenPalm: target.isOpenPalm !== undefined ? target.isOpenPalm : true,
                isShieldTouch: !!target.isShieldTouch,
                isPinchTap: !!target.isPinchTap
            };

            if (target.rawLandmarks) {
                applyFilteredLandmarksAndClassify(newHand, target.rawLandmarks, now);
            } else if (target.fingertips) {
                newHand.fingertips = target.fingertips;
            }

            trackedHands.push(newHand);
        }
    }
}

// -------------------------------------------------------------
// Unified Render & GPU HandLandmarker Loop (gesturewatcher architecture)
// -------------------------------------------------------------
let lastDetectionTime = 0;
function render() {
    const now = performance.now();
    const dtSeconds = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    dtScale = dtSeconds * 60;

    // 0. Frame-Paced Zero-Copy GPU Hand Detection (~30Hz cadence; OneEuroFilter interpolates at 60Hz)
    if (isCameraActive && handLandmarker && videoElement.readyState >= 2 && videoElement.videoWidth > 0 && !videoElement.paused) {
        const currentVideoTime = videoElement.currentTime;
        if (currentVideoTime !== lastProcessedVideoTime && (now - lastDetectionTime >= 30)) {
            lastProcessedVideoTime = currentVideoTime;
            lastDetectionTime = now;
            try {
                const gpuResult = handLandmarker.detectForVideo(videoElement, now);
                onHandResults({
                    multiHandLandmarks: gpuResult.landmarks,
                    multiHandedness: gpuResult.handedness ? gpuResult.handedness.map(h => h[0]) : []
                });
            } catch (err) {
                // Single bad frame ignored gracefully
            }
        }
    }

    // 1. Render Background (Hardware-Composited Video in Fullscreen, Dark Space Trail otherwise)
    if (isCameraActive && videoElement.readyState >= 2 && camViewMode === 'fullscreen') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = 'rgba(7, 9, 19, 0.35)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (screenFlashAlpha > 0.01) {
        ctx.save();
        ctx.fillStyle = screenFlashColor;
        ctx.globalAlpha = screenFlashAlpha;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        screenFlashAlpha *= Math.pow(0.86, dtScale);
    }

    updateHandTrackingInterpolation(now);

    maintainParticles();

    // 2. High Speed Particle Render
    drawParticlesBatched(ctx);

    const activeHandsList = isCameraActive && trackedHands.length > 0
        ? trackedHands
        : (enableMouseControl ? [mouseHand] : []);

    if (dualFistState.cooldownTimer > 0) {
        dualFistState.cooldownTimer = Math.max(0, dualFistState.cooldownTimer - dtSeconds);
    }

    let isDualFist = false;
    let isDualShield = false;
    let dualMidX = 0, dualMidY = 0;
    let p1 = null, p2 = null;

    if (activeHandsList.length >= 2) {
        const h1 = activeHandsList[0];
        const h2 = activeHandsList[1];

        // Strict dual-hand validation:
        // 1. Both hands must be genuinely detected in the current frame (no ghost frames)
        // 2. Both hands must have a solid tracking history (>= 3 continuous frames for instant response)
        const bothDetectedNow = (h1.lostFrames || 0) === 0 && (h2.lostFrames || 0) === 0;
        const bothStablyTracked = (h1.trackedFrames || 0) >= 3 && (h2.trackedFrames || 0) >= 3;

        if (bothDetectedNow && bothStablyTracked) {
            p1 = { x: h1.palm.x * canvas.width, y: h1.palm.y * canvas.height };
            p2 = { x: h2.palm.x * canvas.width, y: h2.palm.y * canvas.height };
            const handDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            const horizontalDiff = Math.abs(p1.x - p2.x);

            // Ensure these are two distinct hands separated in space (not a split hallucination of one hand or face)
            const areDistinctHands = handDistance > 80 && horizontalDiff > 45;

            if (areDistinctHands) {
                // Dual Fist Giga Blackhole: Both hands form fists within fusion distance
                if (h1.isFist && h2.isFist && handDistance < 420 && dualFistState.cooldownTimer <= 0) {
                    isDualFist = true;
                    dualMidX = (p1.x + p2.x) / 2;
                    dualMidY = (p1.y + p2.y) / 2;
                    dualFistState.lastMidX = dualMidX;
                    dualFistState.lastMidY = dualMidY;
                } 
                // Giga Shield: Both hands form Doctor Strange Shield Touch together!
                // Or palms pressed close together in front (< 180px)
                else if (!h1.isFist && !h2.isFist) {
                    const bothShieldTouch = h1.isShieldTouch && h2.isShieldTouch && handDistance < 450;
                    const pressedPalms = h1.isOpenPalm && h2.isOpenPalm && handDistance < 180;
                    if (bothShieldTouch || pressedPalms) {
                        isDualShield = true;
                        dualMidX = (p1.x + p2.x) / 2;
                        dualMidY = (p1.y + p2.y) / 2;
                    }
                }
            }
        }
    }

    // Auto-cancel Cosmic Orb if dual fusions activate
    if (isDualFist || isDualShield) {
        activeCosmicHandId = null;
        persistentHandStates.forEach((s) => {
            s.cosmicActive = false;
            s.cosmicProgress = 0;
        });
    }

    // DUAL FIST GIGA BLACKHOLE
    if (isDualFist) {
        dualFistState.birthProgress = Math.min(1.0, dualFistState.birthProgress + 0.05 * dtScale);
        if (dualFistState.birthProgress >= 1.0) {
            dualFistState.charge = Math.min(1.0, dualFistState.charge + 0.004386 * dtScale);
        }
        
        drawGigaBlackhole(ctx, p1.x, p1.y, p2.x, p2.y, dualMidX, dualMidY, dualFistState.charge, dualFistState.birthProgress);

        if (dualFistState.birthProgress >= 0.8) {
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                const dx = dualMidX - p.x;
                const dy = dualMidY - p.y;
                const distSq = dx * dx + dy * dy;
                if (distSq > 25 && distSq < 250000) {
                    const spiralAngle = Math.atan2(dy, dx) + 0.45;
                    const pull = (2.8 + dualFistState.charge * 4.5) * dtScale;
                    p.vx += Math.cos(spiralAngle) * pull;
                    p.vy += Math.sin(spiralAngle) * pull;
                }
            }
        }

        if (dualFistState.charge >= 1.0) {
            triggerSupernovaExplosion(dualMidX, dualMidY, 2.5);
            dualFistState.charge = 0;
            dualFistState.cooldownTimer = 3.0;
        }

        dualFistState.wasDualFist = true;
    } else {
        if (dualFistState.wasDualFist) {
            if (dualFistState.charge >= 0.5) {
                triggerSupernovaExplosion(
                    dualFistState.lastMidX || (canvas.width / 2),
                    dualFistState.lastMidY || (canvas.height / 2),
                    2.2
                );
                dualFistState.cooldownTimer = 3.0;
            }
        }
        dualFistState.wasDualFist = false;
        dualFistState.charge = 0;
        dualFistState.birthProgress = 0;
    }

    if (isDualShield) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        drawGigaShield(ctx, p1.x, p1.y, p2.x, p2.y, dualMidX, dualMidY);
        ctx.restore();
    }

    activeHandsList.forEach((hand) => {
        const palmX = hand.palm.x * canvas.width;
        const palmY = hand.palm.y * canvas.height;
        const indexTip = hand.fingertips[1] || hand.palm;
        const indexX = indexTip.x * canvas.width;
        const indexY = indexTip.y * canvas.height - 45;

        // Track index fingertip velocity for throw/flick detection
        if (hand.lastIndexX !== undefined) {
            hand.indexVx = (indexX - hand.lastIndexX) / dtScale;
            hand.indexVy = (indexY - hand.lastIndexY) / dtScale;
        } else {
            hand.indexVx = 0;
            hand.indexVy = 0;
        }
        hand.lastIndexX = indexX;
        hand.lastIndexY = indexY;

        const colors = PALETTES[activeColorPalette];
        let pState = getPersistentState(hand);
        if (!pState) return;

        if (pState.cooldownTimer > 0) {
            pState.cooldownTimer = Math.max(0, pState.cooldownTimer - dtSeconds);
        }

        // Check if other spells are active on this hand or globally
        const isFistActive = hand.isFist && pState.cooldownTimer <= 0;
        const isShieldActive = hand.isShieldTouch && !hand.isFist;
        const isOtherSpellActive = isDualFist || isDualShield || isFistActive || isShieldActive || pState.fistCharge > 0 || pState.shieldProgress > 0.05;

        // If another spell is active, immediately kill the cosmic orb on this hand
        if (isOtherSpellActive) {
            pState.cosmicActive = false;
            pState.cosmicProgress = 0;
            if (activeCosmicHandId === hand.id) {
                activeCosmicHandId = null;
            }
        }

        // 1. Throw Detection: If this hand holds the active Cosmic Orb and flicks toward the other hand!
        if (activeCosmicHandId === hand.id && pState.cosmicActive && !isOtherSpellActive && !cosmicProjectile.active) {
            const otherHand = activeHandsList.find(h => h.id !== hand.id);
            if (otherHand) {
                const otherTip = otherHand.fingertips[1] || otherHand.palm;
                const otherX = otherTip.x * canvas.width;
                const otherY = otherTip.y * canvas.height - 45;
                const toOtherX = otherX - indexX;
                const toOtherY = otherY - indexY;
                const distToOther = Math.hypot(toOtherX, toOtherY);

                if (distToOther > 110) {
                    const velTowardTarget = (hand.indexVx * toOtherX + hand.indexVy * toOtherY) / distToOther;
                    const flickSpeed = Math.hypot(hand.indexVx, hand.indexVy);

                    // Flick/swipe gesture towards the other hand!
                    if (flickSpeed > 13 && velTowardTarget > 10) {
                        launchCosmicProjectile(hand.id, otherHand.id, indexX, indexY, otherX, otherY);
                    }
                }
            }
        }

        // 2. Pinch Tap Toggle / Summon State for Floating Cosmic Orb:
        // Must be stable for >= 4 frames, no other active spell, and released for at least 3 frames
        if (!hand.isPinchTap) {
            pState.pinchReleaseFrames = (pState.pinchReleaseFrames || 0) + 1;
        }

        const canTriggerPinch = (hand.trackedFrames || 0) >= 4 && !isOtherSpellActive && (pState.pinchReleaseFrames || 0) >= 3;

        if (hand.isPinchTap && !pState.wasPinchTap && canTriggerPinch) {
            pState.pinchReleaseFrames = 0;
            if (activeCosmicHandId === hand.id) {
                // Toggle OFF on this hand
                pState.cosmicActive = false;
                pState.cosmicProgress = 0;
                activeCosmicHandId = null;
            } else if (activeCosmicHandId !== null && !cosmicProjectile.active) {
                // The OTHER hand currently has the orb: SUMMON / PULL it over via projectile flight!
                const sourceHand = activeHandsList.find(h => h.id === activeCosmicHandId);
                if (sourceHand) {
                    const srcTip = sourceHand.fingertips[1] || sourceHand.palm;
                    const srcX = srcTip.x * canvas.width;
                    const srcY = srcTip.y * canvas.height - 45;
                    launchCosmicProjectile(sourceHand.id, hand.id, srcX, srcY, indexX, indexY);
                } else {
                    // Source hand is gone, activate here directly
                    persistentHandStates.forEach(s => { s.cosmicActive = false; s.cosmicProgress = 0; });
                    pState.cosmicActive = true;
                    activeCosmicHandId = hand.id;
                }
            } else if (!cosmicProjectile.active) {
                // No other hand has the orb: activate directly on this hand!
                persistentHandStates.forEach((otherState) => {
                    otherState.cosmicActive = false;
                    otherState.cosmicProgress = 0;
                });
                pState.cosmicActive = true;
                activeCosmicHandId = hand.id;
            }
        }
        pState.wasPinchTap = hand.isPinchTap;

        // Only progress and draw cosmic orb if this hand is the single active hand, no projectile in flight, and no other spell is active
        if (activeCosmicHandId === hand.id && pState.cosmicActive && !isOtherSpellActive && !cosmicProjectile.active) {
            pState.cosmicProgress = Math.min(1.0, pState.cosmicProgress + 0.18 * dtScale);
        } else {
            pState.cosmicProgress = 0;
            pState.cosmicActive = false;
        }

        if (pState.cosmicProgress > 0.01) {
            drawCosmicEnergyOrb(ctx, indexX, indexY, pState.cosmicProgress);
        }

        // DOCTOR STRANGE SHIELD: Activated when Index Tip & Middle Tip Touch!
        if (isShieldActive && !isDualShield) {
            pState.shieldProgress = Math.min(1.0, pState.shieldProgress + 0.18 * dtScale);
        } else {
            pState.shieldProgress = Math.max(0, pState.shieldProgress - 0.16 * dtScale);
        }

        const hasActiveEffect = isDualFist || isDualShield || isFistActive || pState.shieldProgress > 0.1 || pState.fistCharge > 0 || pState.cosmicProgress > 0.1;

        if (!hand.isMouse && showSkeleton && !hasActiveEffect) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            drawHandSkeleton(ctx, hand.rawLandmarks, colors);
            ctx.restore();
        }

        // INDIVIDUAL BLACKHOLE
        if (!isDualFist && hand.isFist && pState.cooldownTimer <= 0) {
            pState.noFistDebounce = 0;
            pState.birthProgress = Math.min(1.0, pState.birthProgress + 0.05 * dtScale);

            if (pState.birthProgress >= 1.0) {
                pState.fistCharge = Math.min(1.0, pState.fistCharge + 0.004386 * dtScale);
            }

            drawBlackhole(ctx, palmX, palmY, pState.fistCharge, pState.birthProgress);

            if (pState.birthProgress >= 0.8) {
                for (let i = 0; i < particles.length; i++) {
                    const p = particles[i];
                    const dx = palmX - p.x;
                    const dy = palmY - p.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq > 25 && distSq < 160000) {
                        const d = Math.sqrt(distSq);
                        const pull = (1.2 + pState.fistCharge * 1.8) * dtScale;
                        p.vx += (dx / d) * pull;
                        p.vy += (dy / d) * pull;
                    }
                }
            }

            if (pState.fistCharge >= 1.0) {
                triggerSupernovaExplosion(palmX, palmY, 1.8);
                pState.fistCharge = 0;
                pState.cooldownTimer = 3.0;
            }
        } else if (!isDualFist) {
            if (pState.fistCharge > 0) {
                pState.noFistDebounce++;
                if (pState.noFistDebounce <= 3) {
                    drawBlackhole(ctx, palmX, palmY, pState.fistCharge, pState.birthProgress);
                } else {
                    if (pState.fistCharge >= 0.5) {
                        triggerSupernovaExplosion(palmX, palmY, 1.2 + pState.fistCharge * 0.8);
                        pState.cooldownTimer = 3.0;
                    }
                    pState.fistCharge = 0;
                    pState.birthProgress = 0;
                    pState.noFistDebounce = 0;
                }
            } else {
                pState.birthProgress = 0;
            }
        }

        // INDIVIDUAL DOCTOR STRANGE SHIELD
        if (!isDualShield && pState.shieldProgress > 0.01) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            drawDoctorStrangeShield(ctx, palmX, palmY, 150, pState.shieldProgress);
            ctx.restore();
        }
    });

    // Render Inter-Hand Cosmic Projectile (Flight & Stardust Trail)
    updateAndDrawCosmicProjectile(ctx, activeHandsList);

    if (camViewMode === 'pip') {
        drawMiniMonitor(ctx);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        if (sw.update()) {
            sw.draw(ctx);
        } else {
            shockwaves.splice(i, 1);
        }
    }
    ctx.restore();

    frameCount++;
    if (now - lastFpsUpdate >= 1000) {
        fpsCounter.textContent = `${frameCount} FPS`;
        frameCount = 0;
        lastFpsUpdate = now;
    }

    requestAnimationFrame(render);
}

// -------------------------------------------------------------
// MediaPipe Detection Results & Scale-Invariant Gestures
// -------------------------------------------------------------
function onHandResults(results) {
    targetHandsList = [];

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        results.multiHandLandmarks.forEach((landmarks, hIdx) => {
            // 1. MediaPipe Confidence Score Check (filters low-confidence noise)
            if (results.multiHandedness && results.multiHandedness[hIdx]) {
                const handScore = results.multiHandedness[hIdx].score;
                if (handScore !== undefined && handScore < 0.55) {
                    return; // Skip low confidence detection
                }
            }

            // 2. Minimal Microscopic Artifact Filter (Allows hands close to camera & tilted palms)
            const rawWrist = landmarks[0];
            const rawIndexMcp = landmarks[5];
            const rawMiddleMcp = landmarks[9];
            const rawPinkyMcp = landmarks[17];

            const palmLength = Math.hypot(rawMiddleMcp.x - rawWrist.x, rawMiddleMcp.y - rawWrist.y);
            const palmWidth = Math.hypot(rawIndexMcp.x - rawPinkyMcp.x, rawIndexMcp.y - rawPinkyMcp.y);

            // Only filter out microscopic edge noise
            if (palmLength < 0.02 || palmWidth < 0.015) {
                return;
            }

            const getCoord = (lm) => ({
                x: isMirrored ? 1 - lm.x : lm.x,
                y: lm.y,
                z: lm.z
            });

            const wrist = getCoord(landmarks[0]);
            const thumbTip = getCoord(landmarks[4]);
            const indexTip = getCoord(landmarks[8]);
            const indexPip = getCoord(landmarks[6]);
            const middleTip = getCoord(landmarks[12]);
            const middlePip = getCoord(landmarks[10]);
            const ringTip = getCoord(landmarks[16]);
            const ringPip = getCoord(landmarks[14]);
            const pinkyTip = getCoord(landmarks[20]);
            const pinkyPip = getCoord(landmarks[18]);
            const palmCenter = getCoord(landmarks[9]);

            // Robust Extension Checks
            const indexExt = dist(indexTip, wrist) > dist(indexPip, wrist) * 1.05;
            const middleExt = dist(middleTip, wrist) > dist(middlePip, wrist) * 1.05;
            const ringExt = dist(ringTip, wrist) > dist(ringPip, wrist) * 1.05;
            const pinkyExt = dist(pinkyTip, wrist) > dist(pinkyPip, wrist) * 1.05;

            const extendedCount = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;
            const isFist = !indexExt && !middleExt && !ringExt && !pinkyExt;
            const isOpenPalm = extendedCount >= 2 && !isFist;

            // Scale-Invariant Metric (Normalizes based on hand distance to camera)
            const handScale = Math.max(0.08, dist(wrist, palmCenter));

            // Shield Gesture: Index & Middle Fingers Extended & Touching Together (✌️ with fingers together)
            const fingerTouchDist = dist(indexTip, middleTip);
            const normalizedTouchDist = fingerTouchDist / handScale;
            const isShieldTouch = (normalizedTouchDist < 0.35 || fingerTouchDist < 0.06) && indexExt && middleExt && !isFist;

            // Pinch Gesture: Thumb Tip touches Index Tip with deliberate precision
            const pinchDist = dist(thumbTip, indexTip);
            const normalizedPinchDist = pinchDist / handScale;
            const isPinchTap = normalizedPinchDist < 0.22 && pinchDist < 0.045 && !isFist && !isShieldTouch;

            targetHandsList.push({
                wrist,
                palm: palmCenter,
                fingertips: [thumbTip, indexTip, middleTip, ringTip, pinkyTip],
                rawLandmarks: landmarks,
                isFist,
                isOpenPalm,
                isShieldTouch,
                isPinchTap
            });
        });
    }

    if (targetHandsList.length > 0) {
        statusBadge.className = 'badge success';
        statusText.textContent = `Tracking (${targetHandsList.length} Tangan)`;
    } else if (isCameraActive) {
        statusBadge.className = 'badge warning';
        statusText.textContent = 'Mencari Tangan...';
    }
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// MEDIAPIPE GPU HANDLANDMARKER ENGINE (@mediapipe/tasks-vision + Fallback)
// -------------------------------------------------------------
const VISION_BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs';
const VISION_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const HAND_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

let isProcessingTracking = false;
let lastTrackingStartTime = 0;
let trackingTimerId = null;
let lastProcessedVideoTime = -1;

// Legacy fallback loop (only used if GPU HandLandmarker falls back to CPU Hands)
async function trackingLoop() {
    if (trackingTimerId) {
        clearTimeout(trackingTimerId);
        trackingTimerId = null;
    }

    // When GPU HandLandmarker is active, detection runs directly inside requestAnimationFrame(render)
    if (handLandmarker) return;

    if (isCameraActive && videoElement.readyState >= 2 && handsDetector && videoElement.videoWidth > 0 && !videoElement.paused) {
        if (!isMediaPipeReady && mediaPipeInitPromise) {
            try {
                await mediaPipeInitPromise;
            } catch (e) {}
        }
        if (handLandmarker) return;

        if (isProcessingTracking && performance.now() - lastTrackingStartTime > 5000) {
            console.warn("MediaPipe send watchdog triggered, resetting lock.");
            isProcessingTracking = false;
        }

        const currentVideoTime = videoElement.currentTime;
        if (!isProcessingTracking && currentVideoTime !== lastProcessedVideoTime) {
            isProcessingTracking = true;
            lastProcessedVideoTime = currentVideoTime;
            lastTrackingStartTime = performance.now();
            try {
                const targetH = Math.round(320 / ((videoElement.videoWidth / videoElement.videoHeight) || (16 / 9)));
                if (offCanvas.width !== 320 || offCanvas.height !== targetH) {
                    offCanvas.width = 320;
                    offCanvas.height = targetH;
                }

                offCtx.drawImage(videoElement, 0, 0, offCanvas.width, offCanvas.height);
                await handsDetector.send({ image: offCanvas });
            } catch (err) {
                // Drop frame gracefully without stopping the loop
            } finally {
                isProcessingTracking = false;
            }
        }
    }
    if (isCameraActive && !handLandmarker) {
        trackingTimerId = setTimeout(trackingLoop, 28);
    }
}

// Webcam Stream Health Watchdog (Auto-Detects Stalls & Reconnects)
let lastVideoCheckTime = 0;
let cameraStallCounter = 0;
setInterval(() => {
    if (!isCameraActive || !videoElement || videoElement.readyState < 2) return;

    if (videoElement.currentTime === lastVideoCheckTime) {
        cameraStallCounter++;
        if (cameraStallCounter >= 3) {
            console.warn("Webcam stream freeze detected, executing auto-recovery...");
            statusBadge.className = 'badge warning';
            statusText.textContent = 'Memulihkan Kamera...';
            videoElement.play().catch(() => {});

            if (webcamStream) {
                const track = webcamStream.getVideoTracks()[0];
                if (!track || track.readyState === 'ended' || cameraStallCounter >= 5) {
                    cameraStallCounter = 0;
                    toggleCamera().then(() => toggleCamera());
                }
            }
        }
    } else {
        lastVideoCheckTime = videoElement.currentTime;
        cameraStallCounter = 0;
    }
}, 1000);

// Fallback initializer for legacy @mediapipe/hands
function initLegacyHandsFallback() {
    if (typeof Hands === 'undefined') {
        setTimeout(initLegacyHandsFallback, 200);
        return Promise.resolve();
    }
    if (handsDetector) return Promise.resolve();
    try {
        handsDetector = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        handsDetector.setOptions({
            maxNumHands: 2,
            modelComplexity: 0,
            minDetectionConfidence: 0.55,
            minTrackingConfidence: 0.55
        });

        handsDetector.onResults(onHandResults);

        if (typeof handsDetector.initialize === 'function') {
            return handsDetector.initialize().then(() => {
                isMediaPipeReady = true;
                if (!isCameraActive) {
                    statusBadge.className = 'badge info';
                    statusText.textContent = 'Webcam Siap';
                }
            }).catch(() => {
                isMediaPipeReady = true;
            });
        }
        isMediaPipeReady = true;
        if (!isCameraActive) {
            statusBadge.className = 'badge info';
            statusText.textContent = 'Webcam Siap';
        }
    } catch (err) {
        console.error("Failed to init fallback MediaPipe Hands:", err);
    }
    return Promise.resolve();
}

// Initialize & Pre-Warm @mediapipe/tasks-vision GPU HandLandmarker at Startup (gesturewatcher architecture)
function initMediaPipe() {
    if (handLandmarker || handsDetector || mediaPipeInitPromise) return;

    if (!isCameraActive) {
        statusBadge.className = 'badge info';
        statusText.textContent = 'Memuat GPU AI...';
    }

    mediaPipeInitPromise = (async () => {
        try {
            const { FilesetResolver, HandLandmarker } = await import(VISION_BUNDLE_URL);
            const vision = await FilesetResolver.forVisionTasks(VISION_WASM_URL);
            handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: HAND_MODEL_URL,
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numHands: 2,
                minHandDetectionConfidence: 0.5,
                minHandPresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            isMediaPipeReady = true;
            if (!isCameraActive) {
                statusBadge.className = 'badge info';
                statusText.textContent = 'Webcam Siap (GPU)';
            }
        } catch (gpuErr) {
            console.warn("GPU HandLandmarker unavailable, falling back to legacy Hands:", gpuErr);
            await initLegacyHandsFallback();
        }
    })();
}

// WebCam Initialization with Stream Recovery
async function toggleCamera() {
    if (isCameraActive) {
        if (trackingTimerId) {
            clearTimeout(trackingTimerId);
            trackingTimerId = null;
        }
        lastProcessedVideoTime = -1;
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            webcamStream = null;
        }
        videoElement.srcObject = null;
        isCameraActive = false;
        syncVideoLayerStyle();
        targetHandsList = [];
        trackedHands = [];
        persistentHandStates.clear();
        activeCosmicHandId = null;
        cosmicProjectile.active = false;
        btnWebcam.querySelector('span').textContent = 'Aktifkan Webcam';
        btnWebcam.classList.remove('primary');
        btnWebcam.classList.add('secondary');
        statusBadge.className = 'badge info';
        statusText.textContent = 'Webcam Nonaktif';
    } else {
        initMediaPipe();
        statusBadge.className = 'badge warning';
        statusText.textContent = 'Memulai Kamera...';

        try {
            // Request HD 1280x720 (up to 1080p) — rendered directly via GPU <video> layer
            webcamStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 60 },
                    facingMode: 'user'
                },
                audio: false
            });

            videoElement.muted = true;
            videoElement.playsInline = true;
            videoElement.srcObject = webcamStream;
            await videoElement.play();

            if (!isMediaPipeReady && mediaPipeInitPromise) {
                statusText.textContent = 'Menyiapkan GPU AI...';
                await mediaPipeInitPromise;
            }

            const track = webcamStream.getVideoTracks()[0];
            if (track) {
                track.onended = () => {
                    console.warn("Camera track ended unexpectedly, attempting restart...");
                    if (isCameraActive) {
                        toggleCamera().then(() => toggleCamera());
                    }
                };
            }

            isCameraActive = true;
            syncVideoLayerStyle();
            cameraStallCounter = 0;
            lastProcessedVideoTime = -1;
            btnWebcam.querySelector('span').textContent = 'Matikan Webcam';
            btnWebcam.classList.remove('secondary');
            btnWebcam.classList.add('primary');

            statusBadge.className = 'badge warning';
            statusText.textContent = 'Mencari Tangan...';

            if (!handLandmarker) {
                trackingLoop();
            }
        } catch (err) {
            console.error('Camera access denied or failed:', err);
            alert('Tidak dapat mengakses webcam. Pastikan izin kamera telah diberikan!');
            statusBadge.className = 'badge warning';
            statusText.textContent = 'Akses Kamera Gagal';
        }
    }
}

// Mouse Control Listeners with Multi-Spell Interactions
window.addEventListener('mousemove', (e) => {
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
});

window.addEventListener('mousedown', (e) => {
    if (!enableMouseControl) return;
    if (e.button === 0) {
        // Left Click: Pinch / Toggle Cosmic Orb
        mouseHand.isPinchTap = true;
    } else if (e.button === 1) {
        // Middle Click (Hold): Charge Gargantua Blackhole
        e.preventDefault();
        mouseHand.isFist = true;
        mouseHand.isShieldTouch = false;
    } else if (e.button === 2) {
        // Right Click: Toggle Doctor Strange Shield
        mouseHand.isShieldTouch = !mouseHand.isShieldTouch;
    }
});

window.addEventListener('mouseup', (e) => {
    if (!enableMouseControl) return;
    if (e.button === 0) {
        mouseHand.isPinchTap = false;
    } else if (e.button === 1) {
        mouseHand.isFist = false;
    }
});

window.addEventListener('contextmenu', (e) => {
    if (enableMouseControl) {
        e.preventDefault();
    }
});

// UI Controls Event Listeners
const controlsPanel = document.getElementById('controls-panel');
const btnMinimizePanel = document.getElementById('btn-minimize-panel');
const btnShowPanel = document.getElementById('btn-show-panel');

if (btnMinimizePanel && btnShowPanel) {
    btnMinimizePanel.addEventListener('click', () => {
        controlsPanel.classList.add('collapsed');
        btnShowPanel.classList.remove('hidden');
    });

    btnShowPanel.addEventListener('click', () => {
        controlsPanel.classList.remove('collapsed');
        btnShowPanel.classList.add('hidden');
    });
}

colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeColorPalette = btn.dataset.color;
        const newColors = PALETTES[activeColorPalette];
        screenFlashColor = newColors[0];
        colorValDisplay.textContent = btn.dataset.color.toUpperCase();
        rebuildGlowSprites();
        // Immediately recolor all active particles so palette switch is instant
        for (let i = 0; i < particles.length; i++) {
            particles[i].color = newColors[i % newColors.length];
        }
    });
});

sliderParticles.addEventListener('input', (e) => {
    targetParticleCount = parseInt(e.target.value);
    particleCountDisplay.textContent = targetParticleCount;
});

sliderGlow.addEventListener('input', (e) => {
    glowLevel = parseInt(e.target.value);
    const labels = ['Rendah', 'Sedang', 'Tinggi'];
    glowDisplay.textContent = labels[glowLevel - 1];
});

sliderCamTint.addEventListener('input', (e) => {
    camTintLevel = parseInt(e.target.value);
    camTintDisplay.textContent = `${camTintLevel * 10}%`;
    syncVideoLayerStyle();
});

btnWebcam.addEventListener('click', toggleCamera);

btnViewMode.addEventListener('click', () => {
    if (camViewMode === 'fullscreen') {
        camViewMode = 'pip';
        btnViewMode.querySelector('span').textContent = 'Mode: Monitor PiP';
        btnViewMode.classList.add('active');
    } else {
        camViewMode = 'fullscreen';
        btnViewMode.querySelector('span').textContent = 'Mode: Fullscreen';
        btnViewMode.classList.remove('active');
    }
    syncVideoLayerStyle();
});

btnMirror.addEventListener('click', () => {
    isMirrored = !isMirrored;
    btnMirror.classList.toggle('active', isMirrored);
    syncVideoLayerStyle();
});

btnSkeleton.addEventListener('click', () => {
    showSkeleton = !showSkeleton;
    btnSkeleton.classList.toggle('active', showSkeleton);
});

btnMouse.addEventListener('click', () => {
    enableMouseControl = !enableMouseControl;
    btnMouse.classList.toggle('active', enableMouseControl);
});

btnClear.addEventListener('click', () => {
    while (particles.length > 0) {
        particlePool.push(particles.pop());
    }
    shockwaves.length = 0;
    if (mouseHand.trail) mouseHand.trail.length = 0;
    trackedHands.forEach(h => { if (h.trail) h.trail.length = 0; });
});

btnToggleGuide.addEventListener('click', () => {
    gestureGuide.classList.toggle('hidden');
});

btnCloseGuide.addEventListener('click', () => {
    gestureGuide.classList.add('hidden');
});

// Start App Safely
initMediaPipe();
render();
