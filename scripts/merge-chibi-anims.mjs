#!/usr/bin/env node
/**
 * Merge animation clips from multiple rigged GLBs into one,
 * then transfer the texture from the original (unrigged) model.
 *
 * Usage:
 *   node scripts/merge-chibi-anims.mjs              # all characters
 *   node scripts/merge-chibi-anims.mjs ceo dev      # specific characters
 */

import { NodeIO } from "@gltf-transform/core";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS = resolve(__dirname, "../public/models");
const io = new NodeIO();

async function mergeCharacter(name) {
  const origPath = resolve(MODELS, `${name}.unrigged.glb`);
  const riggedPath = resolve(MODELS, `${name}-rigged.glb`);

  if (!existsSync(riggedPath)) {
    console.error(`  ✗ ${name}-rigged.glb not found`);
    return false;
  }

  console.log(`\n  Processing: ${name}`);

  // Load the rigged base model (has skeleton, no texture)
  const riggedDoc = await io.read(riggedPath);

  // ─── Collect animation GLBs ───────────────────────────────────────
  // Look for individual animation files, or use the rigged model's own animation
  const animNames = ["idle", "walking"];
  const animDocs = [];

  for (const animName of animNames) {
    const animPath = resolve(MODELS, `${name}-anim-${animName}.glb`);
    if (existsSync(animPath)) {
      const doc = await io.read(animPath);
      animDocs.push({ name: animName, doc });
    }
  }

  // ─── Copy animations from animation GLBs into the rigged doc ─────
  // We can't directly copy animations between documents in gltf-transform,
  // so instead we build the final GLB by starting from an animation file
  // (which has the rigged mesh + one animation) and merging in additional
  // animation clips.

  // Strategy: use the first animation doc as the base, and manually add
  // animation accessors from additional docs.
  // Since gltf-transform merge duplicates scenes, we'll take a different
  // approach: load each animation GLB, keep only the first one's scene,
  // and remap animation channels from the others.

  let baseDoc;
  if (animDocs.length > 0) {
    // Use first animation file as base (has mesh + skeleton + 1 animation)
    baseDoc = animDocs[0].doc;
    console.log(`    Base animation: ${animDocs[0].name}`);

    // For additional animations, we need to copy their animation data
    // Since the skeleton structure is identical across all files from the
    // same rig task, the node names and indices match.
    for (let i = 1; i < animDocs.length; i++) {
      const srcDoc = animDocs[i].doc;
      const srcAnims = srcDoc.getRoot().listAnimations();

      // Build a map from source node names to base doc nodes
      const baseNodes = new Map();
      baseDoc
        .getRoot()
        .listNodes()
        .forEach((n) => {
          if (n.getName()) baseNodes.set(n.getName(), n);
        });

      for (const srcAnim of srcAnims) {
        // Create a new animation in the base document
        const newAnim = baseDoc
          .createAnimation()
          .setName(srcAnim.getName() || animDocs[i].name);

        for (const srcChannel of srcAnim.listChannels()) {
          const srcSampler = srcChannel.getSampler();
          const srcTargetNode = srcChannel.getTargetNode();
          const targetPath = srcChannel.getTargetPath();

          if (!srcSampler || !srcTargetNode) continue;

          // Find corresponding node in base doc by name
          const targetNode = baseNodes.get(srcTargetNode.getName());
          if (!targetNode) continue;

          // Copy sampler data (input/output accessors)
          const srcInput = srcSampler.getInput();
          const srcOutput = srcSampler.getOutput();
          if (!srcInput || !srcOutput) continue;

          const newInput = baseDoc
            .createAccessor()
            .setType(srcInput.getType())
            .setArray(srcInput.getArray().slice());

          const newOutput = baseDoc
            .createAccessor()
            .setType(srcOutput.getType())
            .setArray(srcOutput.getArray().slice());

          const newSampler = baseDoc
            .createAnimationSampler()
            .setInput(newInput)
            .setOutput(newOutput)
            .setInterpolation(srcSampler.getInterpolation());

          const newChannel = baseDoc
            .createAnimationChannel()
            .setSampler(newSampler)
            .setTargetNode(targetNode)
            .setTargetPath(targetPath);

          newAnim.addSampler(newSampler);
          newAnim.addChannel(newChannel);
        }

        console.log(
          `    Merged animation: ${animDocs[i].name} (${newAnim.listChannels().length} channels)`
        );
      }
    }
  } else {
    // No separate animation files, just use the rigged model
    baseDoc = riggedDoc;
    console.log(`    No animation files found, using rigged model only`);
  }

  // ─── Transfer texture from original model ─────────────────────────
  if (existsSync(origPath)) {
    console.log(`    Transferring texture from original model...`);
    const origDoc = await io.read(origPath);
    const origMaterials = origDoc.getRoot().listMaterials();

    if (origMaterials.length > 0) {
      const origMat = origMaterials[0];
      const origTexInfo = origMat.getBaseColorTextureInfo();
      const origTex = origMat.getBaseColorTexture();

      if (origTex) {
        // Copy texture image data into base doc
        const imgData = origTex.getImage();
        const mimeType = origTex.getMimeType();

        const newTex = baseDoc
          .createTexture()
          .setImage(imgData)
          .setMimeType(mimeType);

        // Create material with the texture
        const newMat = baseDoc
          .createMaterial()
          .setBaseColorTexture(newTex)
          .setDoubleSided(true)
          .setRoughnessFactor(0.8)
          .setMetallicFactor(0.02);

        // Apply material to all meshes
        baseDoc
          .getRoot()
          .listMeshes()
          .forEach((mesh) => {
            mesh.listPrimitives().forEach((prim) => {
              prim.setMaterial(newMat);
            });
          });

        console.log(`    ✓ Texture applied (${mimeType})`);
      } else {
        console.log(`    ⚠ No base color texture found in original`);
      }
    }
  } else {
    console.log(`    ⚠ Original model not found, no texture to transfer`);
  }

  // ─── Normalize Hips bone across animations ──────────────────────────
  // Meshy's animations have mismatched Hips translation Y and scale
  // between idle and walking, causing the character to sink/shrink.
  {
    const allAnims = baseDoc.getRoot().listAnimations();

    // Collect idle Hips reference values (Y translation + scale)
    let idleHipsY = null;
    let idleHipsScale = null;
    for (const anim of allAnims) {
      const name = anim.getName().toLowerCase();
      if (!name.includes("idle")) continue;
      for (const ch of anim.listChannels()) {
        const node = ch.getTargetNode();
        if (node?.getName() !== "Hips") continue;
        const arr = ch.getSampler()?.getOutput()?.getArray();
        if (!arr) continue;

        if (ch.getTargetPath() === "translation") {
          let sum = 0, count = 0;
          for (let i = 1; i < arr.length; i += 3) { sum += arr[i]; count++; }
          idleHipsY = sum / count;
        }
        if (ch.getTargetPath() === "scale") {
          // Use first keyframe scale
          idleHipsScale = [arr[0], arr[1], arr[2]];
        }
      }
    }

    // Adjust other animations to match idle
    for (const anim of allAnims) {
      const name = anim.getName().toLowerCase();
      if (name.includes("idle")) continue;

      for (const ch of anim.listChannels()) {
        const node = ch.getTargetNode();
        if (node?.getName() !== "Hips") continue;
        const output = ch.getSampler()?.getOutput();
        if (!output) continue;
        const arr = output.getArray();

        // Fix translation Y
        if (ch.getTargetPath() === "translation" && idleHipsY !== null) {
          let sum = 0, count = 0;
          for (let i = 1; i < arr.length; i += 3) { sum += arr[i]; count++; }
          const avgY = sum / count;
          const offset = idleHipsY - avgY;
          if (Math.abs(offset) > 0.5) {
            for (let i = 1; i < arr.length; i += 3) arr[i] += offset;
            output.setArray(arr);
            console.log(`    Normalized ${anim.getName()} Hips Y: offset ${offset.toFixed(1)}`);
          }
        }

        // Fix scale to match idle
        if (ch.getTargetPath() === "scale" && idleHipsScale !== null) {
          const curScale = [arr[0], arr[1], arr[2]];
          const diff = Math.abs(curScale[0] - idleHipsScale[0]);
          if (diff > 0.01) {
            for (let i = 0; i < arr.length; i += 3) {
              arr[i] = idleHipsScale[0];
              arr[i + 1] = idleHipsScale[1];
              arr[i + 2] = idleHipsScale[2];
            }
            output.setArray(arr);
            console.log(`    Normalized ${anim.getName()} Hips scale: ${curScale[0].toFixed(3)} -> ${idleHipsScale[0].toFixed(3)}`);
          }
        }
      }
    }
  }

  // ─── Rename animations for Three.js compatibility ─────────────────
  const anims = baseDoc.getRoot().listAnimations();
  for (const anim of anims) {
    const animName = anim.getName().toLowerCase();
    if (animName.includes("idle")) {
      anim.setName("idle");
    } else if (animName.includes("walking") || animName.includes("walk")) {
      anim.setName("walking");
    }
  }

  // ─── Save the final merged GLB ────────────────────────────────────
  const outPath = resolve(MODELS, `${name}.glb`);
  await io.write(outPath, baseDoc);
  const size = (readFileSync(outPath).length / 1024).toFixed(0);
  console.log(`    ✓ Saved ${name}.glb (${size} KB)`);

  // List final animations
  const finalAnims = baseDoc.getRoot().listAnimations();
  console.log(
    `    Animations: ${finalAnims.map((a) => a.getName()).join(", ")}`
  );

  return true;
}

// ─── CLI ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const targets =
  args.length > 0 ? args : ["ceo", "marketing", "sales", "dev"];

console.log("Merging animations + textures...");

for (const name of targets) {
  await mergeCharacter(name);
}

console.log("\n✅ Done!");
