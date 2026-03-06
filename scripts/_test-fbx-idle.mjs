import { readFileSync } from "fs";
import { Blob } from "buffer";

globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({}) };
globalThis.Blob = Blob;
globalThis.performance = globalThis.performance ?? { now: Date.now };

import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

for (const [name, path] of [
  ["standing_idle", "public/models/sketchfab/standing_idle.fbx"],
  ["walking", "public/models/sketchfab/walking.fbx"],
]) {
  console.log(`\n=== ${name} ===`);
  const fbxData = readFileSync(path);
  const arrayBuffer = fbxData.buffer.slice(fbxData.byteOffset, fbxData.byteOffset + fbxData.byteLength);

  const loader = new FBXLoader();
  try {
    const group = loader.parse(arrayBuffer, "");

    let boneCount = 0;
    let skinnedMeshCount = 0;
    let meshCount = 0;

    group.traverse((child) => {
      if (child.isBone) boneCount++;
      if (child.isSkinnedMesh) {
        skinnedMeshCount++;
        console.log("  SkinnedMesh:", child.name, "verts:", child.geometry.getAttribute("position")?.count);
        console.log("    skeleton bones:", child.skeleton?.bones?.length);
      }
      if (child.isMesh && !child.isSkinnedMesh) meshCount++;
    });

    console.log("  Bones:", boneCount, "| SkinnedMeshes:", skinnedMeshCount, "| Regular meshes:", meshCount);
    console.log("  Animations:", group.animations?.length);
    if (group.animations?.length) {
      for (const clip of group.animations) {
        console.log("    Clip:", clip.name, "duration:", clip.duration.toFixed(2) + "s", "tracks:", clip.tracks.length);
      }
    }
  } catch (e) {
    console.error("  Parse error:", e.message);
  }
}
