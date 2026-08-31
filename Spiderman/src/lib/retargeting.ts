import * as THREE from 'three';
import type { Landmark3D } from './types';

// MediaPipe Pose Landmark Indices (Standard 33 Body Landmarks)
export const POSE = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// MediaPipe Hand Landmark Indices (21 points per hand)
export const HAND = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

/** Convert MediaPipe 3D landmark to Three.js coordinates (x-right, y-up, z-forward out of camera) */
export function mpToThreeVector(lm: Landmark3D, out: THREE.Vector3): THREE.Vector3 {
  return out.set(lm.x, -lm.y, -lm.z);
}

/** Construct an orthonormal frame matrix from lateral (left) and vertical (up) vectors */
export function basisFrom(left: THREE.Vector3, up: THREE.Vector3, outMat: THREE.Matrix4): THREE.Matrix4 {
  const u = up.clone().normalize();
  const f = left.clone().cross(u).normalize(); // forward = left x up
  const l = u.clone().cross(f).normalize();    // re-orthogonalized left
  return outMat.makeBasis(l, u, f);
}

/** Cache structure for rig rest poses */
export class RestPoseCache {
  restWorld = new Map<THREE.Bone, THREE.Quaternion>();
  restChildDir = new Map<THREE.Bone, THREE.Vector3>();
  restLocal = new Map<THREE.Bone, THREE.Quaternion>();
  restWorldInv = new Map<THREE.Bone, THREE.Quaternion>();
  boneByName = new Map<string, THREE.Bone>();
  restPalmLeft = new THREE.Matrix4();
  restPalmRight = new THREE.Matrix4();
  restPelvisInv = new THREE.Matrix4();
  restChestInv = new THREE.Matrix4();
  restHeadInv = new THREE.Matrix4();

  /** Precompute rest quaternions and child directions on mount */
  public analyzeRig(root: THREE.Object3D) {
    this.restWorld.clear();
    this.restChildDir.clear();
    this.restLocal.clear();
    this.restWorldInv.clear();
    this.boneByName.clear();

    root.updateMatrixWorld(true);

    root.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        const bone = obj as THREE.Bone;
        // Standardize bone name (strip mixamorig prefix or colons)
        const cleanName = bone.name.replace(/^mixamorig:?/, '').replace(/^mixamorig/, '');
        this.boneByName.set(cleanName, bone);
        this.boneByName.set(bone.name, bone);

        const worldQ = new THREE.Quaternion();
        bone.getWorldQuaternion(worldQ);
        this.restWorld.set(bone, worldQ.clone());
        this.restWorldInv.set(bone, worldQ.clone().invert());
        this.restLocal.set(bone, bone.quaternion.clone());

        // Find child bone to derive rest direction
        const childBone = bone.children.find((c) => (c as THREE.Bone).isBone) as THREE.Bone | undefined;
        if (childBone) {
          const bonePos = new THREE.Vector3();
          const childPos = new THREE.Vector3();
          bone.getWorldPosition(bonePos);
          childBone.getWorldPosition(childPos);
          const dir = childPos.sub(bonePos).normalize();
          this.restChildDir.set(bone, dir);
        }
      }
    });

    // Compute Rest Pelvis & Chest basis inverses
    const hips = this.getBone('Hips');
    const chest = this.getBone('Chest') || this.getBone('Spine2');

    if (hips) {
      const leftUpLeg = this.getBone('LeftUpLeg');
      const rightUpLeg = this.getBone('RightUpLeg');
      const spine = this.getBone('Spine');
      if (leftUpLeg && rightUpLeg && spine) {
        const hPos = new THREE.Vector3();
        const lPos = new THREE.Vector3();
        const rPos = new THREE.Vector3();
        const sPos = new THREE.Vector3();
        hips.getWorldPosition(hPos);
        leftUpLeg.getWorldPosition(lPos);
        rightUpLeg.getWorldPosition(rPos);
        spine.getWorldPosition(sPos);

        const leftVec = lPos.clone().sub(rPos);
        const upVec = sPos.clone().sub(hPos);
        const m = basisFrom(leftVec, upVec, new THREE.Matrix4());
        this.restPelvisInv.copy(m).invert();
      }
    }

    if (chest) {
      const leftArm = this.getBone('LeftArm');
      const rightArm = this.getBone('RightArm');
      const spine1 = this.getBone('Spine1') || hips;
      if (leftArm && rightArm && spine1) {
        const cPos = new THREE.Vector3();
        const lPos = new THREE.Vector3();
        const rPos = new THREE.Vector3();
        const sPos = new THREE.Vector3();
        chest.getWorldPosition(cPos);
        leftArm.getWorldPosition(lPos);
        rightArm.getWorldPosition(rPos);
        spine1.getWorldPosition(sPos);

        const leftVec = lPos.clone().sub(rPos);
        const upVec = cPos.clone().sub(sPos);
        const m = basisFrom(leftVec, upVec, new THREE.Matrix4());
        this.restChestInv.copy(m).invert();
      }
    }
  }

  public getBone(name: string): THREE.Bone | undefined {
    return this.boneByName.get(name) || this.boneByName.get(`mixamorig${name}`) || this.boneByName.get(`mixamorig:${name}`);
  }
}

/** Aim bone rotation solver. Rotates bone so direction to child aligns with measured target vector. */
export function aimBone(
  bone: THREE.Bone,
  targetDir: THREE.Vector3,
  cache: RestPoseCache,
  worldRotNow: Map<THREE.Bone, THREE.Quaternion>,
  weight = 1.0,
  responsiveness = 0.8
) {
  if (!bone.parent) return;

  const parentNow = worldRotNow.get(bone.parent as THREE.Bone) || new THREE.Quaternion();
  const parentRest = cache.restWorld.get(bone.parent as THREE.Bone) || new THREE.Quaternion();
  const restWorldBone = cache.restWorld.get(bone) || new THREE.Quaternion();
  const restChild = cache.restChildDir.get(bone);

  if (!restChild) return;

  // Carry quaternion: rotation accumulated by parent chain since rest pose
  const carry = parentNow.clone().multiply(parentRest.clone().invert());
  const dir = restChild.clone().applyQuaternion(carry);

  const delta = new THREE.Quaternion().setFromUnitVectors(dir, targetDir.clone().normalize());
  const world = delta.multiply(carry).multiply(restWorldBone);

  const local = parentNow.clone().invert().multiply(world);

  if (weight < 1.0) {
    const restLoc = cache.restLocal.get(bone) || new THREE.Quaternion();
    local.slerp(restLoc, 1.0 - weight);
  }

  bone.quaternion.slerp(local, responsiveness);

  // Record actual resulting world quaternion for child bones
  const actualWorld = new THREE.Quaternion();
  bone.getWorldQuaternion(actualWorld);
  worldRotNow.set(bone, actualWorld);
}

/** Adaptive 1-Euro style speed filter for smooth motion */
export class SpeedAdaptiveFilter {
  private previousVec = new Map<string, THREE.Vector3>();

  public filter(key: string, incoming: THREE.Vector3, dt: number, baseAlpha = 0.85): THREE.Vector3 {
    const prev = this.previousVec.get(key);
    if (!prev) {
      this.previousVec.set(key, incoming.clone());
      return incoming.clone();
    }

    const dist = prev.distanceTo(incoming);
    const speed = dt > 0 ? dist / dt : 0; // m/s
    // Open filter up as joint accelerates (2.5 m/s approx fast gesture)
    const alpha = baseAlpha * (1.0 - Math.min(1.0, speed / 2.5));
    prev.lerp(incoming, 1.0 - alpha);
    return prev.clone();
  }

  public reset() {
    this.previousVec.clear();
  }
}
