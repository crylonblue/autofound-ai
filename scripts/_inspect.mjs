import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const idle = await io.read("/tmp/standing_idle.glb");

console.log("Meshes:", idle.getRoot().listMeshes().length);
console.log("Skins:", idle.getRoot().listSkins().length);
console.log("Animations:", idle.getRoot().listAnimations().map((a) => a.getName()));
console.log("Textures:", idle.getRoot().listTextures().length);

for (const mesh of idle.getRoot().listMeshes()) {
  console.log("Mesh:", mesh.getName());
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    const joints = prim.getAttribute("JOINTS_0");
    const weights = prim.getAttribute("WEIGHTS_0");
    const uv = prim.getAttribute("TEXCOORD_0");
    console.log("  verts:", pos?.getCount(), "joints:", Boolean(joints), "weights:", Boolean(weights), "uv:", Boolean(uv));
  }
}

console.log("\nSkinned nodes:");
idle.getRoot().listNodes().forEach((n) => {
  const m = n.getMesh();
  const s = n.getSkin();
  if (m || s) console.log(" ", n.getName(), "| mesh:", m?.getName(), "| skin:", Boolean(s));
});
