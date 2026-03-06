#!/usr/bin/env node
/**
 * Bind a retextured mesh to the Mixamo skeleton and bake in animations.
 *
 * Reads:
 *   - public/models/{name}.glb  (retextured mesh from Meshy – no skeleton)
 *   - public/models/animations/idle.glb   (Mixamo skeleton + idle anim)
 *   - public/models/animations/walking.glb (optional walking anim)
 *
 * Outputs:
 *   - public/models/{name}.glb  (overwritten with rigged + animated version)
 *
 * Usage:
 *   node scripts/rig-mesh.mjs              # all 4 characters
 *   node scripts/rig-mesh.mjs ceo dev      # specific characters
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { NodeIO, Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = resolve(__dirname, "../public/models");
const CHARACTERS = ["ceo", "marketing", "sales", "dev"];

const args = process.argv.slice(2);
const targets = args.length > 0 ? args.filter((a) => CHARACTERS.includes(a)) : CHARACTERS;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// ─── Bone hierarchy helpers ──────────────────────────────────────────

/** Recursively compute world-space bone positions from the skeleton hierarchy */
function computeBoneWorldPositions(node, parentWorldPos = [0, 0, 0]) {
  const t = node.getTranslation();
  const worldPos = [
    parentWorldPos[0] + t[0],
    parentWorldPos[1] + t[1],
    parentWorldPos[2] + t[2],
  ];

  const result = [{ node, worldPos, name: node.getName() }];
  for (const child of node.listChildren()) {
    result.push(...computeBoneWorldPositions(child, worldPos));
  }
  return result;
}

/** Distance from point to line segment (bone) */
function distToSegment(px, py, pz, ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const lenSq = dx * dx + dy * dy + dz * dz;

  if (lenSq < 1e-10) {
    // Degenerate segment (bone has zero length)
    const ex = px - ax, ey = py - ay, ez = pz - az;
    return Math.sqrt(ex * ex + ey * ey + ez * ez);
  }

  let t = ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const cx = ax + t * dx - px;
  const cy = ay + t * dy - py;
  const cz = az + t * dz - pz;
  return Math.sqrt(cx * cx + cy * cy + cz * cz);
}

/** 4x4 matrix multiply */
function mat4Multiply(a, b) {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[i * 4 + j] =
        a[i * 4 + 0] * b[0 * 4 + j] +
        a[i * 4 + 1] * b[1 * 4 + j] +
        a[i * 4 + 2] * b[2 * 4 + j] +
        a[i * 4 + 3] * b[3 * 4 + j];
    }
  }
  return out;
}

/** Create a 4x4 translation matrix */
function mat4FromTranslation(x, y, z) {
  // Column-major
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ]);
}

/** Invert a 4x4 matrix (general case) */
function mat4Invert(m) {
  const inv = new Float32Array(16);
  inv[0] = m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
  inv[4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
  inv[8] = m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
  inv[12] = -m[4]*m[9]*m[14] + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];
  inv[1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
  inv[5] = m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
  inv[9] = -m[0]*m[9]*m[15] + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
  inv[13] = m[0]*m[9]*m[14] - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];
  inv[2] = m[1]*m[6]*m[15] - m[1]*m[7]*m[14] - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7] - m[13]*m[3]*m[6];
  inv[6] = -m[0]*m[6]*m[15] + m[0]*m[7]*m[14] + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7] + m[12]*m[3]*m[6];
  inv[10] = m[0]*m[5]*m[15] - m[0]*m[7]*m[13] - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7] - m[12]*m[3]*m[5];
  inv[14] = -m[0]*m[5]*m[14] + m[0]*m[6]*m[13] + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6] + m[12]*m[2]*m[5];
  inv[3] = -m[1]*m[6]*m[11] + m[1]*m[7]*m[10] + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7] + m[9]*m[3]*m[6];
  inv[7] = m[0]*m[6]*m[11] - m[0]*m[7]*m[10] - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7] - m[8]*m[3]*m[6];
  inv[11] = -m[0]*m[5]*m[11] + m[0]*m[7]*m[9] + m[4]*m[1]*m[11] - m[4]*m[3]*m[9] - m[8]*m[1]*m[7] + m[8]*m[3]*m[5];
  inv[15] = m[0]*m[5]*m[10] - m[0]*m[6]*m[9] - m[4]*m[1]*m[10] + m[4]*m[2]*m[9] + m[8]*m[1]*m[6] - m[8]*m[2]*m[5];

  let det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12];
  if (Math.abs(det) < 1e-10) return new Float32Array(16); // singular
  det = 1.0 / det;
  for (let i = 0; i < 16; i++) inv[i] *= det;
  return inv;
}

// ─── Main rigging function ───────────────────────────────────────────

async function rigCharacter(name) {
  const meshPath = resolve(MODELS_DIR, `${name}.glb`);
  if (!existsSync(meshPath)) {
    console.warn(`  Skipping ${name}: ${meshPath} not found`);
    return;
  }

  console.log(`\nRigging ${name}...`);

  // Backup original
  const backupPath = resolve(MODELS_DIR, `${name}.unrigged.glb`);
  if (!existsSync(backupPath)) {
    copyFileSync(meshPath, backupPath);
    console.log(`  Backed up to ${name}.unrigged.glb`);
  }

  // Read the retextured mesh
  const meshDoc = await io.read(meshPath);
  const meshRoot = meshDoc.getRoot();
  const meshes = meshRoot.listMeshes();
  if (meshes.length === 0) {
    console.error(`  No meshes found in ${name}.glb`);
    return;
  }

  // Read animation GLBs
  const idleDoc = await io.read(resolve(MODELS_DIR, "animations/idle.glb"));
  const walkDoc = existsSync(resolve(MODELS_DIR, "animations/walking.glb"))
    ? await io.read(resolve(MODELS_DIR, "animations/walking.glb"))
    : null;

  // Get skeleton from idle animation
  const idleRoot = idleDoc.getRoot();
  const idleSkins = idleRoot.listSkins();
  if (idleSkins.length === 0) {
    console.error("  No skin found in idle animation GLB");
    return;
  }

  const idleSkin = idleSkins[0];
  const joints = idleSkin.listJoints();
  console.log(`  Skeleton: ${joints.length} joints`);

  // Find the root bone (parent of Hips)
  const allNodes = idleRoot.listNodes();
  let skeletonRoot = null;
  for (const node of allNodes) {
    if (node.listChildren().some((c) => c.getName() === "mixamorig:Hips")) {
      skeletonRoot = node;
      break;
    }
  }
  if (!skeletonRoot) {
    skeletonRoot = allNodes.find((n) => n.getName() === "mixamorig:Hips");
  }

  // Compute world positions for all bones
  const boneInfos = computeBoneWorldPositions(
    skeletonRoot,
    skeletonRoot.getTranslation()
  );

  // Build bone index map (name → index in joints array)
  const boneIndexMap = new Map();
  for (let i = 0; i < joints.length; i++) {
    boneIndexMap.set(joints[i].getName(), i);
  }

  console.log(`  Bone world positions computed for ${boneInfos.length} bones`);

  // Get mesh bounding box for scale alignment
  const mesh = meshes[0];
  const prim = mesh.listPrimitives()[0];
  const posAccessor = prim.getAttribute("POSITION");
  const vertCount = posAccessor.getCount();

  let meshMinY = Infinity, meshMaxY = -Infinity;
  let meshMinX = Infinity, meshMaxX = -Infinity;
  let meshMinZ = Infinity, meshMaxZ = -Infinity;
  for (let i = 0; i < vertCount; i++) {
    const v = posAccessor.getElement(i, [0, 0, 0]);
    meshMinX = Math.min(meshMinX, v[0]); meshMaxX = Math.max(meshMaxX, v[0]);
    meshMinY = Math.min(meshMinY, v[1]); meshMaxY = Math.max(meshMaxY, v[1]);
    meshMinZ = Math.min(meshMinZ, v[2]); meshMaxZ = Math.max(meshMaxZ, v[2]);
  }

  const meshHeight = meshMaxY - meshMinY;
  const meshCenterX = (meshMinX + meshMaxX) / 2;
  const meshCenterZ = (meshMinZ + meshMaxZ) / 2;

  // Skeleton height (from lowest bone to highest)
  let skelMinY = Infinity, skelMaxY = -Infinity;
  for (const b of boneInfos) {
    skelMinY = Math.min(skelMinY, b.worldPos[1]);
    skelMaxY = Math.max(skelMaxY, b.worldPos[1]);
  }
  const skelHeight = skelMaxY - skelMinY;

  const scaleFactor = skelHeight > 0 ? meshHeight / skelHeight : 1;
  console.log(`  Mesh height: ${meshHeight.toFixed(4)}, Skeleton height: ${skelHeight.toFixed(4)}, Scale: ${scaleFactor.toFixed(4)}`);

  // Scale bone positions to match mesh
  const scaledBones = boneInfos.map((b) => ({
    ...b,
    worldPos: [
      (b.worldPos[0] - boneInfos[0].worldPos[0]) * scaleFactor + meshCenterX,
      (b.worldPos[1] - skelMinY) * scaleFactor + meshMinY,
      (b.worldPos[2] - boneInfos[0].worldPos[2]) * scaleFactor + meshCenterZ,
    ],
  }));

  // Build parent-child segments for distance computation
  const boneSegments = [];
  for (const b of scaledBones) {
    const parentNode = b.node.listChildren().length > 0 ? null : null; // leaf
    // Find parent
    let parentBone = null;
    for (const other of scaledBones) {
      if (other.node.listChildren().includes(b.node)) {
        parentBone = other;
        break;
      }
    }

    const idx = boneIndexMap.get(b.name);
    if (idx === undefined) continue; // not a joint in the skin

    boneSegments.push({
      index: idx,
      name: b.name,
      pos: b.worldPos,
      parentPos: parentBone ? parentBone.worldPos : b.worldPos,
    });
  }

  console.log(`  Computing skin weights for ${vertCount} vertices...`);

  // Compute skin weights
  const jointsData = new Uint8Array(vertCount * 4);
  const weightsData = new Float32Array(vertCount * 4);

  for (let vi = 0; vi < vertCount; vi++) {
    const v = posAccessor.getElement(vi, [0, 0, 0]);

    // Compute distance to each bone segment
    const distances = boneSegments.map((seg) => ({
      index: seg.index,
      dist: distToSegment(
        v[0], v[1], v[2],
        seg.pos[0], seg.pos[1], seg.pos[2],
        seg.parentPos[0], seg.parentPos[1], seg.parentPos[2]
      ),
    }));

    // Sort by distance, take top 4
    distances.sort((a, b) => a.dist - b.dist);
    const top4 = distances.slice(0, 4);

    // Compute weights (inverse distance squared, with epsilon to avoid division by zero)
    const epsilon = 1e-6;
    const rawWeights = top4.map((d) => 1.0 / (d.dist * d.dist + epsilon));
    const totalWeight = rawWeights.reduce((s, w) => s + w, 0);

    for (let j = 0; j < 4; j++) {
      if (j < top4.length) {
        jointsData[vi * 4 + j] = top4[j].index;
        weightsData[vi * 4 + j] = rawWeights[j] / totalWeight;
      } else {
        jointsData[vi * 4 + j] = 0;
        weightsData[vi * 4 + j] = 0;
      }
    }
  }

  // ─── Build output document ──────────────────────────────────────────

  // We'll modify the mesh document to add skeleton + animation
  // First, clone the skeleton nodes into the mesh document
  const jointNodeMap = new Map(); // old node → new node
  const doc = meshDoc;

  function cloneNode(srcNode) {
    const newNode = doc.createNode(srcNode.getName());
    newNode.setTranslation(srcNode.getTranslation());
    newNode.setRotation(srcNode.getRotation());
    newNode.setScale(srcNode.getScale());
    jointNodeMap.set(srcNode, newNode);

    for (const child of srcNode.listChildren()) {
      const newChild = cloneNode(child);
      newNode.addChild(newChild);
    }
    return newNode;
  }

  // Clone entire skeleton hierarchy
  const newSkeletonRoot = cloneNode(skeletonRoot);

  // Add skeleton root to the scene
  const scenes = meshRoot.listScenes();
  if (scenes.length > 0) {
    scenes[0].addChild(newSkeletonRoot);
  }

  // Create the new joints list (matching original order)
  const newJoints = joints.map((oldJoint) => {
    const newJoint = jointNodeMap.get(oldJoint);
    if (!newJoint) {
      console.warn(`  Warning: joint ${oldJoint.getName()} not found in cloned hierarchy`);
    }
    return newJoint;
  });

  // Compute inverse bind matrices
  // For each joint, compute its world matrix in rest pose, then invert it
  function computeWorldMatrix(node, parentMatrix = null) {
    const t = node.getTranslation();
    const localMatrix = mat4FromTranslation(t[0], t[1], t[2]);
    // Note: ignoring rotation/scale in rest pose for simplicity
    // (Mixamo skeleton rest pose typically has identity rotation)
    const worldMatrix = parentMatrix
      ? mat4Multiply(parentMatrix, localMatrix)
      : localMatrix;
    return worldMatrix;
  }

  function getWorldMatrix(targetNode, rootNode) {
    // Walk from root to target, accumulating transforms
    const path = [];
    function findPath(current, target) {
      if (current === target) return true;
      for (const child of current.listChildren()) {
        if (findPath(child, target)) {
          path.unshift(child);
          return true;
        }
      }
      return false;
    }
    findPath(rootNode, targetNode);
    path.unshift(rootNode);

    let matrix = mat4FromTranslation(0, 0, 0); // identity
    for (const node of path) {
      const t = node.getTranslation();
      matrix = mat4Multiply(matrix, mat4FromTranslation(t[0], t[1], t[2]));
    }
    return matrix;
  }

  const ibmData = new Float32Array(newJoints.length * 16);
  for (let i = 0; i < newJoints.length; i++) {
    const joint = newJoints[i];
    if (!joint) {
      // Identity matrix
      ibmData.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], i * 16);
      continue;
    }
    const worldMat = getWorldMatrix(joint, newSkeletonRoot);
    const invMat = mat4Invert(worldMat);
    ibmData.set(invMat, i * 16);
  }

  // Create inverse bind matrices accessor
  const ibmAccessor = doc
    .createAccessor("inverseBindMatrices")
    .setType("MAT4")
    .setArray(ibmData);

  // Create skin
  const skin = doc.createSkin("mixamoSkin");
  skin.setInverseBindMatrices(ibmAccessor);
  for (const joint of newJoints) {
    if (joint) skin.addJoint(joint);
  }

  // Add JOINTS_0 and WEIGHTS_0 to the mesh primitive
  const jointsAccessor = doc
    .createAccessor("joints_0")
    .setType("VEC4")
    .setArray(jointsData);

  const weightsAccessor = doc
    .createAccessor("weights_0")
    .setType("VEC4")
    .setArray(weightsData);

  for (const p of mesh.listPrimitives()) {
    p.setAttribute("JOINTS_0", jointsAccessor);
    p.setAttribute("WEIGHTS_0", weightsAccessor);
  }

  // Set skin on the mesh node
  const meshNode = meshRoot.listNodes().find((n) => n.getMesh() === mesh);
  if (meshNode) {
    meshNode.setSkin(skin);
  }

  // ─── Copy animations ───────────────────────────────────────────────

  // Build name → new node map for cross-document matching
  const jointNameMap = new Map();
  for (const [oldNode, newNode] of jointNodeMap) {
    jointNameMap.set(oldNode.getName(), newNode);
  }

  function copyAnimation(srcDoc, clipName) {
    const srcAnims = srcDoc.getRoot().listAnimations();
    if (srcAnims.length === 0) return;

    const srcAnim = srcAnims[0];
    const newAnim = doc.createAnimation(clipName);

    for (const srcChannel of srcAnim.listChannels()) {
      const srcSampler = srcChannel.getSampler();
      const srcTarget = srcChannel.getTargetNode();

      if (!srcSampler || !srcTarget) continue;

      // Find corresponding joint by name (works across documents)
      const newTarget = jointNameMap.get(srcTarget.getName());
      if (!newTarget) continue;

      // Clone sampler data
      const srcInput = srcSampler.getInput();
      const srcOutput = srcSampler.getOutput();

      const newInput = doc
        .createAccessor()
        .setType(srcInput.getType())
        .setArray(new Float32Array(srcInput.getArray()));

      const newOutput = doc
        .createAccessor()
        .setType(srcOutput.getType())
        .setArray(new Float32Array(srcOutput.getArray()));

      const newSampler = doc
        .createAnimationSampler()
        .setInput(newInput)
        .setOutput(newOutput)
        .setInterpolation(srcSampler.getInterpolation());

      const newChannel = doc
        .createAnimationChannel()
        .setSampler(newSampler)
        .setTargetNode(newTarget)
        .setTargetPath(srcChannel.getTargetPath());

      newAnim.addChannel(newChannel);
      newAnim.addSampler(newSampler);
    }

    console.log(`  Added animation: ${clipName} (${newAnim.listChannels().length} channels)`);
  }

  copyAnimation(idleDoc, "idle");
  if (walkDoc) {
    copyAnimation(walkDoc, "walking");
  }

  // Write output
  await io.write(meshPath, doc);
  const fileSize = readFileSync(meshPath).length;
  console.log(`  Written: ${meshPath} (${(fileSize / 1024).toFixed(0)} KB)`);
}

// ─── Run ─────────────────────────────────────────────────────────────

for (const name of targets) {
  await rigCharacter(name);
}

console.log("\nDone! Models now have skeleton + animations.");
