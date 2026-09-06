// --- AETHERCAST: Next-Gen Cinematic Magic Engine (Bugfixes & Ultra-Reliability) ---

// DOM Elements
const canvas = document.getElementById('output_canvas');
const ctx = canvas.getContext('2d');
const videoElement = document.getElementById('input_video');
const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const fpsCounter = document.getElementById('fps-counter');

// Offscreen Canvas for Ultra-Fast MediaPipe WASM Processing (Zero-Lag 480x270)
const offCanvas = document.createElement('canvas');
offCanvas.width = 480;
offCanvas.height = 270;
const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

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
let handsDetector = null;
let webcamStream = null;

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
let dualFistState = { wasDualFist: false, charge: 0, birthProgress: 0, cooldownTimer: 0 };

// Safe Mouse Interaction State
let mouseHand = {
    isMouse: true,
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
// Resize & Setup Canvas
// -------------------------------------------------------------
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// -------------------------------------------------------------
// Ultra-High Speed Batched Particle & Volumetric Plasma Engine
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
function maintainParticles() {
    while (particles.length < targetParticleCount) {
        particles.push(new Particle());
    }
    if (particles.length > targetParticleCount) {
        particles.length = targetParticleCount;
    }
}

function drawParticlesBatched(ctx) {
    const colorBatches = {};
    
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p.update()) {
            particles.splice(i, 1);
            continue;
        }
        if (!colorBatches[p.color]) {
            colorBatches[p.color] = [];
        }
        colorBatches[p.color].push(p);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    for (const color in colorBatches) {
        const batch = colorBatches[color];
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let j = 0; j < batch.length; j++) {
            const p = batch[j];
            const alpha = Math.max(0, p.life / p.maxLife);
            const r = p.size * alpha;
            if (r > 0.1) {
                ctx.moveTo(p.x + r, p.y);
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
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
        const p = new Particle();
        p.reset(x, y, (Math.random() * 9.5 + 7) * intensity, angle);
        particles.push(p);
    }

    const maxRadiusSq = (440 * intensity) * (440 * intensity);
    particles.forEach(p => {
        const dx = p.x - x;
        const dy = p.y - y;
        const distSq = dx * dx + dy * dy;
        if (distSq < maxRadiusSq && distSq > 1) {
            const d = Math.sqrt(distSq);
            const force = (1 - d / (440 * intensity)) * 34 * intensity;
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
        }
    });
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

    const radius = 32 * progress;

    ctx.globalCompositeOperation = 'lighter';

    // 1. Multi-Layer Outer Solar Corona Aura
    const auraGrad = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius * 2.4);
    auraGrad.addColorStop(0, '#ffffff');
    auraGrad.addColorStop(0.35, mainColor);
    auraGrad.addColorStop(0.7, secColor);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.4, 0, Math.PI * 2);
    ctx.fillStyle = auraGrad;
    ctx.globalAlpha = 0.65 * progress;
    ctx.fill();

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

    // 3. Volumetric High-Energy Plasma Core
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.5, accColor);
    coreGrad.addColorStop(1, mainColor);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.globalAlpha = 0.95 * progress;
    ctx.fill();

    // 4. Radiating Anti-Gravity Micro Sparks
    if (Math.random() < 0.7 && particles.length < targetParticleCount) {
        const a = Math.random() * Math.PI * 2;
        const r = radius * (1.1 + Math.random() * 0.6);
        const p = new Particle();
        p.reset(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.4);
        particles.push(p);
    }

    ctx.restore();
}

// -------------------------------------------------------------
// Hand Energy Skeleton Renderer
// -------------------------------------------------------------
function drawHandSkeleton(ctx, rawLandmarks, colors) {
    if (!showSkeleton || !rawLandmarks || rawLandmarks.length === 0) return;

    ctx.save();
    ctx.strokeStyle = colors[0];
    ctx.lineWidth = 2.5;

    HAND_CONNECTIONS.forEach(([i, j]) => {
        const p1 = rawLandmarks[i];
        const p2 = rawLandmarks[j];
        if (p1 && p2) {
            const x1 = (isMirrored ? 1 - p1.x : p1.x) * canvas.width;
            const y1 = p1.y * canvas.height;
            const x2 = (isMirrored ? 1 - p2.x : p2.x) * canvas.width;
            const y2 = p2.y * canvas.height;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    });

    rawLandmarks.forEach((lm, idx) => {
        const x = (isMirrored ? 1 - lm.x : lm.x) * canvas.width;
        const y = lm.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, idx % 4 === 0 ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fillStyle = colors[idx % colors.length];
        ctx.fill();
    });

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

    // 0. Soft Volumetric Back Glow
    const backGlow = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 1.35);
    backGlow.addColorStop(0, secColor);
    backGlow.addColorStop(0.6, mainColor);
    backGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
    ctx.fillStyle = backGlow;
    ctx.globalAlpha = 0.45 * progress;
    ctx.fill();

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
    if (Math.random() < 0.7 && particles.length < targetParticleCount) {
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkRadius = radius * (0.8 + Math.random() * 0.35);
        const pX = x + Math.cos(sparkAngle) * sparkRadius;
        const pY = y + Math.sin(sparkAngle) * sparkRadius;
        const spark = new Particle();
        spark.reset(pX, pY, 2.2);
        particles.push(spark);
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

    // Volumetric Central Shockwave Glow
    const glow = ctx.createRadialGradient(0, 0, radius * 0.3, 0, 0, radius * 1.4);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(0.4, secColor);
    glow.addColorStop(0.8, mainColor);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.4, 0, Math.PI * 2);
    ctx.fill();

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
        const p = new Particle();
        p.reset(midX + Math.cos(a) * r, midY + Math.sin(a) * r, 2.5);
        particles.push(p);
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

    const outerGlow = ctx.createRadialGradient(0, 0, currentRadius * 0.8, 0, 0, currentRadius * 2.5);
    outerGlow.addColorStop(0, mainColor);
    outerGlow.addColorStop(0.5, secColor);
    outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.globalAlpha = 0.55 * birthProgress;
    ctx.fill();

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

    // Deep Shadow Radial Gradient Falloff
    const shadowGrad = ctx.createRadialGradient(0, 0, currentRadius * 0.7, 0, 0, currentRadius);
    shadowGrad.addColorStop(0, '#000000');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = shadowGrad;
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
// GIGA DUAL-HAND INTERSTELLAR BLACKHOLE FUSION RENDERER
// -------------------------------------------------------------
function drawGigaBlackhole(ctx, x1, y1, x2, y2, midX, midY, chargeRatio = 0, birthProgress = 1.0) {
    const colors = PALETTES[activeColorPalette];
    const mainColor = colors[0];
    const secColor = colors[1] || colors[0];
    
    const baseRadius = 110 * Math.min(1.0, birthProgress * 1.2);
    const radius = baseRadius + chargeRatio * 65;

    ctx.save();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = (4 + Math.random() * 3) * birthProgress;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(midX, midY);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();

    ctx.translate(midX, midY);
    blackholeRotation += 0.06 * dtScale;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = (8 + chargeRatio * 5) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.65, radius * 0.48, blackholeRotation * 0.25, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = secColor;
    ctx.lineWidth = (5 + chargeRatio * 3) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.48, radius * 1.6, -blackholeRotation * 0.2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4 * birthProgress;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 5 * birthProgress;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = (8 + chargeRatio * 5) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.75, radius * 0.38, 0.15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5 * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.55, radius * 0.25, 0.15, 0, Math.PI * 2);
    ctx.stroke();

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
// Robust Multi-Hand Persistent Tracker (Ghost Grace Period & Adaptive Smoothing)
// -------------------------------------------------------------
function updateHandTrackingInterpolation() {
    const activeTargets = [...targetHandsList];
    const maxGhostFrames = 10; // ~300ms grace period to prevent flickering during fast movements

    const matchedTargets = new Set();
    const matchedTracked = new Set();

    // 1. Greedy Distance-Based Matching
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

        if (bestPair) {
            matchedTracked.add(bestPair[0]);
            matchedTargets.add(bestPair[1]);

            if (trackedHands.length > 1 && activeTargets.length > 1) {
                const otherTracked = bestPair[0] === 0 ? 1 : 0;
                const otherTarget = bestPair[1] === 0 ? 1 : 0;
                matchedTracked.add(otherTracked);
                matchedTargets.add(otherTarget);
            }
        }
    }

    // 2. Update Matched Hands with Adaptive Smoothing
    trackedHands.forEach((currentHand, idx) => {
        if (matchedTracked.has(idx)) {
            let targetIdx = -1;
            activeTargets.forEach((t, j) => {
                if (matchedTargets.has(j)) {
                    if (trackedHands.length === 1 || activeTargets.length === 1) {
                        targetIdx = j;
                    } else {
                        const d = dist(currentHand.palm, t.palm);
                        if (targetIdx === -1 || d < dist(currentHand.palm, activeTargets[targetIdx].palm)) {
                            targetIdx = j;
                        }
                    }
                }
            });

            if (targetIdx !== -1) {
                const target = activeTargets[targetIdx];
                currentHand.lostFrames = 0;

                // Adaptive dynamic smoothing: Snappy on fast motion, silky smooth on stillness
                const moveDist = dist(currentHand.palm, target.palm);
                const lerpAmt = Math.min(0.78, Math.max(0.32, moveDist * 3.6));

                currentHand.palm.x = lerp(currentHand.palm.x, target.palm.x, lerpAmt);
                currentHand.palm.y = lerp(currentHand.palm.y, target.palm.y, lerpAmt);
                currentHand.wrist.x = lerp(currentHand.wrist.x, target.wrist.x, lerpAmt);
                currentHand.wrist.y = lerp(currentHand.wrist.y, target.wrist.y, lerpAmt);

                // Smooth all fingertips
                if (target.fingertips) {
                    target.fingertips.forEach((tip, fIdx) => {
                        if (currentHand.fingertips[fIdx]) {
                            currentHand.fingertips[fIdx].x = lerp(currentHand.fingertips[fIdx].x, tip.x, lerpAmt);
                            currentHand.fingertips[fIdx].y = lerp(currentHand.fingertips[fIdx].y, tip.y, lerpAmt);
                        }
                    });
                }

                // Smooth all 21 raw landmarks for silky hand skeleton rendering
                if (currentHand.rawLandmarks && target.rawLandmarks) {
                    for (let lm = 0; lm < 21; lm++) {
                        if (currentHand.rawLandmarks[lm] && target.rawLandmarks[lm]) {
                            currentHand.rawLandmarks[lm].x = lerp(currentHand.rawLandmarks[lm].x, target.rawLandmarks[lm].x, lerpAmt);
                            currentHand.rawLandmarks[lm].y = lerp(currentHand.rawLandmarks[lm].y, target.rawLandmarks[lm].y, lerpAmt);
                        }
                    }
                } else {
                    currentHand.rawLandmarks = target.rawLandmarks ? target.rawLandmarks.map(p => ({ ...p })) : null;
                }

                // Gesture Hysteresis & Debounce (Eliminates flickering)
                currentHand.fistConfidence = target.isFist ? Math.min(5, (currentHand.fistConfidence || 0) + 1) : Math.max(0, (currentHand.fistConfidence || 0) - 1);
                currentHand.isFist = currentHand.fistConfidence >= 2;

                currentHand.shieldConfidence = target.isShieldTouch ? Math.min(5, (currentHand.shieldConfidence || 0) + 1) : Math.max(0, (currentHand.shieldConfidence || 0) - 1);
                currentHand.isShieldTouch = currentHand.shieldConfidence >= 2;

                currentHand.openPalmConfidence = target.isOpenPalm ? Math.min(5, (currentHand.openPalmConfidence || 0) + 1) : Math.max(0, (currentHand.openPalmConfidence || 0) - 1);
                currentHand.isOpenPalm = currentHand.openPalmConfidence >= 2;

                currentHand.isPinchTap = target.isPinchTap;
            }
        } else {
            // Hand not detected in this frame: use ghost grace period (prevent instant disappearing)
            currentHand.lostFrames = (currentHand.lostFrames || 0) + 1;
        }
    });

    // 3. Remove hands that have exceeded the ghost grace period and cleanup their persistent state
    trackedHands = trackedHands.filter(h => {
        if ((h.lostFrames || 0) >= maxGhostFrames) {
            persistentHandStates.delete(`hand_${h.id}`);
            return false;
        }
        return true;
    });

    // 4. Register new incoming targets that weren't matched
    activeTargets.forEach((target, j) => {
        if (!matchedTargets.has(j) && trackedHands.length < 2) {
            const usedIds = new Set(trackedHands.map(h => h.id));
            const newId = usedIds.has(0) ? 1 : 0;

            trackedHands.push({
                id: newId,
                lostFrames: 0,
                palm: { ...target.palm },
                wrist: { ...target.wrist },
                fingertips: target.fingertips.map(f => ({ ...f })),
                rawLandmarks: target.rawLandmarks ? target.rawLandmarks.map(lm => ({ ...lm })) : null,
                isFist: target.isFist,
                isOpenPalm: target.isOpenPalm,
                isShieldTouch: target.isShieldTouch,
                isPinchTap: target.isPinchTap,
                fistConfidence: target.isFist ? 3 : 0,
                shieldConfidence: target.isShieldTouch ? 3 : 0,
                openPalmConfidence: target.isOpenPalm ? 3 : 0
            });
        }
    });
}

// -------------------------------------------------------------
// Independent Render Loop
// -------------------------------------------------------------
function render() {
    const now = performance.now();
    const dtSeconds = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    dtScale = dtSeconds * 60;

    // 1. Render Background Video & Tint
    if (isCameraActive && videoElement.readyState >= 2 && camViewMode === 'fullscreen') {
        ctx.save();
        if (isMirrored) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const tintAlpha = camTintLevel / 10;
        ctx.fillStyle = `rgba(7, 9, 19, ${tintAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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

    updateHandTrackingInterpolation();

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
        p1 = { x: h1.palm.x * canvas.width, y: h1.palm.y * canvas.height };
        p2 = { x: h2.palm.x * canvas.width, y: h2.palm.y * canvas.height };
        const handDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);

        if (h1.isFist && h2.isFist && handDistance < 450 && dualFistState.cooldownTimer <= 0) {
            isDualFist = true;
            dualMidX = (p1.x + p2.x) / 2;
            dualMidY = (p1.y + p2.y) / 2;
        } else {
            // Giga Shield triggers naturally when 2 open palms or shield gestures are brought together
            const isH1Shield = h1.isOpenPalm || h1.isShieldTouch;
            const isH2Shield = h2.isOpenPalm || h2.isShieldTouch;
            if (isH1Shield && isH2Shield && !h1.isFist && !h2.isFist && handDistance < 550) {
                isDualShield = true;
                dualMidX = (p1.x + p2.x) / 2;
                dualMidY = (p1.y + p2.y) / 2;
            }
        }
    }

    // DUAL FIST GIGA BLACKHOLE
    if (isDualFist) {
        dualFistState.birthProgress = Math.min(1.0, dualFistState.birthProgress + 0.05 * dtScale);
        if (dualFistState.birthProgress >= 1.0) {
            dualFistState.charge = Math.min(1.0, dualFistState.charge + 0.004386 * dtScale);
        }
        
        drawGigaBlackhole(ctx, p1.x, p1.y, p2.x, p2.y, dualMidX, dualMidY, dualFistState.charge, dualFistState.birthProgress);

        if (dualFistState.birthProgress >= 0.8) {
            particles.forEach(p => {
                const dx = dualMidX - p.x;
                const dy = dualMidY - p.y;
                const distSq = dx * dx + dy * dy;
                if (distSq > 25 && distSq < 160000) {
                    const d = Math.sqrt(distSq);
                    const pull = (2.0 + dualFistState.charge * 3.0) * dtScale;
                    p.vx += (dx / d) * pull;
                    p.vy += (dy / d) * pull;
                }
            });
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
                triggerSupernovaExplosion(dualMidX || (canvas.width / 2), dualMidY || (canvas.height / 2), 2.2);
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

        const colors = PALETTES[activeColorPalette];
        let pState = getPersistentState(hand);
        if (!pState) return;

        if (pState.cooldownTimer > 0) {
            pState.cooldownTimer = Math.max(0, pState.cooldownTimer - dtSeconds);
        }

        // Pinch Tap Toggle State for Floating Cosmic Orb
        if (hand.isPinchTap && !pState.wasPinchTap) {
            pState.cosmicActive = !pState.cosmicActive;
        }
        pState.wasPinchTap = hand.isPinchTap;

        if (pState.cosmicActive) {
            pState.cosmicProgress = Math.min(1.0, pState.cosmicProgress + 0.08 * dtScale);
        } else {
            pState.cosmicProgress = Math.max(0, pState.cosmicProgress - 0.08 * dtScale);
        }

        if (pState.cosmicProgress > 0.01) {
            drawCosmicEnergyOrb(ctx, indexX, indexY, pState.cosmicProgress);
        }

        // DOCTOR STRANGE SHIELD: Activated when Index Tip & Middle Tip Touch!
        const isShieldActive = hand.isShieldTouch && !hand.isFist;
        if (isShieldActive && !isDualShield) {
            pState.shieldProgress = Math.min(1.0, pState.shieldProgress + 0.1 * dtScale);
        } else {
            pState.shieldProgress = Math.max(0, pState.shieldProgress - 0.08 * dtScale);
        }

        const hasActiveEffect = isDualFist || isDualShield || (hand.isFist && pState.cooldownTimer <= 0) || pState.shieldProgress > 0.1 || pState.fistCharge > 0 || pState.cosmicProgress > 0.1;

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
                particles.forEach(p => {
                    const dx = palmX - p.x;
                    const dy = palmY - p.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq > 25 && distSq < 160000) {
                        const d = Math.sqrt(distSq);
                        const pull = (1.2 + pState.fistCharge * 1.8) * dtScale;
                        p.vx += (dx / d) * pull;
                        p.vy += (dy / d) * pull;
                    }
                });
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

    if (camViewMode === 'pip') {
        drawMiniMonitor(ctx);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    shockwaves = shockwaves.filter(sw => {
        const alive = sw.update();
        if (alive) sw.draw(ctx);
        return alive;
    });
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
        results.multiHandLandmarks.forEach(landmarks => {
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
            const isShieldTouch = (normalizedTouchDist < 0.45 || fingerTouchDist < 0.08) && indexExt && middleExt && !isFist;

            // Pinch Gesture: Thumb Tip touches Index Tip
            const pinchDist = dist(thumbTip, indexTip);
            const normalizedPinchDist = pinchDist / handScale;
            const isPinchTap = (normalizedPinchDist < 0.38 || pinchDist < 0.07) && !isFist;

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

        statusBadge.className = 'badge success';
        statusText.textContent = `Tracking (${targetHandsList.length} Tangan)`;
    } else if (isCameraActive) {
        statusBadge.className = 'badge warning';
        statusText.textContent = 'Mencari Tangan...';
    }
}

// -------------------------------------------------------------
// DECOUPLED ASYNC MEDIAPIPE DETECTION LOOP (Crash-Proof & Watchdog Protected)
// -------------------------------------------------------------
let isProcessingTracking = false;
let lastTrackingStartTime = 0;

async function trackingLoop() {
    if (isCameraActive && videoElement.readyState >= 2 && handsDetector && videoElement.videoWidth > 0 && !videoElement.paused) {
        // Safety Watchdog: If previous send took more than 800ms, force unblock
        if (isProcessingTracking && performance.now() - lastTrackingStartTime > 800) {
            console.warn("MediaPipe send timeout detected, resetting lock.");
            isProcessingTracking = false;
        }

        if (!isProcessingTracking) {
            isProcessingTracking = true;
            lastTrackingStartTime = performance.now();
            try {
                // Keep correct aspect ratio for detection (only resize when changed)
                const targetH = Math.round(480 / ((videoElement.videoWidth / videoElement.videoHeight) || (16 / 9)));
                if (offCanvas.width !== 480 || offCanvas.height !== targetH) {
                    offCanvas.width = 480;
                    offCanvas.height = targetH;
                }

                offCtx.drawImage(videoElement, 0, 0, offCanvas.width, offCanvas.height);
                
                // Promise.race to guarantee send never hangs the browser loop
                await Promise.race([
                    handsDetector.send({ image: offCanvas }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("MediaPipe timeout")), 600))
                ]);
            } catch (err) {
                // Drop frame gracefully without stopping the loop
            } finally {
                isProcessingTracking = false;
            }
        }
    }
    if (isCameraActive) {
        setTimeout(trackingLoop, 30);
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

// Initialize MediaPipe Hands safely
function initMediaPipe() {
    if (typeof Hands === 'undefined') {
        setTimeout(initMediaPipe, 200);
        return;
    }
    try {
        handsDetector = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        handsDetector.setOptions({
            maxNumHands: 2,
            modelComplexity: 0,
            minDetectionConfidence: 0.3,
            minTrackingConfidence: 0.3
        });

        handsDetector.onResults(onHandResults);
        if (!isCameraActive) {
            statusBadge.className = 'badge info';
            statusText.textContent = 'Webcam Siap';
        }
    } catch (err) {
        console.error("Failed to init MediaPipe Hands:", err);
    }
}

// WebCam Initialization with Stream Recovery
async function toggleCamera() {
    if (isCameraActive) {
        if (webcamStream) {
            webcamStream.getTracks().forEach(track => track.stop());
            webcamStream = null;
        }
        videoElement.srcObject = null;
        isCameraActive = false;
        btnWebcam.querySelector('span').textContent = 'Aktifkan Webcam';
        btnWebcam.classList.remove('primary');
        btnWebcam.classList.add('secondary');
        statusBadge.className = 'badge info';
        statusText.textContent = 'Webcam Nonaktif';
    } else {
        if (!handsDetector) initMediaPipe();
        statusBadge.className = 'badge warning';
        statusText.textContent = 'Memulai Kamera...';

        try {
            webcamStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    frameRate: { ideal: 30, max: 30 },
                    facingMode: 'user'
                },
                audio: false
            });

            videoElement.muted = true;
            videoElement.playsInline = true;
            videoElement.srcObject = webcamStream;
            await videoElement.play();

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
            cameraStallCounter = 0;
            btnWebcam.querySelector('span').textContent = 'Matikan Webcam';
            btnWebcam.classList.remove('secondary');
            btnWebcam.classList.add('primary');

            statusBadge.className = 'badge warning';
            statusText.textContent = 'Mencari Tangan...';

            trackingLoop();
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
    const mouseX = e.clientX / canvas.width;
    const mouseY = e.clientY / canvas.height;

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
    } else if (e.button === 2) {
        // Right Click: Trigger Doctor Strange Shield
        mouseHand.isShieldTouch = !mouseHand.isShieldTouch;
    }
});

window.addEventListener('mouseup', (e) => {
    if (!enableMouseControl) return;
    if (e.button === 0) {
        mouseHand.isPinchTap = false;
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
        screenFlashColor = PALETTES[activeColorPalette][0];
        colorValDisplay.textContent = btn.dataset.color.toUpperCase();
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
});

btnMirror.addEventListener('click', () => {
    isMirrored = !isMirrored;
    btnMirror.classList.toggle('active', isMirrored);
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
    particles = [];
    shockwaves = [];
    if (mouseHand.trail) mouseHand.trail = [];
    trackedHands.forEach(h => { if (h.trail) h.trail = []; });
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
