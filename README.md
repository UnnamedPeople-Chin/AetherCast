<p align="center">
  <img src="Assets/logo.svg" alt="AetherCast Logo" width="180"/>
</p>

<h1 align="center">AETHERCAST</h1>

<p align="center">
  <strong>Real-Time Hand-Tracking Sandbox & Particle Physics Engine</strong><br>
  Interactive gesture-driven visual spellcasting powered by MediaPipe Hands, HTML5 Canvas 2D, and Electron.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FPS-144%2B%20Uncapped-00f3ff?style=for-the-badge&logo=speedtest&logoColor=black" alt="FPS"/>
  <img src="https://img.shields.io/badge/MediaPipe-Hands%2021%20Landmarks-ff0077?style=for-the-badge&logo=google&logoColor=white" alt="MediaPipe"/>
  <img src="https://img.shields.io/badge/Platform-Electron%20%7C%20Web-a855f7?style=for-the-badge&logo=electron&logoColor=white" alt="Platform"/>
  <img src="https://img.shields.io/badge/License-MIT-ffd700?style=for-the-badge" alt="License"/>
</p>

---

## 🌟 Visual Preview

<p align="center">
  <img src="Assets/banner_preview.svg" alt="AetherCast Showcase Preview" width="100%"/>
</p>

AetherCast transforms standard webcam video into a responsive, high-performance visual sandbox. By decoupling hand tracking from canvas rendering, the engine tracks 21 distinct 3D hand joints and computes complex particle physics, procedural black holes, and mandala shields at up to 144+ FPS without frame drops.

---

## 🖐️ Gesture System & Visual Effects

| Gesture | Visual Effect | Mechanics & Trigger Parameters |
|---|---|---|
| **Fist (Closed Hand)** | **Gargantua Blackhole** | Pitch-black event horizon void (`#000000`) surrounded by rotating gravitational accretion rings. 3.8-second full charge duration; requires at least 50% charge to trigger a supernova explosion when opening the fist. Features a 3.0-second cooldown delay. |
| **Open Palm + 90° Wrist Rotation** | **Doctor Strange Mandala Shield** | Concentric rotating sacred geometry runes with ancient glyphs and spark emitters. Requires a deliberate 90° wrist twist to prevent accidental triggers during natural hand resting. |
| **Thumb & Index Pinch Tap** | **Floating Cosmic Energy Orb** | Awakens a persistent plasma orb above the index fingertip. Follows hand movement continuously on either the left or right hand. |
| **Hand Flick / Receiver Pinch** | **Inter-Hand Orb Throw & Transfer** | Launches the cosmic orb across the screen as a homing plasma comet in a parabolic arc, complete with a stardust trail and dynamic locking onto the opposite index fingertip. |
| **Dual Fists Close Together** | **Supermassive Giga Blackhole** | Pure procedural vector physics: upper and lower relativistic Einstein gravitational lensing arcs, three differential counter-rotating accretion vortex rings, undulating solar prominence plasma loops, and high-voltage lightning arcs bridging both fists. |
| **Dual Palms Close Together** | **Multiverse Giga Shield Array** | Merges both shields into an expansive concentric mandala barricade. |

---

## ⚙️ Architecture & Performance Optimizations

AetherCast is engineered for high framerates on consumer hardware with standard webcams:

1. **Decoupled Offscreen Tracking Loop (480x270)**:
   MediaPipe AI inference executes on a downsampled 480x270 offscreen buffer. WASM inference latency drops to ~7ms per frame, leaving the main rendering thread completely unblocked to deliver 60–144+ FPS.
2. **Batched GPU Draw Calls**:
   Over 500 active particles and spark emitters are aggregated into 4–5 batched canvas paths per frame rather than hundreds of individual `beginPath()` and `stroke()` invocations.
3. **Delta-Time Physics Normalization**:
   All velocities—accretion ring rotation speeds, gravitational particle suction, and projectile trajectories—are normalized against frame delta time (`dt / 16.67ms`), ensuring identical physics behavior across 60Hz, 120Hz, and 144Hz monitors.
4. **Single-Authority Orb State Machine**:
   Inter-hand projectile transfer is coordinated through a single authoritative state (`activeCosmicHandId`), eliminating duplicate or orphaned orbs during rapid multi-hand gestures.
5. **100% Procedural Vector Rendering**:
   The Giga Blackhole is drawn using pure Canvas 2D vector mathematics (elliptical arcs, radial shadow gradients, and differential line dash intervals). This avoids rectangular texture clipping and maintains razor-sharp visuals at all display resolutions.

---

## 🎛️ Control Panel & Customization

The interface includes a compact glassmorphic control overlay:

- **Neon Color Palettes**: Choose from 5 preset themes (`Cyber Cyan`, `Solar Gold`, `Arcane Purple`, `Emerald Spark`, and `Prismatic Rainbow`). The palette is randomized on startup.
- **Particle Density Slider**: Adjusts active particle count between 100 and 1,500 particles.
- **Webcam Darkness Slider**: Regulates webcam video opacity (from 0% transparent to 100% black) to highlight particle contrast.
- **Glow & Spark Radius**: Adjusts the scale of particle bloom and spark bursts.
- **Energy Skeleton Toggle**: Renders real-time neon bone vectors connecting all 21 hand landmarks.
- **Webcam Toggle**: Switches off the webcam feed and replaces it with a clean cosmic space background.
- **Mouse & Touch Fallback**: Provides particle attraction and gravitational control via cursor or touchscreen when no webcam is active.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (version 16 or later)
- A working webcam

### Option 1: Desktop Application (Electron)
```bash
# 1. Clone the repository
git clone https://github.com/UnnamedPeople-Chin/AetherCast.git
cd AetherCast

# 2. Install dependencies
npm install

# 3. Launch the desktop app
npm start
```

### Option 2: Browser (Local HTTP Server)
Because MediaPipe requires a secure context for camera access, serve the project files via local HTTP:
```bash
# Using Python
python -m http.server 8080

# Or using npx serve
npx serve .
```
Then open `http://localhost:8080` in Chrome, Edge, or Brave.

---

## 📁 Repository Structure

```text
AetherCast/
├── Assets/
│   ├── logo.svg              # Vector logo (Cyberpunk neon mark)
│   ├── banner_preview.svg    # High-resolution showcase banner
│   └── shield_mandala.png    # Ancient mandala shield texture
├── app.js                    # Core engine: tracking, physics, canvas rendering, gesture logic
├── index.html                # DOM structure, canvas overlay, and glassmorphic UI
├── style.css                 # Glassmorphic styling, typography, and responsive layout
├── main.js                   # Electron desktop window lifecycle
├── package.json              # Project dependencies and start scripts
└── README.md                 # Project documentation
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Developed with precision by **UnnamedPeople-Chin**.
