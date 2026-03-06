// Polyfill minimal browser globals for Three.js FBXLoader in Node
import { readFileSync } from "fs";
import { Blob } from "buffer";

globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({}) };
globalThis.Blob = Blob;
globalThis.URL = globalThis.URL ?? URL;
globalThis.performance = globalThis.performance ?? { now: Date.now };

import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

// Read FBX file as ArrayBuffer
const fbxData = readFileSync("public/models/sketchfab/base_nude_mesh.fbx");
const arrayBuffer = fbxData.buffer.slice(fbxData.byteOffset, fbxData.byteOffset + fbxData.byteLength);

const loader = new FBXLoader();
try {
  const group = loader.parse(arrayBuffer, "");

  console.log("=== FBX Parse Result ===");
  console.log("Children:", group.children.length);

  group.traverse((child) => {
    console.log(
      "  Type:", child.type,
      "| Name:", child.name,
      child.isSkinnedMesh ? "| SKINNED MESH" : "",
      child.isBone ? "| BONE" : "",
      child.isMesh ? "| MESH" : ""
    );

    if (child.isSkinnedMesh) {
      const sm = child;
      console.log("    Skeleton:", sm.skeleton?.bones?.length, "bones");
      const geo = sm.geometry;
      console.log("    JOINTS_0:", Boolean(geo.getAttribute("skinIndex")));
      console.log("    WEIGHTS_0:", Boolean(geo.getAttribute("skinWeight")));
      console.log("    Vertices:", geo.getAttribute("position")?.count);
    } else if (child.isMesh) {
      const geo = child.geometry;
      console.log("    skinIndex:", Boolean(geo.getAttribute("skinIndex")));
      console.log("    skinWeight:", Boolean(geo.getAttribute("skinWeight")));
      console.log("    Vertices:", geo.getAttribute("position")?.count);
    }
  });

  // Check animations
  console.log("\nAnimations:", group.animations?.length);
  if (group.animations?.length) {
    for (const clip of group.animations) {
      console.log("  Clip:", clip.name, "duration:", clip.duration.toFixed(2) + "s", "tracks:", clip.tracks.length);
    }
  }
} catch (e) {
  console.error("Parse error:", e.message);
  console.error(e.stack?.split("\n").slice(0, 5).join("\n"));
}
