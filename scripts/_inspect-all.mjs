import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

for (const [name, path] of [
  ["base_nude_mesh", "/tmp/base_nude_mesh.glb"],
  ["standing_idle", "/tmp/standing_idle.glb"],
  ["walking", "/tmp/walking.glb"],
  ["ceo (retextured)", "public/models/ceo.glb"],
]) {
  let doc;
  try {
    doc = await io.read(path);
  } catch (e) {
    console.log("=== " + name + " === FAILED:", e.message);
    continue;
  }
  const root = doc.getRoot();
  console.log("=== " + name + " ===");
  console.log("  Meshes:", root.listMeshes().length);
  console.log("  Skins:", root.listSkins().length);
  console.log("  Animations:", root.listAnimations().length, root.listAnimations().map(a => a.getName()));
  console.log("  Nodes:", root.listNodes().length);

  for (const skin of root.listSkins()) {
    console.log("  Skin:", skin.getName(), "joints:", skin.listJoints().length);
  }

  for (const mesh of root.listMeshes()) {
    console.log("  Mesh:", mesh.getName());
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      const joints = prim.getAttribute("JOINTS_0");
      const weights = prim.getAttribute("WEIGHTS_0");
      console.log("    verts:", pos?.getCount(), "joints attr:", Boolean(joints), "weights attr:", Boolean(weights));
    }
  }

  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    const skin = node.getSkin();
    if (mesh || skin) {
      console.log("  Node:", node.getName(), "| mesh:", mesh?.getName(), "| skin:", Boolean(skin));
    }
  }
  console.log();
}
