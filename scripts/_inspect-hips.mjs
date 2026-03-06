import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read("public/models/animations/idle.glb");

for (const anim of doc.getRoot().listAnimations()) {
  for (const channel of anim.listChannels()) {
    const target = channel.getTargetNode();
    if (target?.getName() !== "mixamorig:Hips") continue;

    const path = channel.getTargetPath();
    const sampler = channel.getSampler();
    const output = sampler?.getOutput();
    if (!output) continue;

    const count = output.getCount();
    const elSize = output.getElementSize();

    if (path === "translation") {
      let minY = Infinity, maxY = -Infinity;
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      for (let i = 0; i < count; i++) {
        const v = output.getElement(i, new Array(elSize));
        minX = Math.min(minX, v[0]); maxX = Math.max(maxX, v[0]);
        minY = Math.min(minY, v[1]); maxY = Math.max(maxY, v[1]);
        minZ = Math.min(minZ, v[2]); maxZ = Math.max(maxZ, v[2]);
      }
      console.log("Hips translation range:");
      console.log("  X:", minX.toFixed(5), "to", maxX.toFixed(5), "(delta:", (maxX - minX).toFixed(5) + ")");
      console.log("  Y:", minY.toFixed(5), "to", maxY.toFixed(5), "(delta:", (maxY - minY).toFixed(5) + ")");
      console.log("  Z:", minZ.toFixed(5), "to", maxZ.toFixed(5), "(delta:", (maxZ - minZ).toFixed(5) + ")");
    }

    if (path === "rotation") {
      // Quaternion — show as euler roughly
      console.log("\nHips rotation (first 5 keyframes as quat):");
      for (let i = 0; i < Math.min(5, count); i++) {
        const q = output.getElement(i, new Array(4));
        console.log("  ", q.map(v => v.toFixed(4)).join(", "));
      }
    }
  }
}
