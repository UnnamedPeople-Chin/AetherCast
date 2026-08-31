# 🕸️ Spider-Man Motion Capture in React

Browser-based full-body and hand motion capture in React inspired by Avi Vashishta's blog post (*"Turning Yourself Into Spider-Man in React"*). It tracks 33 body landmarks and 42 hand landmarks from your webcam, retargets them in real-time onto a Mixamo-rigged Spider-Man 3D character in React Three Fiber (R3F), and composites the character over an empty room background plate so Spider-Man erases and replaces you on camera.

---

## ⚡ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **3D Graphics**: Three.js + `@react-three/fiber` + `@react-three/drei`
- **Machine Learning & Vision**: `@mediapipe/tasks-vision` (`PoseLandmarker` & `HandLandmarker`)
- **Styling & UI**: Tailwind CSS v4 + `lucide-react` + `canvas-confetti`

---

## 📐 Mathematical Retargeting Pipeline

1. **Aim, Don't Copy (`aimBone`)**:
   Rotates bones so child vectors align with measured human directions using precomputed rest quaternions, preventing limb tearing across varying body proportions.
2. **Torso 3-Axis Orthonormal Basis (`basisFrom`)**:
   Solves upper body twist and yaw using lateral & vertical vectors. Blends pelvis lateral axis with shoulders when hip confidence drops (desk/seated mode).
3. **Closed-Form Least-Squares Scale Fit (`solveLeastSquares`)**:
   Finds uniform scale $s$ and 2D offset $t$ landing 3D joints directly onto user landmarks with outlier rejection.
4. **Local Palm Frame Finger Retargeting**:
   Fingers are solved in the local basis frame of the palm to ensure rotation independence from wrist orientation.
5. **1-Euro Adaptive Speed Filter**:
   Speed-sensitive exponential smoothing to eliminate jitter at rest while staying lag-free during fast motion.

---

## 🎮 Controls & Keyboard Shortcuts

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>SPACEBAR</kbd> | **Capture Plate** | Starts 3-second countdown to capture empty room background plate |
| <kbd>S</kbd> | **Toggle Suit** | Turns Spider-Man suit layer ON or OFF |
| <kbd>L</kbd> | **Toggle Scale Lock** | Freezes current scale factor while translation keeps tracking |
| <kbd>D</kbd> | **Debug Landmarks** | Toggles green skeleton landmarks overlay |

---

## 🚀 Running Locally

```bash
# 1. Navigate to project folder
cd Spiderman

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```
