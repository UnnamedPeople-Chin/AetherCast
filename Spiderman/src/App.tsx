import { useRef, useState, useEffect, useCallback } from 'react';
import { useBodyTracking } from './hooks/useBodyTracking';
import { CompositeCanvas } from './components/CompositeCanvas';
import { UIOverlay } from './components/UIOverlay';
import confetti from 'canvas-confetti';

export function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // App States
  const [plateCanvas, setPlateCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isSuitOn, setIsSuitOn] = useState(true);
  const [isScaleLocked, setIsScaleLocked] = useState(false);
  const [showDebugLandmarks, setShowDebugLandmarks] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [scaleFactor, setScaleFactor] = useState(1.0);

  // Initialize Body & Hand Tracking Hook
  const { trackingResult, isLoading: isModelLoading, error: trackingError, delegate } = useBodyTracking(
    videoRef,
    isCameraReady,
    'full'
  );

  // Initialize Webcam Stream
  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsCameraReady(true);
          };
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraError('Failed to access webcam. Please ensure camera permissions are granted.');
      }
    }

    setupCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Background Plate Capture Handler with 3s countdown
  const handleStartPlateCapture = useCallback(() => {
    if (countdown !== null) return;
    setCountdown(3);
  }, [countdown]);

  // Countdown timer logic
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 0) {
      // Capture frame from video element to offscreen canvas
      const video = videoRef.current;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setPlateCanvas(canvas);
          setIsSuitOn(true);

          // Web shooter celebratory confetti effect
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ef4444', '#3b82f6', '#ffffff'],
          });
        }
      }
      setCountdown(null);
    }
  }, [countdown]);

  const handleResetPlate = () => {
    setPlateCanvas(null);
  };

  const handleToggleSuit = useCallback(() => {
    setIsSuitOn((prev) => !prev);
  }, []);

  const handleToggleScaleLock = useCallback(() => {
    setIsScaleLocked((prev) => !prev);
  }, []);

  const handleToggleDebug = useCallback(() => {
    setShowDebugLandmarks((prev) => !prev);
  }, []);

  // Keyboard Shortcuts (Space: Capture Plate, S: Suit, L: Lock, D: Debug)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleStartPlateCapture();
      } else if (e.key === 's' || e.key === 'S') {
        handleToggleSuit();
      } else if (e.key === 'l' || e.key === 'L') {
        handleToggleScaleLock();
      } else if (e.key === 'd' || e.key === 'D') {
        handleToggleDebug();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartPlateCapture, handleToggleSuit, handleToggleScaleLock, handleToggleDebug]);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative flex flex-col font-sans">
      {/* Hidden Raw HTML Video Stream Element */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute w-1 h-1 opacity-0 pointer-events-none"
      />

      {/* Loading & Error Screens */}
      {(!isCameraReady || isModelLoading || cameraError || trackingError) && (
        <div className="absolute inset-0 z-50 bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-red-600 to-blue-600 flex items-center justify-center animate-bounce shadow-xl shadow-red-600/30 mb-6">
            <span className="text-2xl">🕸️</span>
          </div>

          {cameraError || trackingError ? (
            <div className="bg-red-950/80 border border-red-500/40 text-red-200 p-6 rounded-2xl max-w-md">
              <h3 className="font-bold text-lg mb-2">Setup Error</h3>
              <p className="text-xs">{cameraError || trackingError}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-white font-bold text-xl uppercase tracking-widest bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
                Loading Spider-Man Motion Capture
              </h2>
              <p className="text-neutral-400 text-xs font-mono">
                Initializing MediaPipe Pose & Hand Landmarkers (GPU Delegate)...
              </p>
              <div className="w-48 h-1.5 bg-neutral-800 rounded-full mx-auto overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-red-500 to-blue-500 animate-pulse" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Viewport Compositor */}
      <CompositeCanvas
        videoRef={videoRef}
        plateImage={plateCanvas}
        isSuitOn={isSuitOn}
        isScaleLocked={isScaleLocked}
        showDebugLandmarks={showDebugLandmarks}
        poseLandmarks={trackingResult.poseLandmarks}
        poseWorldLandmarks={trackingResult.poseWorldLandmarks}
        leftHandLandmarks={trackingResult.leftHandLandmarks}
        rightHandLandmarks={trackingResult.rightHandLandmarks}
        onPoseUpdate={(s) => setScaleFactor(s)}
      />

      {/* Futuristic UI HUD Overlay */}
      <UIOverlay
        fps={trackingResult.fps}
        trackingQuality={trackingResult.trackingQuality}
        delegate={delegate}
        isSuitOn={isSuitOn}
        isScaleLocked={isScaleLocked}
        showDebugLandmarks={showDebugLandmarks}
        hasPlate={plateCanvas !== null}
        countdown={countdown}
        scaleFactor={scaleFactor}
        onCapturePlate={handleStartPlateCapture}
        onToggleSuit={handleToggleSuit}
        onToggleScaleLock={handleToggleScaleLock}
        onToggleDebugLandmarks={handleToggleDebug}
        onResetPlate={handleResetPlate}
      />
    </div>
  );
}

export default App;
