import { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';
import type { BodyTrackingResult, DelegateMode, ModelQuality } from '../lib/types';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';
const MODELS_BASE = 'https://storage.googleapis.com/mediapipe-models';

export function useBodyTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isEnabled = true,
  quality: ModelQuality = 'full'
) {
  const [trackingResult, setTrackingResult] = useState<BodyTrackingResult>({
    poseLandmarks: null,
    poseWorldLandmarks: null,
    leftHandLandmarks: null,
    rightHandLandmarks: null,
    fps: 0,
    trackingQuality: 'OFF',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [delegate, setDelegate] = useState<DelegateMode>('GPU');

  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const frameCountRef = useRef(0);
  const lastFpsCalcRef = useRef(performance.now());

  // Initialize MediaPipe models
  const initTrackers = useCallback(async (preferredDelegate: DelegateMode) => {
    try {
      setIsLoading(true);
      setError(null);

      const vision = await FilesetResolver.forVisionTasks(WASM_URL);

      const poseModelPath = quality === 'full'
        ? `${MODELS_BASE}/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task`
        : `${MODELS_BASE}/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`;

      const pose = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: poseModelPath,
          delegate: preferredDelegate,
        },
        runningMode: 'VIDEO',
        numPoses: 1,
      });

      const hands = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${MODELS_BASE}/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: preferredDelegate,
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });

      poseLandmarkerRef.current = pose;
      handLandmarkerRef.current = hands;
      setDelegate(preferredDelegate);
      setIsLoading(false);
      console.log(`[MediaPipe] Models initialized with ${preferredDelegate} delegate`);
    } catch (err: any) {
      console.warn(`[MediaPipe] Failed to init with ${preferredDelegate} delegate:`, err);
      if (preferredDelegate === 'GPU') {
        console.log('[MediaPipe] Retrying initialization with CPU delegate...');
        return initTrackers('CPU');
      }
      setError(err?.message || 'Failed to initialize body tracking models.');
      setIsLoading(false);
    }
  }, [quality]);

  useEffect(() => {
    if (isEnabled) {
      initTrackers('GPU');
    }

    return () => {
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [isEnabled, initTrackers]);

  // Main Tracking Loop
  useEffect(() => {
    if (!isEnabled || isLoading || error) return;

    let isSubscribed = true;

    const processFrame = () => {
      if (!isSubscribed) return;

      const video = videoRef.current;
      if (
        video &&
        video.readyState >= 2 &&
        video.currentTime !== lastVideoTimeRef.current &&
        poseLandmarkerRef.current &&
        handLandmarkerRef.current
      ) {
        lastVideoTimeRef.current = video.currentTime;
        const timestamp = performance.now();

        try {
          const poseRes = poseLandmarkerRef.current.detectForVideo(video, timestamp);
          const handRes = handLandmarkerRef.current.detectForVideo(video, timestamp);

          let leftHand = null;
          let rightHand = null;

          if (handRes.handednesses && handRes.worldLandmarks) {
            for (let i = 0; i < handRes.handednesses.length; i++) {
              const label = handRes.handednesses[i][0]?.categoryName;
              // Note: MediaPipe returns flipped handedness for mirrored webcam
              if (label === 'Left') {
                leftHand = handRes.worldLandmarks[i];
              } else if (label === 'Right') {
                rightHand = handRes.worldLandmarks[i];
              }
            }
          }

          // Calculate FPS
          frameCountRef.current++;
          const now = performance.now();
          if (now - lastFpsCalcRef.current >= 1000) {
            const currentFps = Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcRef.current));
            frameCountRef.current = 0;
            lastFpsCalcRef.current = now;

            const poseLm = poseRes.landmarks?.[0] || null;
            const poseWorld = poseRes.worldLandmarks?.[0] || null;

            setTrackingResult({
              poseLandmarks: poseLm,
              poseWorldLandmarks: poseWorld,
              leftHandLandmarks: leftHand,
              rightHandLandmarks: rightHand,
              fps: currentFps,
              trackingQuality: poseLm ? 'HIGH' : 'OFF',
            });
          } else {
            const poseLm = poseRes.landmarks?.[0] || null;
            const poseWorld = poseRes.worldLandmarks?.[0] || null;

            setTrackingResult((prev) => ({
              ...prev,
              poseLandmarks: poseLm,
              poseWorldLandmarks: poseWorld,
              leftHandLandmarks: leftHand,
              rightHandLandmarks: rightHand,
              trackingQuality: poseLm ? prev.trackingQuality || 'HIGH' : 'OFF',
            }));
          }
        } catch (e) {
          console.error('[MediaPipe] Frame processing error:', e);
        }
      }

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      isSubscribed = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isEnabled, isLoading, error, videoRef]);

  return {
    trackingResult,
    isLoading,
    error,
    delegate,
  };
}
