export interface Landmark3D {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface Landmark2D {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface BodyTrackingResult {
  poseLandmarks: Landmark2D[] | null;
  poseWorldLandmarks: Landmark3D[] | null;
  leftHandLandmarks: Landmark3D[] | null;
  rightHandLandmarks: Landmark3D[] | null;
  fps: number;
  trackingQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'OFF';
}

export interface BoneAimConfig {
  boneName: string;
  childName: string;
  fromLandmarkIdx: number;
  toLandmarkIdx: number;
  weight?: number;
}

export interface ScaleFitResult {
  s: number; // uniform scale
  tx: number; // x offset
  ty: number; // y offset
}

export type DelegateMode = 'GPU' | 'CPU';
export type ModelQuality = 'full' | 'lite';
