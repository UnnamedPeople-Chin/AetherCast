import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Landmark3D, Landmark2D } from '../lib/types';
import {
  RestPoseCache,
  aimBone,
  basisFrom,
  mpToThreeVector,
  POSE,
  HAND,
  SpeedAdaptiveFilter,
} from '../lib/retargeting';
import { solveLeastSquares, ScaleSmoother } from '../lib/solver';
import type { SolverRow } from '../lib/solver';
import { ProceduralSpiderman } from './ProceduralSpiderman';

interface SpidermanModelProps {
  poseLandmarks: Landmark2D[] | null;
  poseWorldLandmarks: Landmark3D[] | null;
  leftHandLandmarks: Landmark3D[] | null;
  rightHandLandmarks: Landmark3D[] | null;
  isScaleLocked: boolean;
  onPoseUpdate?: (scale: number, tx: number, ty: number) => void;
}

export const SpidermanModel: React.FC<SpidermanModelProps> = ({
  poseLandmarks,
  poseWorldLandmarks,
  leftHandLandmarks,
  rightHandLandmarks,
  isScaleLocked,
  onPoseUpdate,
}) => {
  const modelGroupRef = useRef<THREE.Group>(null!);
  const cacheRef = useRef<RestPoseCache>(new RestPoseCache());
  const filterRef = useRef<SpeedAdaptiveFilter>(new SpeedAdaptiveFilter());
  const scaleSmootherRef = useRef<ScaleSmoother>(new ScaleSmoother());

  const [rigRoot, setRigRoot] = useState<THREE.Object3D | null>(null);
  const { camera } = useThree();

  // Temporary working variables for garbage-free performance
  const vecMap = useMemo(() => {
    const map = new Map<number, THREE.Vector3>();
    for (let i = 0; i <= 32; i++) map.set(i, new THREE.Vector3());
    return map;
  }, []);

  const tempVecA = useMemo(() => new THREE.Vector3(), []);
  const tempVecB = useMemo(() => new THREE.Vector3(), []);
  const tempMat = useMemo(() => new THREE.Matrix4(), []);
  const worldRotNow = useMemo(() => new Map<THREE.Bone, THREE.Quaternion>(), []);

  // Initialize rig rest pose cache when root object is ready
  const handleRigReady = (root: THREE.Object3D) => {
    setRigRoot(root);
    cacheRef.current.analyzeRig(root);
  };

  useFrame((_, delta) => {
    if (!rigRoot || !poseWorldLandmarks || !poseLandmarks) return;

    const cache = cacheRef.current;
    const filter = filterRef.current;
    const dt = Math.min(delta, 0.1);

    // 1. Map 3D MediaPipe world landmarks to Three.js vectors
    for (let i = 0; i < poseWorldLandmarks.length; i++) {
      const lm = poseWorldLandmarks[i];
      const targetVec = vecMap.get(i)!;
      mpToThreeVector(lm, targetVec);

      // Apply adaptive speed filtering
      const filtered = filter.filter(`lm_${i}`, targetVec, dt);
      targetVec.copy(filtered);
    }

    const lm = vecMap;

    // 2. Torso Basis Transformation & Pelvis Twist Solver
    const hips = cache.getBone('Hips');
    const spine = cache.getBone('Spine');
    const spine1 = cache.getBone('Spine1') || hips;
    const chest = cache.getBone('Chest') || spine1;
    const head = cache.getBone('Head');

    if (hips && spine && chest) {
      const hipCentre = lm.get(POSE.LEFT_HIP)!.clone().add(lm.get(POSE.RIGHT_HIP)!).multiplyScalar(0.5);
      const shoulderCentre = lm.get(POSE.LEFT_SHOULDER)!.clone().add(lm.get(POSE.RIGHT_SHOULDER)!).multiplyScalar(0.5);
      const upDir = shoulderCentre.clone().sub(hipCentre).normalize();

      const shoulderLeft = lm.get(POSE.LEFT_SHOULDER)!.clone().sub(lm.get(POSE.RIGHT_SHOULDER)!).normalize();

      // Confidence-weighted pelvis lateral axis (falls back to shoulder direction when seated)
      const wLHip = poseWorldLandmarks[POSE.LEFT_HIP]?.visibility ?? 0.8;
      const wRHip = poseWorldLandmarks[POSE.RIGHT_HIP]?.visibility ?? 0.8;
      const wHip = Math.min(wLHip, wRHip);

      const pelvisLeft = lm.get(POSE.LEFT_HIP)!.clone().sub(lm.get(POSE.RIGHT_HIP)!).normalize().multiplyScalar(wHip)
        .addScaledVector(shoulderLeft, 1.0 - wHip).normalize();

      // Compute current pelvis and chest rotation deltas
      const basisPelvis = basisFrom(pelvisLeft, upDir, tempMat);
      const dPelvis = new THREE.Quaternion().setFromRotationMatrix(
        basisPelvis.multiply(cache.restPelvisInv)
      );

      const basisChest = basisFrom(shoulderLeft, upDir, tempMat);
      const dChest = new THREE.Quaternion().setFromRotationMatrix(
        basisChest.multiply(cache.restChestInv)
      );

      // Apply interpolated rotations down the spine
      const applyWorldRot = (bone: THREE.Bone, qWorld: THREE.Quaternion) => {
        if (!bone.parent) return;
        const parentWorld = worldRotNow.get(bone.parent as THREE.Bone) || cache.restWorld.get(bone.parent as THREE.Bone)!;
        const local = parentWorld.clone().invert().multiply(qWorld);
        bone.quaternion.slerp(local, 0.8);
        const actual = new THREE.Quaternion();
        bone.getWorldQuaternion(actual);
        worldRotNow.set(bone, actual);
      };

      const restHips = cache.restWorld.get(hips)!;
      applyWorldRot(hips, dPelvis.clone().multiply(restHips));

      if (spine) {
        const qSpine = dPelvis.clone().slerp(dChest, 0.34).multiply(cache.restWorld.get(spine)!);
        applyWorldRot(spine, qSpine);
      }
      if (spine1 && spine1 !== chest) {
        const qSpine1 = dPelvis.clone().slerp(dChest, 0.67).multiply(cache.restWorld.get(spine1)!);
        applyWorldRot(spine1, qSpine1);
      }

      applyWorldRot(chest, dChest.clone().multiply(cache.restWorld.get(chest)!));

      // Head Rotation (Ears & Nose Direction)
      if (head) {
        const leftEar = lm.get(POSE.LEFT_EAR)!;
        const rightEar = lm.get(POSE.RIGHT_EAR)!;
        const nose = lm.get(POSE.NOSE)!;

        const earVec = leftEar.clone().sub(rightEar).normalize();
        const faceUp = nose.clone().sub(shoulderCentre).normalize();
        const basisHead = basisFrom(earVec, faceUp, tempMat);
        const dHead = new THREE.Quaternion().setFromRotationMatrix(basisHead);
        applyWorldRot(head, dHead.slerp(dChest, 0.3).multiply(cache.restWorld.get(head)!));
      }
    }

    // 3. Aim Limbs (Arms, Forearms, Legs, Feet)
    const aimTargets = [
      // Left Arm
      { boneName: 'LeftArm', from: POSE.LEFT_SHOULDER, to: POSE.LEFT_ELBOW, weight: 1.0 },
      { boneName: 'LeftForeArm', from: POSE.LEFT_ELBOW, to: POSE.LEFT_WRIST, weight: 1.0 },
      // Right Arm
      { boneName: 'RightArm', from: POSE.RIGHT_SHOULDER, to: POSE.RIGHT_ELBOW, weight: 1.0 },
      { boneName: 'RightForeArm', from: POSE.RIGHT_ELBOW, to: POSE.RIGHT_WRIST, weight: 1.0 },
      // Left Leg
      { boneName: 'LeftUpLeg', from: POSE.LEFT_HIP, to: POSE.LEFT_KNEE, weight: 0.8 },
      { boneName: 'LeftLeg', from: POSE.LEFT_KNEE, to: POSE.LEFT_ANKLE, weight: 0.8 },
      { boneName: 'LeftFoot', from: POSE.LEFT_ANKLE, to: POSE.LEFT_FOOT_INDEX, weight: 0.6 },
      // Right Leg
      { boneName: 'RightUpLeg', from: POSE.RIGHT_HIP, to: POSE.RIGHT_KNEE, weight: 0.8 },
      { boneName: 'RightLeg', from: POSE.RIGHT_KNEE, to: POSE.RIGHT_ANKLE, weight: 0.8 },
      { boneName: 'RightFoot', from: POSE.RIGHT_ANKLE, to: POSE.RIGHT_FOOT_INDEX, weight: 0.6 },
    ];

    for (const target of aimTargets) {
      const bone = cache.getBone(target.boneName);
      if (bone) {
        const dir = lm.get(target.to)!.clone().sub(lm.get(target.from)!);
        aimBone(bone, dir, cache, worldRotNow, target.weight, 0.85);
      }
    }

    // 4. Hands & Fingers Retargeting in Local Palm Basis Frame
    const solveHandFingers = (handLms: Landmark3D[] | null, isLeft: boolean) => {
      if (!handLms) return;
      const wristBone = cache.getBone(isLeft ? 'LeftHand' : 'RightHand');
      if (!wristBone) return;

      // Build local palm frame from hand landmarks
      const wrist = handLms[HAND.WRIST];
      const indexMcp = handLms[HAND.INDEX_MCP];
      const pinkyMcp = handLms[HAND.PINKY_MCP];
      const middleMcp = handLms[HAND.MIDDLE_MCP];

      if (!wrist || !indexMcp || !pinkyMcp || !middleMcp) return;

      const vWrist = new THREE.Vector3(wrist.x, -wrist.y, -wrist.z);
      const vIndex = new THREE.Vector3(indexMcp.x, -indexMcp.y, -indexMcp.z);
      const vPinky = new THREE.Vector3(pinkyMcp.x, -pinkyMcp.y, -pinkyMcp.z);
      const vMiddle = new THREE.Vector3(middleMcp.x, -middleMcp.y, -middleMcp.z);

      const across = vIndex.clone().sub(vPinky).normalize();
      const up = vMiddle.clone().sub(vWrist).normalize();

      const palmMat = basisFrom(across, up, tempMat);
      const toPalm = palmMat.clone().transpose();

      // Finger Aim Definitions
      const fingerBones = [
        { name: isLeft ? 'LeftHandThumb1' : 'RightHandThumb1', base: HAND.THUMB_CMC, tip: HAND.THUMB_TIP },
        { name: isLeft ? 'LeftHandIndex1' : 'RightHandIndex1', base: HAND.INDEX_MCP, tip: HAND.INDEX_TIP },
        { name: isLeft ? 'LeftHandMiddle1' : 'RightHandMiddle1', base: HAND.MIDDLE_MCP, tip: HAND.MIDDLE_TIP },
        { name: isLeft ? 'LeftHandRing1' : 'RightHandRing1', base: HAND.RING_MCP, tip: HAND.RING_TIP },
        { name: isLeft ? 'LeftHandPinky1' : 'RightHandPinky1', base: HAND.PINKY_MCP, tip: HAND.PINKY_TIP },
      ];

      const wristRot = worldRotNow.get(wristBone) || cache.restWorld.get(wristBone)!;
      const restWrist = cache.restWorld.get(wristBone)!;
      const R = wristRot.clone().multiply(restWrist.clone().invert());

      for (const f of fingerBones) {
        const bone = cache.getBone(f.name);
        if (bone && handLms[f.tip] && handLms[f.base]) {
          const bTip = handLms[f.tip];
          const bBase = handLms[f.base];
          const dir = new THREE.Vector3(bTip.x - bBase.x, -(bTip.y - bBase.y), -(bTip.z - bBase.z)).normalize();
          dir.applyMatrix4(toPalm).applyQuaternion(R);
          aimBone(bone, dir, cache, worldRotNow, 0.9, 0.85);
        }
      }
    };

    solveHandFingers(leftHandLandmarks, true);
    solveHandFingers(rightHandLandmarks, false);

    // 5. Closed-Form Least-Squares Scale & Translation Solver
    const solverRows: SolverRow[] = [];
    const jointConfigs = [
      { boneName: 'LeftShoulder', lmIdx: POSE.LEFT_SHOULDER, weight: 1.0 },
      { boneName: 'RightShoulder', lmIdx: POSE.RIGHT_SHOULDER, weight: 1.0 },
      { boneName: 'LeftHip', lmIdx: POSE.LEFT_HIP, weight: 1.0 },
      { boneName: 'RightHip', lmIdx: POSE.RIGHT_HIP, weight: 1.0 },
      { boneName: 'LeftElbow', lmIdx: POSE.LEFT_ELBOW, weight: 0.6 },
      { boneName: 'RightElbow', lmIdx: POSE.RIGHT_ELBOW, weight: 0.6 },
      { boneName: 'LeftKnee', lmIdx: POSE.LEFT_KNEE, weight: 0.6 },
      { boneName: 'RightKnee', lmIdx: POSE.RIGHT_KNEE, weight: 0.6 },
      { boneName: 'LeftWrist', lmIdx: POSE.LEFT_WRIST, weight: 0.35 },
      { boneName: 'RightWrist', lmIdx: POSE.RIGHT_WRIST, weight: 0.35 },
    ];

    rigRoot.updateMatrixWorld(true);

    for (const c of jointConfigs) {
      const bone = cache.getBone(c.boneName);
      const userLm = poseLandmarks[c.lmIdx];

      if (bone && userLm && userLm.x >= 0 && userLm.x <= 1 && userLm.y >= 0 && userLm.y <= 1) {
        const boneWorldPos = tempVecA;
        bone.getWorldPosition(boneWorldPos);

        // Project bone 3D world position to normalized 2D NDC screen coords
        const projected = tempVecB.copy(boneWorldPos).project(camera);
        const projX = (projected.x + 1) / 2;
        const projY = (1 - projected.y) / 2;

        solverRows.push({
          w: c.weight,
          px: projX,
          py: projY,
          qx: userLm.x,
          qy: userLm.y,
        });
      }
    }

    const fitResult = solveLeastSquares(solverRows);
    if (fitResult && modelGroupRef.current) {
      const smoothed = scaleSmootherRef.current.update(fitResult, isScaleLocked);

      // Apply Scale & Offset to model container group
      modelGroupRef.current.scale.setScalar(smoothed.s * 2.2);
      // Map screen offset (0..1) to camera view world space (-2..2)
      modelGroupRef.current.position.x = (smoothed.tx - 0.5) * 4.0;
      modelGroupRef.current.position.y = -(smoothed.ty - 0.5) * 3.5;

      if (onPoseUpdate) {
        onPoseUpdate(smoothed.s, smoothed.tx, smoothed.ty);
      }
    }
  });

  return (
    <group ref={modelGroupRef}>
      <ProceduralSpiderman onRigReady={handleRigReady} />
    </group>
  );
};
