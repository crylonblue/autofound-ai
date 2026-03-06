import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read("public/models/ceo.glb");
const root = doc.getRoot();

console.log("=== Rigged CEO ===");
console.log("Meshes:", root.listMeshes().length);
console.log("Skins:", root.listSkins().length);
console.log("Animations:", root.listAnimations().length, root.listAnimations().map(a => a.getName()));
console.log("Nodes:", root.listNodes().length);

for (const skin of root.listSkins()) {
  console.log("Skin:", skin.getName(), "joints:", skin.listJoints().length);
  const ibm = skin.getInverseBindMatrices();
  console.log("  IBM accessor:", ibm?.getCount(), "elements, type:", ibm?.getType());
}

for (const mesh of root.listMeshes()) {
  console.log("Mesh:", mesh.getName());
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute("POSITION");
    const joints = prim.getAttribute("JOINTS_0");
    const weights = prim.getAttribute("WEIGHTS_0");
    console.log("  verts:", pos?.getCount(), "joints:", Boolean(joints), "weights:", Boolean(weights));
    if (joints) console.log("    joints type:", joints.getType(), "count:", joints.getCount());
    if (weights) console.log("    weights type:", weights.getType(), "count:", weights.getCount());
  }
}

for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  const skin = node.getSkin();
  if (mesh || skin) {
    console.log("Node:", node.getName(), "| mesh:", mesh?.getName(), "| skin:", Boolean(skin));
  }
}

for (const anim of root.listAnimations()) {
  console.log("\nAnimation:", anim.getName(), "channels:", anim.listChannels().length);
  for (const ch of anim.listChannels().slice(0, 3)) {
    const target = ch.getTargetNode();
    console.log("  →", target?.getName(), ch.getTargetPath());
  }
  if (anim.listChannels().length > 3) console.log("  ... +" + (anim.listChannels().length - 3) + " more");
}
