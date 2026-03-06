#!/usr/bin/env node
/**
 * Convert GLB models → FBX for Mixamo upload.
 *
 * Requires Blender installed and accessible via CLI.
 *   brew install --cask blender   (macOS)
 *
 * Usage:
 *   node scripts/glb-to-fbx.mjs              # convert all 4 characters
 *   node scripts/glb-to-fbx.mjs ceo dev      # convert specific characters
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = resolve(__dirname, "../public/models");
const CHARACTERS = ["ceo", "marketing", "sales", "dev"];

// Detect Blender binary
function findBlender() {
  const candidates = [
    "blender",
    "/Applications/Blender.app/Contents/MacOS/Blender",
  ];
  for (const bin of candidates) {
    try {
      execSync(`"${bin}" --version`, { stdio: "ignore" });
      return bin;
    } catch {
      // not found, try next
    }
  }
  return null;
}

const blender = findBlender();
if (!blender) {
  console.error(
    "Error: Blender not found. Install it with: brew install --cask blender"
  );
  process.exit(1);
}

// Parse CLI args
const args = process.argv.slice(2);
const targets = args.length > 0 ? args.filter((a) => CHARACTERS.includes(a)) : CHARACTERS;

if (targets.length === 0) {
  console.error(`Unknown character(s). Available: ${CHARACTERS.join(", ")}`);
  process.exit(1);
}

// Blender Python script for GLB → FBX conversion
const blenderScript = (inputPath, outputPath) => `
import bpy
import sys

# Clear default scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Import GLB
bpy.ops.import_scene.gltf(filepath="${inputPath}")

# Select all imported objects
bpy.ops.object.select_all(action='SELECT')

# Export as FBX
bpy.ops.export_scene.fbx(
    filepath="${outputPath}",
    use_selection=True,
    apply_scale_options='FBX_SCALE_ALL',
    bake_anim=False,
    add_leaf_bones=False,
    path_mode='COPY',
    embed_textures=True,
)

print(f"Exported: ${outputPath}")
`;

console.log(`Using Blender: ${blender}\n`);

for (const name of targets) {
  const inputPath = resolve(MODELS_DIR, `${name}.glb`);
  const outputPath = resolve(MODELS_DIR, `${name}.fbx`);

  if (!existsSync(inputPath)) {
    console.warn(`  Skipping ${name}: ${inputPath} not found`);
    continue;
  }

  console.log(`  Converting ${name}.glb → ${name}.fbx ...`);

  try {
    const script = blenderScript(
      inputPath.replace(/\\/g, "/"),
      outputPath.replace(/\\/g, "/")
    );
    execSync(
      `"${blender}" --background --python-expr "${script.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`,
      { stdio: "pipe" }
    );
    console.log(`  ✓ ${outputPath}`);
  } catch (err) {
    // Blender python-expr with escaping is fragile — fall back to temp file
    const { writeFileSync, unlinkSync } = await import("fs");
    const tmpScript = resolve(__dirname, `_tmp_convert_${name}.py`);
    writeFileSync(
      tmpScript,
      blenderScript(
        inputPath.replace(/\\/g, "/"),
        outputPath.replace(/\\/g, "/")
      )
    );
    try {
      execSync(`"${blender}" --background --python "${tmpScript}"`, {
        stdio: "pipe",
      });
      console.log(`  ✓ ${outputPath}`);
    } catch (err2) {
      console.error(`  ✗ Failed to convert ${name}:`, err2.message);
    } finally {
      try { unlinkSync(tmpScript); } catch {}
    }
  }
}

console.log("\nDone! Upload the .fbx files to mixamo.com for rigging.");
console.log(`
═══════════════════════════════════════════════════════
  NEXT STEPS — Manual Mixamo Rigging
═══════════════════════════════════════════════════════

1. Go to https://www.mixamo.com and sign in with your Adobe account

2. For EACH character FBX:
   a. Click "Upload Character" → select the .fbx file
   b. Place rigging markers (chin, wrists, elbows, knees, groin)
   c. Click "Next" → auto-rig completes

3. Download animations for each character:
   - "Idle"         — subtle breathing/shifting
   - "Walking"      — standard walk cycle
   - "Waving"       — greeting gesture
   - "Typing"       — seated keyboard typing

4. For EACH animation, click "Download" with settings:
   - Format: FBX Binary
   - Skin: "Without Skin" (for animations)
   - Also download the T-pose with "With Skin" (base mesh)

5. Place all downloaded files in:
   public/models/animations/

   Naming convention:
     {character}@{animation}.fbx
     e.g. ceo@idle.fbx, ceo@walking.fbx, dev@typing.fbx

   Plus the rigged base mesh:
     {character}-rigged.fbx
     e.g. ceo-rigged.fbx

6. Then run:  node scripts/bake-animations.mjs
═══════════════════════════════════════════════════════
`);
