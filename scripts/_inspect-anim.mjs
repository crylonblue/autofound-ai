import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read("public/models/animations/idle.glb");

for (const anim of doc.getRoot().listAnimations()) {
  console.log("Animation:", anim.getName());
  for (const channel of anim.listChannels()) {
    const target = channel.getTargetNode();
    const path = channel.getTargetPath();
    const sampler = channel.getSampler();
    const input = sampler?.getInput();
    const output = sampler?.getOutput();
    console.log(
      "  Channel:", target?.getName(), path,
      "| keys:", input?.getCount(),
      "| duration:", input ? input.getElement(input.getCount() - 1, [0])[0].toFixed(2) + "s" : "?"
    );
  }
}

// List all nodes to see skeleton hierarchy
console.log("\nNode hierarchy:");
for (const node of doc.getRoot().listNodes()) {
  const children = node.listChildren();
  const t = node.getTranslation();
  console.log(" ", node.getName(), "| children:", children.length, "| pos:", t.map(v => v.toFixed(3)).join(","));
}
