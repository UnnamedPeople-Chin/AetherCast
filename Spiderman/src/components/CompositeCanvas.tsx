import React, { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { SpidermanModel } from './SpidermanModel';
import type { Landmark3D, Landmark2D } from '../lib/types';
import { POSE } from '../lib/retargeting';

interface CompositeCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  plateImage: HTMLCanvasElement | null;
  isSuitOn: boolean;
  isScaleLocked: boolean;
  showDebugLandmarks: boolean;
  poseLandmarks: Landmark2D[] | null;
  poseWorldLandmarks: Landmark3D[] | null;
  leftHandLandmarks: Landmark3D[] | null;
  rightHandLandmarks: Landmark3D[] | null;
  onPoseUpdate?: (scale: number, tx: number, ty: number) => void;
}

export const CompositeCanvas: React.FC<CompositeCanvasProps> = ({
  videoRef,
  plateImage,
  isSuitOn,
  isScaleLocked,
  showDebugLandmarks,
  poseLandmarks,
  poseWorldLandmarks,
  leftHandLandmarks,
  rightHandLandmarks,
  onPoseUpdate,
}) => {
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null!);
  const r3fCanvasContainerRef = useRef<HTMLDivElement>(null!);

  // Perspective camera distance matching article formula
  const FOV = 45;
  const cameraD = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  // Continuous 2D Canvas Compositing Render Loop
  useEffect(() => {
    let animId: number;

    const renderComposite = () => {
      const canvas = compositeCanvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState < 2) {
        animId = requestAnimationFrame(renderComposite);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.save();
      // Single-pass horizontal reflection for mirroring all 3 layers uniformly
      ctx.setTransform(-1, 0, 0, 1, w, 0);
      ctx.clearRect(0, 0, w, h);

      // Layer 1: Live Video Feed
      ctx.drawImage(video, 0, 0, w, h);

      if (isSuitOn) {
        // Layer 2: Empty Room Background Plate (Erases user from background)
        if (plateImage) {
          ctx.drawImage(plateImage, 0, 0, w, h);
        }

        // Layer 3: 3D Spider-Man WebGL Canvas
        const webglCanvas = r3fCanvasContainerRef.current?.querySelector('canvas');
        if (webglCanvas) {
          ctx.drawImage(webglCanvas, 0, 0, w, h);
        }
      }

      // Optional Debug Layer: Green Skeleton Dots Overlay
      if (showDebugLandmarks && poseLandmarks) {
        ctx.fillStyle = '#00ff66';
        ctx.strokeStyle = 'rgba(0, 255, 102, 0.6)';
        ctx.lineWidth = 3;

        // Draw connections
        const connections = [
          [POSE.LEFT_SHOULDER, POSE.RIGHT_SHOULDER],
          [POSE.LEFT_SHOULDER, POSE.LEFT_ELBOW],
          [POSE.LEFT_ELBOW, POSE.LEFT_WRIST],
          [POSE.RIGHT_SHOULDER, POSE.RIGHT_ELBOW],
          [POSE.RIGHT_ELBOW, POSE.RIGHT_WRIST],
          [POSE.LEFT_SHOULDER, POSE.LEFT_HIP],
          [POSE.RIGHT_SHOULDER, POSE.RIGHT_HIP],
          [POSE.LEFT_HIP, POSE.RIGHT_HIP],
          [POSE.LEFT_HIP, POSE.LEFT_KNEE],
          [POSE.LEFT_KNEE, POSE.LEFT_ANKLE],
          [POSE.RIGHT_HIP, POSE.RIGHT_KNEE],
          [POSE.RIGHT_KNEE, POSE.RIGHT_ANKLE],
        ];

        for (const [startIdx, endIdx] of connections) {
          const p1 = poseLandmarks[startIdx];
          const p2 = poseLandmarks[endIdx];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x * w, p1.y * h);
            ctx.lineTo(p2.x * w, p2.y * h);
            ctx.stroke();
          }
        }

        // Draw joints
        for (const lm of poseLandmarks) {
          if (lm && lm.x >= 0 && lm.x <= 1) {
            ctx.beginPath();
            ctx.arc(lm.x * w, lm.y * h, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();

      animId = requestAnimationFrame(renderComposite);
    };

    animId = requestAnimationFrame(renderComposite);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [videoRef, plateImage, isSuitOn, showDebugLandmarks, poseLandmarks]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden select-none">
      {/* Hidden R3F 3D WebGL Canvas Layer */}
      <div
        ref={r3fCanvasContainerRef}
        className="absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none"
      >
        <Canvas
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <PerspectiveCamera makeDefault fov={FOV} position={[0, 0, cameraD]} near={0.02} />
          <ambientLight intensity={1.2} />
          <directionalLight position={[2, 4, 5]} intensity={2.0} castShadow />
          <pointLight position={[-2, 1, 2]} intensity={1.5} color="#4488ff" />
          <SpidermanModel
            poseLandmarks={poseLandmarks}
            poseWorldLandmarks={poseWorldLandmarks}
            leftHandLandmarks={leftHandLandmarks}
            rightHandLandmarks={rightHandLandmarks}
            isScaleLocked={isScaleLocked}
            onPoseUpdate={onPoseUpdate}
          />
        </Canvas>
      </div>

      {/* Main Composited 2D Output Viewport Canvas */}
      <canvas
        ref={compositeCanvasRef}
        className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl shadow-2xl border border-red-950/40"
      />
    </div>
  );
};
