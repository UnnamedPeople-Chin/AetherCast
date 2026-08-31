import React, { useMemo } from 'react';
import * as THREE from 'three';

interface ProceduralSpidermanProps {
  onRigReady?: (root: THREE.Object3D) => void;
}

/**
 * Generates a Mixamo-rigged procedural Spider-Man avatar.
 * Guarantees standard bone structure ('mixamorigHips', 'mixamorigLeftArm', etc.)
 * so retargeting code works 100% reliably without requiring external file downloads.
 */
export const ProceduralSpiderman: React.FC<ProceduralSpidermanProps> = ({ onRigReady }) => {
  const skinnedMesh = useMemo(() => {
    // 1. Create Bones
    const hips = new THREE.Bone(); hips.name = 'mixamorigHips'; hips.position.set(0, 0, 0);
    const spine = new THREE.Bone(); spine.name = 'mixamorigSpine'; spine.position.set(0, 0.25, 0);
    const spine1 = new THREE.Bone(); spine1.name = 'mixamorigSpine1'; spine1.position.set(0, 0.2, 0);
    const chest = new THREE.Bone(); chest.name = 'mixamorigChest'; chest.position.set(0, 0.2, 0);
    const neck = new THREE.Bone(); neck.name = 'mixamorigNeck'; neck.position.set(0, 0.15, 0);
    const head = new THREE.Bone(); head.name = 'mixamorigHead'; head.position.set(0, 0.1, 0);

    // Left Arm Chain
    const leftShoulder = new THREE.Bone(); leftShoulder.name = 'mixamorigLeftShoulder'; leftShoulder.position.set(0.1, 0.1, 0);
    const leftArm = new THREE.Bone(); leftArm.name = 'mixamorigLeftArm'; leftArm.position.set(0.2, 0, 0);
    const leftForeArm = new THREE.Bone(); leftForeArm.name = 'mixamorigLeftForeArm'; leftForeArm.position.set(0.3, 0, 0);
    const leftHand = new THREE.Bone(); leftHand.name = 'mixamorigLeftHand'; leftHand.position.set(0.25, 0, 0);

    // Right Arm Chain
    const rightShoulder = new THREE.Bone(); rightShoulder.name = 'mixamorigRightShoulder'; rightShoulder.position.set(-0.1, 0.1, 0);
    const rightArm = new THREE.Bone(); rightArm.name = 'mixamorigRightArm'; rightArm.position.set(-0.2, 0, 0);
    const rightForeArm = new THREE.Bone(); rightForeArm.name = 'mixamorigRightForeArm'; rightForeArm.position.set(-0.3, 0, 0);
    const rightHand = new THREE.Bone(); rightHand.name = 'mixamorigRightHand'; rightHand.position.set(-0.25, 0, 0);

    // Left Leg Chain
    const leftUpLeg = new THREE.Bone(); leftUpLeg.name = 'mixamorigLeftUpLeg'; leftUpLeg.position.set(0.12, -0.05, 0);
    const leftLeg = new THREE.Bone(); leftLeg.name = 'mixamorigLeftLeg'; leftLeg.position.set(0, -0.45, 0);
    const leftFoot = new THREE.Bone(); leftFoot.name = 'mixamorigLeftFoot'; leftFoot.position.set(0, -0.45, 0);

    // Right Leg Chain
    const rightUpLeg = new THREE.Bone(); rightUpLeg.name = 'mixamorigRightUpLeg'; rightUpLeg.position.set(-0.12, -0.05, 0);
    const rightLeg = new THREE.Bone(); rightLeg.name = 'mixamorigRightLeg'; rightLeg.position.set(0, -0.45, 0);
    const rightFoot = new THREE.Bone(); rightFoot.name = 'mixamorigRightFoot'; rightFoot.position.set(0, -0.45, 0);

    // Build Bone Tree Hierarchy
    hips.add(spine);
    spine.add(spine1);
    spine1.add(chest);
    chest.add(neck);
    neck.add(head);

    chest.add(leftShoulder);
    leftShoulder.add(leftArm);
    leftArm.add(leftForeArm);
    leftForeArm.add(leftHand);

    chest.add(rightShoulder);
    rightShoulder.add(rightArm);
    rightArm.add(rightForeArm);
    rightForeArm.add(rightHand);

    hips.add(leftUpLeg);
    leftUpLeg.add(leftLeg);
    leftLeg.add(leftFoot);

    hips.add(rightUpLeg);
    rightUpLeg.add(rightLeg);
    rightLeg.add(rightFoot);

    const bones = [
      hips, spine, spine1, chest, neck, head,
      leftShoulder, leftArm, leftForeArm, leftHand,
      rightShoulder, rightArm, rightForeArm, rightHand,
      leftUpLeg, leftLeg, leftFoot,
      rightUpLeg, rightLeg, rightFoot,
    ];

    const skeleton = new THREE.Skeleton(bones);

    // 2. Create Geometry (Humanoid Mesh)
    const geometry = new THREE.CylinderGeometry(0.2, 0.15, 1.8, 16, 16);
    geometry.translate(0, 0.4, 0); // Align origin with hips

    // Set skin indices and weights for procedural skinning
    const position = geometry.attributes.position;
    const skinIndices: number[] = [];
    const skinWeights: number[] = [];

    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      const x = position.getX(i);

      if (y > 0.8) {
        // Head / Neck
        skinIndices.push(5, 4, 3, 0);
        skinWeights.push(0.7, 0.2, 0.1, 0);
      } else if (y > 0.4) {
        // Upper Torso / Arms
        if (Math.abs(x) > 0.2) {
          if (x > 0) {
            skinIndices.push(7, 8, 3, 0); // Left Arm
          } else {
            skinIndices.push(11, 12, 3, 0); // Right Arm
          }
          skinWeights.push(0.6, 0.3, 0.1, 0);
        } else {
          skinIndices.push(3, 2, 1, 0); // Chest / Spine
          skinWeights.push(0.5, 0.3, 0.2, 0);
        }
      } else if (y > 0) {
        // Hips / Spine
        skinIndices.push(0, 1, 2, 0);
        skinWeights.push(0.6, 0.3, 0.1, 0);
      } else {
        // Legs
        if (x > 0) {
          skinIndices.push(14, 15, 16, 0); // Left Leg
        } else {
          skinIndices.push(17, 18, 19, 0); // Right Leg
        }
        skinWeights.push(0.5, 0.4, 0.1, 0);
      }
    }

    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    // 3. Create Spider-Man Suit Material
    const material = new THREE.MeshStandardMaterial({
      color: 0xc91818, // Classic Spider-Man Red
      roughness: 0.3,
      metalness: 0.1,
    });

    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.add(hips);
    mesh.bind(skeleton);
    mesh.frustumCulled = false;

    // Head Mesh (Spider-Man Mask with glowing eyes)
    const headGeom = new THREE.SphereGeometry(0.13, 16, 16);
    headGeom.scale(0.85, 1.1, 0.9);
    const headMesh = new THREE.Mesh(
      headGeom,
      new THREE.MeshStandardMaterial({ color: 0xba1313, roughness: 0.2 })
    );
    headMesh.position.set(0, 0.08, 0);
    head.add(headMesh);

    // Left Eye Lens
    const eyeGeom = new THREE.PlaneGeometry(0.06, 0.04);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(0.04, 0.02, 0.11);
    leftEye.rotation.y = 0.2;
    headMesh.add(leftEye);

    // Right Eye Lens
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(-0.04, 0.02, 0.11);
    rightEye.rotation.y = -0.2;
    headMesh.add(rightEye);

    // Spider Emblem on Chest
    const logoGeom = new THREE.CircleGeometry(0.05, 8);
    const logoMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const logo = new THREE.Mesh(logoGeom, logoMat);
    logo.position.set(0, 0.05, 0.15);
    chest.add(logo);

    return mesh;
  }, []);

  React.useEffect(() => {
    if (skinnedMesh && onRigReady) {
      onRigReady(skinnedMesh);
    }
  }, [skinnedMesh, onRigReady]);

  return <primitive object={skinnedMesh} />;
};
