import React, { useState } from 'react';
import {
  Camera,
  Shield,
  Maximize2,
  Eye,
  Cpu,
  Info,
  Sparkles,
  Zap,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import type { DelegateMode } from '../lib/types';

interface UIOverlayProps {
  fps: number;
  trackingQuality: string;
  delegate: DelegateMode;
  isSuitOn: boolean;
  isScaleLocked: boolean;
  showDebugLandmarks: boolean;
  hasPlate: boolean;
  countdown: number | null;
  scaleFactor: number;
  onCapturePlate: () => void;
  onToggleSuit: () => void;
  onToggleScaleLock: () => void;
  onToggleDebugLandmarks: () => void;
  onResetPlate: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
  fps,
  trackingQuality,
  delegate,
  isSuitOn,
  isScaleLocked,
  showDebugLandmarks,
  hasPlate,
  countdown,
  scaleFactor,
  onCapturePlate,
  onToggleSuit,
  onToggleScaleLock,
  onToggleDebugLandmarks,
  onResetPlate,
}) => {
  const [showInfoModal, setShowInfoModal] = useState(false);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-20">
      {/* Top Header HUD Bar */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center space-x-3 bg-neutral-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-red-500/30 shadow-lg shadow-red-950/20">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-red-600/40">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm tracking-wider uppercase bg-gradient-to-r from-red-400 via-blue-400 to-red-200 bg-clip-text text-transparent">
              Spider-Man React MoCap
            </h1>
            <p className="text-xs text-neutral-400 font-mono">
              MediaPipe Pose & Hands → R3F Mixamo Rig
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <div className="bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 text-neutral-300 flex items-center space-x-2">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span>{fps} FPS</span>
          </div>

          <div className="bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 text-neutral-300 flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>{delegate} Delegate</span>
          </div>

          <div
            className={`bg-neutral-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border ${
              trackingQuality === 'HIGH'
                ? 'border-emerald-500/40 text-emerald-400'
                : 'border-amber-500/40 text-amber-400'
            } flex items-center space-x-2`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{trackingQuality} TRACKING</span>
          </div>

          <button
            onClick={() => setShowInfoModal(true)}
            className="p-2 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-neutral-800 text-neutral-400 hover:text-white hover:border-red-500/50 transition-all pointer-events-auto"
            title="Algorithm Technical Breakdown"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Countdown overlay when capturing room plate */}
      {countdown !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-30">
          <div className="text-center animate-bounce">
            <span className="text-8xl font-black bg-gradient-to-br from-red-500 to-blue-500 bg-clip-text text-transparent drop-shadow-2xl">
              {countdown}
            </span>
            <h2 className="text-2xl font-bold text-white mt-4 uppercase tracking-widest">
              STEP OUT OF FRAME!
            </h2>
            <p className="text-neutral-400 text-sm mt-2 max-w-md">
              Capturing empty room background plate so Spider-Man can erase and replace you on camera.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Control Dock */}
      <div className="flex flex-col items-center pointer-events-auto space-y-3">
        {!hasPlate && (
          <div className="bg-amber-950/80 border border-amber-500/40 px-4 py-2 rounded-xl backdrop-blur-md text-amber-200 text-xs flex items-center space-x-2 animate-pulse">
            <Camera className="w-4 h-4 text-amber-400" />
            <span>Click <b>"Capture Plate"</b> or press <b>SPACEBAR</b> to erase yourself!</span>
          </div>
        )}

        <div className="bg-neutral-900/90 backdrop-blur-xl p-2 rounded-2xl border border-neutral-800 shadow-2xl flex items-center space-x-2">
          {/* Capture Plate Button */}
          <button
            onClick={onCapturePlate}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium text-xs transition-all shadow-md shadow-red-900/30 active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Capture Plate (Space)</span>
          </button>

          {/* Reset Plate */}
          {hasPlate && (
            <button
              onClick={onResetPlate}
              className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-all"
              title="Clear captured plate"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <div className="w-px h-6 bg-neutral-800" />

          {/* Suit Toggle */}
          <button
            onClick={onToggleSuit}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-xs transition-all active:scale-95 ${
              isSuitOn
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Suit: {isSuitOn ? 'ON' : 'OFF'} (S)</span>
          </button>

          {/* Lock Scale */}
          <button
            onClick={onToggleScaleLock}
            className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl font-medium text-xs transition-all active:scale-95 ${
              isScaleLocked
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
            }`}
          >
            <Maximize2 className="w-4 h-4" />
            <span>Scale: {isScaleLocked ? 'LOCKED' : `AUTO (${(scaleFactor * 100).toFixed(0)}%)`}</span>
          </button>

          {/* Debug Landmarks */}
          <button
            onClick={onToggleDebugLandmarks}
            className={`p-2.5 rounded-xl transition-all active:scale-95 ${
              showDebugLandmarks
                ? 'bg-purple-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
            }`}
            title="Toggle Debug Skeleton Landmarks (D)"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info Technical Breakdown Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 pointer-events-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 text-neutral-300 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-red-500" />
                <span>Motion Capture Architecture</span>
              </h2>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed">
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
                <h3 className="font-bold text-red-400 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-red-400" />
                  <span>1. Aim, Don't Copy (Retargeting Core)</span>
                </h3>
                <p>
                  Rotates bones so child vectors match measured human directions using precomputed rest quaternions. Prevents limb tearing across varying body proportions.
                </p>
              </div>

              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
                <h3 className="font-bold text-blue-400 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  <span>2. Torso 3-Axis Orthonormal Basis</span>
                </h3>
                <p>
                  Solves upper body twist and yaw using lateral & vertical vectors (`basisFrom`). Blends pelvis lateral axis with shoulders when hip confidence drops (desk/seated mode).
                </p>
              </div>

              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
                <h3 className="font-bold text-emerald-400 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>3. Closed-Form Least-Squares Scale Fit</span>
                </h3>
                <p>
                  Finds uniform scale <code className="text-emerald-300">s</code> and 2D offset <code className="text-emerald-300">t</code> landing 3D joints directly onto user landmarks with outlier rejection.
                </p>
              </div>

              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
                <h3 className="font-bold text-amber-400 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>4. Local Palm Frame Finger Retargeting</span>
                </h3>
                <p>
                  Fingers are solved in the local basis frame of the palm to ensure rotation independence from wrist orientation.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-blue-600 text-white font-semibold text-xs tracking-wider uppercase hover:opacity-90 transition-opacity"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
