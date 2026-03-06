import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read("public/models/chibi-base.glb");

console.log("=== Base rigged mesh ===");
console.log("Meshes:", doc.getRoot().listMeshes().length);
console.log("Skins:", doc.getRoot().listSkins().length);
console.log("Animations:", doc.getRoot().listAnimations().length);

for (const mesh of doc.getRoot().listMeshes()) {
  console.log("\nMesh:", mesh.getName());
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    const joints = prim.getAttribute("JOINTS_0");
    const weights = prim.getAttribute("WEIGHTS_0");
    console.log("  verts:", pos?.getCount(), "joints:", Boolean(joints), "weights:", Boolean(weights));
  }
}

console.log("\nAll nodes:");
for (const n of doc.getRoot().listNodes()) {
  const name = n.getName();
  if (name) console.log(" ", name);
}
