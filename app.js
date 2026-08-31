// --- AETHERCAST: Interstellar Gargantua Blackhole & Hand Tracking Engine (Ultra Optimized) ---

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

// Application State
let activeColorPalette = 'cyan';
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
let screenFlashColor = '#00f2fe';

// Persistent State Tracking for Hands & Dual Fusions
let trackedHands = []; 
let targetHandsList = [];
let persistentHandStates = new Map();
let dualFistState = { wasDualFist: false, charge: 0, birthProgress: 0, cooldownTimer: 0 };

// Fallback Mouse Interaction State
let mouseHand = {
    isMouse: true,
    palm: { x: 0.5, y: 0.5 },
    fingertips: [
        { x: 0.5, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 0.5, y: 0.5 }
    ],
    isFist: false,
    isOpenPalm: true,
    isWristTwisted: true, // Activated for mouse mode
    isPinchTap: false,
    trail: []
};

// Color Palette Definitions
const PALETTES = {
    cyan: ['#00f2fe', '#4facfe', '#38bdf8', '#0284c7', '#ffffff'],
    gold: ['#ff0844', '#ffb199', '#f59e0b', '#fbbf24', '#ffffff'],
    purple: ['#b224ef', '#7579ff', '#c084fc', '#818cf8', '#ffffff'],
    emerald: ['#0ba360', '#3cba92', '#34d399', '#10b981', '#ffffff'],
    rainbow: ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#ec4899']
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
// GPU-Accelerated Batched Particle & Shockwave Engine
// -------------------------------------------------------------
class Particle {
    constructor() {
        this.reset();
    }

    reset(originX, originY, speedMultiplier = 1, fixedAngle = null) {
        this.x = originX !== undefined ? originX : Math.random() * canvas.width;
        this.y = originY !== undefined ? originY : Math.random() * canvas.height;
        
        const angle = fixedAngle !== null ? fixedAngle : Math.random() * Math.PI * 2;
        const speed = (Math.random() * 5 + 2) * speedMultiplier;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.size = Math.random() * 4.5 + 1.5;
        this.life = Math.random() * 0.7 + 0.4;
        this.maxLife = this.life;
        this.decay = Math.random() * 0.015 + 0.005;

        const colors = PALETTES[activeColorPalette];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.x += this.vx * dtScale;
        this.y += this.vy * dtScale;
        this.life -= this.decay * dtScale;

        this.vx *= Math.pow(0.98, dtScale);
        this.vy *= Math.pow(0.98, dtScale);

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
    constructor(x, y, maxRadius = 450, color = '#00f2fe', initialWidth = 16) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.maxRadius = maxRadius;
        this.color = color;
        this.alpha = 1;
        this.lineWidth = initialWidth;
    }

    update() {
        this.radius += 20 * dtScale;
        this.alpha = 1 - (this.radius / this.maxRadius);
        this.lineWidth *= Math.pow(0.93, dtScale);
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
    
    screenFlashAlpha = Math.min(0.65, 0.45 * intensity);
    screenFlashColor = colors[0];

    shockwaves.push(new Shockwave(x, y, 480 * intensity, colors[0], 20));
    shockwaves.push(new Shockwave(x, y, 340 * intensity, colors[1] || colors[0], 14));
    shockwaves.push(new Shockwave(x, y, 220 * intensity, '#ffffff', 8));

    const count = Math.floor(80 * intensity);
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const p = new Particle();
        p.reset(x, y, (Math.random() * 8 + 6) * intensity, angle);
        particles.push(p);
    }

    const maxRadiusSq = (400 * intensity) * (400 * intensity);
    particles.forEach(p => {
        const dx = p.x - x;
        const dy = p.y - y;
        const distSq = dx * dx + dy * dy;
        if (distSq < maxRadiusSq && distSq > 1) {
            const d = Math.sqrt(distSq);
            const force = (1 - d / (400 * intensity)) * 28 * intensity;
            p.vx += (dx / d) * force;
            p.vy += (dy / d) * force;
        }
    });
}

function getPersistentState(hand) {
    let bestKey = null;
    let minDist = 0.25;

    for (let [key, state] of persistentHandStates.entries()) {
        const d = dist(hand.wrist, state.lastWrist);
        if (d < minDist) {
            minDist = d;
            bestKey = key;
        }
    }

    if (!bestKey) {
        bestKey = 'hand_' + Math.random().toString(36).substr(2, 6);
    }

    let state = persistentHandStates.get(bestKey) || {
        lastWrist: hand.wrist,
        fistCharge: 0,
        birthProgress: 0,
        noFistDebounce: 0,
        cooldownTimer: 0,
        cosmicProgress: 0,
        cosmicActive: false,
        wasPinchTap: false,
        shieldProgress: 0
    };

    state.lastWrist = hand.wrist;
    persistentHandStates.set(bestKey, state);
    return state;
}

// -------------------------------------------------------------
// FLOATING COSMIC ENERGY ORB RENDERER
// -------------------------------------------------------------
let cosmicOrbRotation = 0;
function drawCosmicEnergyOrb(ctx, x, y, progress = 1.0) {
    if (progress <= 0.01) return;

    ctx.save();
    ctx.translate(x, y);
    cosmicOrbRotation += 0.05 * dtScale;

    const colors = PALETTES[activeColorPalette];
    const mainColor = colors[0];
    const secColor = colors[1] || colors[0];
    const accColor = colors[2] || '#ffffff';

    const radius = 28 * progress;

    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.5 * progress;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 12 + Math.sin(cosmicOrbRotation * 2) * 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = secColor;
    ctx.lineWidth = 1.5 * progress;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 22, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.rotate(cosmicOrbRotation);
    ctx.strokeStyle = accColor;
    ctx.lineWidth = 2 * progress;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.5, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(Math.PI / 2);
    ctx.strokeStyle = mainColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.5, radius * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = accColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.3, 0, Math.PI * 2);
    ctx.fillStyle = mainColor;
    ctx.globalAlpha = 0.45 * progress;
    ctx.fill();

    if (Math.random() < 0.6 && particles.length < targetParticleCount) {
        const a = Math.random() * Math.PI * 2;
        const r = radius * (1.1 + Math.random() * 0.5);
        const p = new Particle();
        p.reset(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.2);
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
// Doctor Strange Shield Renderer (With Smooth Scale Progress)
// -------------------------------------------------------------
let runeRotation = 0;
function drawDoctorStrangeShield(ctx, x, y, baseRadius = 125, progress = 1.0) {
    if (progress <= 0.01) return;

    ctx.save();
    ctx.translate(x, y);
    runeRotation += 0.025 * dtScale;

    const colors = PALETTES[activeColorPalette];
    const mainColor = colors[0];
    const secondaryColor = colors[1] || colors[0];

    const radius = baseRadius * progress;

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 3.5 * progress;

    ctx.beginPath();
    ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.rotate(-runeRotation * 0.8);
    ctx.setLineDash([10, 14]);
    ctx.lineWidth = 2 * progress;
    ctx.strokeStyle = secondaryColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(runeRotation);
    
    ctx.beginPath();
    ctx.rect(-radius * 0.6, -radius * 0.6, radius * 1.2, radius * 1.2);
    ctx.stroke();

    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = secondaryColor;
    ctx.beginPath();
    ctx.rect(-radius * 0.6, -radius * 0.6, radius * 1.2, radius * 1.2);
    ctx.stroke();

    ctx.rotate(Math.PI / 8);
    ctx.lineWidth = 1.5 * progress;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const rOuter = radius * 0.55;
        const rInner = radius * 0.25;
        const x1 = Math.cos(a) * rOuter;
        const y1 = Math.sin(a) * rOuter;
        const aNext = a + Math.PI / 8;
        const x2 = Math.cos(aNext) * rInner;
        const y2 = Math.sin(aNext) * rInner;
        if (i === 0) ctx.moveTo(x1, y1);
        else ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    if (Math.random() < 0.25 && particles.length < targetParticleCount) {
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkRadius = radius * (0.85 + Math.random() * 0.35);
        const pX = x + Math.cos(sparkAngle) * sparkRadius;
        const pY = y + Math.sin(sparkAngle) * sparkRadius;
        const spark = new Particle();
        spark.reset(pX, pY, 1.5);
        particles.push(spark);
    }

    ctx.restore();
}

// -------------------------------------------------------------
// GIGA DUAL-HAND DOCTOR STRANGE SHIELD ARRAY FUSION
// -------------------------------------------------------------
function drawGigaShield(ctx, x1, y1, x2, y2, midX, midY) {
    const radius = 185;
    const colors = PALETTES[activeColorPalette];
    const mainColor = colors[0];
    const secondaryColor = colors[1] || colors[0];

    ctx.save();
    
    ctx.save();
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(midX, midY);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();

    ctx.translate(midX, midY);
    runeRotation += 0.03 * dtScale;

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius + 15, 0, Math.PI * 2);
    ctx.setLineDash([12, 16]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = secondaryColor;
    ctx.stroke();

    ctx.save();
    ctx.rotate(runeRotation);
    ctx.lineWidth = 2;
    ctx.strokeStyle = mainColor;

    for (let k = 0; k < 3; k++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.rect(-radius * 0.55, -radius * 0.55, radius * 1.1, radius * 1.1);
        ctx.stroke();
    }

    ctx.rotate(Math.PI / 12);
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const rOuter = radius * 0.5;
        const rInner = radius * 0.22;
        const px = Math.cos(a) * rOuter;
        const py = Math.sin(a) * rOuter;
        const aNext = a + Math.PI / 6;
        const px2 = Math.cos(aNext) * rInner;
        const py2 = Math.sin(aNext) * rInner;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        ctx.lineTo(px2, py2);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    if (particles.length < targetParticleCount) {
        for (let b = 0; b < 2; b++) {
            const a = Math.random() * Math.PI * 2;
            const r = radius * (0.8 + Math.random() * 0.4);
            const p = new Particle();
            p.reset(midX + Math.cos(a) * r, midY + Math.sin(a) * r, 2);
            particles.push(p);
        }
    }

    ctx.restore();
}

// -------------------------------------------------------------
// CINEMATIC INTERSTELLAR (GARGANTUA) BLACKHOLE RENDERER
// -------------------------------------------------------------
let blackholeRotation = 0;
function drawBlackhole(ctx, x, y, chargeRatio = 0, birthProgress = 1.0) {
    ctx.save();
    ctx.translate(x, y);
    blackholeRotation += 0.04 * dtScale;

    const colors = PALETTES[activeColorPalette];
    const mainColor = colors[0];
    const secColor = colors[1] || colors[0];
    const accColor = colors[2] || '#ffffff';

    const baseRadius = 45 * Math.min(1.0, birthProgress * 1.2);
    const currentRadius = baseRadius + chargeRatio * 40;

    // 1. Accretion Disk - Back Lensing Arc
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = (6 + chargeRatio * 4) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, currentRadius * 1.6, currentRadius * 0.48, blackholeRotation * 0.2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = secColor;
    ctx.lineWidth = (3 + chargeRatio * 2) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, currentRadius * 0.48, currentRadius * 1.55, -blackholeRotation * 0.15, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
        const a = blackholeRotation + (i * Math.PI * 2 / 3);
        ctx.strokeStyle = accColor;
        ctx.lineWidth = 2 * birthProgress;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius * 1.25, a, a + Math.PI / 3);
        ctx.stroke();
    }
    ctx.restore();

    // 2. Pitch-Black Event Horizon Void
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();

    // 3. Photon Sphere Ring & Front Accretion Belt
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5 * birthProgress;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 3.5 * birthProgress;
    ctx.beginPath();
    ctx.arc(0, 0, currentRadius + 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = mainColor;
    ctx.lineWidth = (5 + chargeRatio * 3) * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, currentRadius * 1.7, currentRadius * 0.35, 0.15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 * birthProgress;
    ctx.beginPath();
    ctx.ellipse(0, 0, currentRadius * 1.5, currentRadius * 0.25, 0.15, 0, Math.PI * 2);
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

    const pipW = 280;
    const pipH = 175;
    const pipX = canvas.width - pipW - 20;
    const pipY = canvas.height - pipH - 20;
    const radius = 14;

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
    ctx.fillRect(pipX + 10, pipY + 10, 140, 26);
    ctx.borderRadius = 12;
    ctx.fillStyle = '#34d399';
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.fillText(`● WEBCAM MONITOR`, pipX + 18, pipY + 27);
    ctx.restore();
}

// -------------------------------------------------------------
// Smooth Hand Interpolation
// -------------------------------------------------------------
function updateHandTrackingInterpolation() {
    if (targetHandsList.length === 0) {
        trackedHands = [];
        return;
    }

    if (trackedHands.length !== targetHandsList.length) {
        trackedHands = targetHandsList.map(h => ({
            wrist: { ...h.wrist },
            palm: { ...h.palm },
            fingertips: h.fingertips.map(f => ({ ...f })),
            rawLandmarks: h.rawLandmarks,
            isFist: h.isFist,
            isOpenPalm: h.isOpenPalm,
            isWristTwisted: h.isWristTwisted,
            isPinchTap: h.isPinchTap
        }));
    } else {
        targetHandsList.forEach((targetHand, i) => {
            const currentHand = trackedHands[i];
            if (!currentHand) return;

            const lerpAmt = 0.35;
            currentHand.palm.x = lerp(currentHand.palm.x, targetHand.palm.x, lerpAmt);
            currentHand.palm.y = lerp(currentHand.palm.y, targetHand.palm.y, lerpAmt);
            currentHand.wrist.x = lerp(currentHand.wrist.x, targetHand.wrist.x, lerpAmt);
            currentHand.wrist.y = lerp(currentHand.wrist.y, targetHand.wrist.y, lerpAmt);

            currentHand.isFist = targetHand.isFist;
            currentHand.isOpenPalm = targetHand.isOpenPalm;
            currentHand.isWristTwisted = targetHand.isWristTwisted;
            currentHand.isPinchTap = targetHand.isPinchTap;
            currentHand.rawLandmarks = targetHand.rawLandmarks;

            if (targetHand.fingertips) {
                targetHand.fingertips.forEach((tip, idx) => {
                    if (currentHand.fingertips[idx]) {
                        currentHand.fingertips[idx].x = lerp(currentHand.fingertips[idx].x, tip.x, lerpAmt);
                        currentHand.fingertips[idx].y = lerp(currentHand.fingertips[idx].y, tip.y, lerpAmt);
                    }
                });
            }
        });
    }
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
        } else if (h1.isOpenPalm && h2.isOpenPalm && h1.isWristTwisted && h2.isWristTwisted && handDistance < 500) {
            isDualShield = true;
            dualMidX = (p1.x + p2.x) / 2;
            dualMidY = (p1.y + p2.y) / 2;
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

        if (pState.cooldownTimer > 0) {
            pState.cooldownTimer = Math.max(0, pState.cooldownTimer - dtSeconds);
        }

        // Pinch Tap Toggle State
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

        // DOCTOR STRANGE SHIELD TRIGGER REQUIREMENT: Open Palm AND Wrist Twist Rotation (90°)!
        const isShieldActive = hand.isOpenPalm && hand.isWristTwisted && !hand.isFist;
        if (isShieldActive && !isDualShield) {
            pState.shieldProgress = Math.min(1.0, pState.shieldProgress + 0.08 * dtScale);
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

        // INDIVIDUAL DOCTOR STRANGE SHIELD (Triggers ONLY when Wrist is Twisted 90°!)
        if (!isDualShield && pState.shieldProgress > 0.01) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            drawDoctorStrangeShield(ctx, palmX, palmY, 125, pState.shieldProgress);
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
// MediaPipe Detection Results (With Wrist Twist 90° Detection)
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
            const indexMcp = getCoord(landmarks[5]);
            const middleTip = getCoord(landmarks[12]);
            const middlePip = getCoord(landmarks[10]);
            const ringTip = getCoord(landmarks[16]);
            const ringPip = getCoord(landmarks[14]);
            const pinkyTip = getCoord(landmarks[20]);
            const pinkyPip = getCoord(landmarks[18]);
            const pinkyMcp = getCoord(landmarks[17]);
            const palmCenter = getCoord(landmarks[9]);

            const indexExt = dist(indexTip, wrist) > dist(indexPip, wrist) * 1.08;
            const middleExt = dist(middleTip, wrist) > dist(middlePip, wrist) * 1.08;
            const ringExt = dist(ringTip, wrist) > dist(ringPip, wrist) * 1.08;
            const pinkyExt = dist(pinkyTip, wrist) > dist(pinkyPip, wrist) * 1.08;

            const extendedCount = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;

            const isFist = !indexExt && !middleExt && !ringExt && !pinkyExt;
            const isOpenPalm = extendedCount >= 2 && !isFist;

            // WRIST TWIST ROTATION DETECTION (90° Rotation Angle Check)
            const dxMcp = indexMcp.x - pinkyMcp.x;
            const dyMcp = indexMcp.y - pinkyMcp.y;
            const mcpAngle = Math.atan2(dyMcp, dxMcp); // Angle of knuckles line
            
            // Standard upright palm has mcpAngle near 0 or PI. Twisted palm has mcpAngle tilted (> 35 degrees / 0.6 rad)
            const isWristTwisted = Math.abs(Math.sin(mcpAngle)) > 0.45;

            const pinchDist = dist(thumbTip, indexTip);
            const isPinchTap = pinchDist < 0.065 && !isFist;

            targetHandsList.push({
                wrist,
                palm: palmCenter,
                fingertips: [thumbTip, indexTip, middleTip, ringTip, pinkyTip],
                rawLandmarks: landmarks,
                isFist,
                isOpenPalm,
                isWristTwisted,
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
// DECOUPLED ASYNC MEDIAPIPE DETECTION LOOP
// -------------------------------------------------------------
let isProcessingTracking = false;
async function trackingLoop() {
    if (isCameraActive && videoElement.readyState >= 2 && handsDetector) {
        if (!isProcessingTracking) {
            isProcessingTracking = true;
            try {
                offCtx.drawImage(videoElement, 0, 0, 480, 270);
                await handsDetector.send({ image: offCanvas });
            } catch (err) {
                console.warn("Tracking error:", err);
            }
            isProcessingTracking = false;
        }
    }
    if (isCameraActive) {
        setTimeout(trackingLoop, 25);
    }
}

// Initialize MediaPipe Hands
function initMediaPipe() {
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
    } catch (err) {
        console.error("Failed to init MediaPipe Hands:", err);
    }
}

// WebCam Initialization
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
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });

            videoElement.srcObject = webcamStream;
            await videoElement.play();

            isCameraActive = true;
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

// Mouse Control Listener
window.addEventListener('mousemove', (e) => {
    if (!enableMouseControl) return;
    const mouseX = e.clientX / canvas.width;
    const mouseY = e.clientY / canvas.height;

    mouseHand.palm = { x: mouseX, y: mouseY };
    mouseHand.fingertips = [
        { x: mouseX - 0.02, y: mouseY - 0.02 },
        { x: mouseX, y: mouseY },
        { x: mouseX + 0.02, y: mouseY - 0.02 },
        { x: mouseX + 0.03, y: mouseY },
        { x: mouseX + 0.04, y: mouseY + 0.02 }
    ];
});

window.addEventListener('mousedown', () => {
    if (!enableMouseControl) return;
    mouseHand.isPinchTap = true;
});

window.addEventListener('mouseup', () => {
    if (!enableMouseControl) return;
    mouseHand.isPinchTap = false;
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

// Start App
initMediaPipe();
render();
