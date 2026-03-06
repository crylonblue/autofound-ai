#!/usr/bin/env node
/**
 * Bake Mixamo FBX animations into a single GLB per character.
 *
 * Requires Blender installed and accessible via CLI.
 *
 * Expected input layout in public/models/animations/:
 *   {character}-rigged.fbx           — rigged T-pose from Mixamo (With Skin)
 *   {character}@idle.fbx             — animation FBX (Without Skin)
 *   {character}@walking.fbx
 *   {character}@waving.fbx
 *   {character}@typing.fbx
 *
 * Output:
 *   public/models/{character}.glb    — single GLB with all animations embedded
 *
 * Usage:
 *   node scripts/bake-animations.mjs              # all characters
 *   node scripts/bake-animations.mjs ceo dev      # specific characters
 *   node scripts/bake-animations.mjs --no-optimize # skip gltf-transform optimization
 */

import { execSync } from "child_process";
import { existsSync, writeFileSync, unlinkSync, readdirSync, mkdirSync } from "fs";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = resolve(__dirname, "../public/models");
const ANIMS_DIR = resolve(MODELS_DIR, "animations");
const CHARACTERS = ["ceo", "marketing", "sales", "dev"];

// ─── Detect Blender ──────────────────────────────────────────────────
function findBlender() {
  const candidates = [
    "blender",
    "/Applications/Blender.app/Contents/MacOS/Blender",
  ];
  for (const bin of candidates) {
    try {
      execSync(`"${bin}" --version`, { stdio: "ignore" });
      return bin;
    } catch {}
  }
  return null;
}

const blender = findBlender();
if (!blender) {
  console.error("Error: Blender not found. Install: brew install --cask blender");
  process.exit(1);
}

// ─── CLI args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const skipOptimize = args.includes("--no-optimize");
const charArgs = args.filter((a) => !a.startsWith("--"));
const targets = charArgs.length > 0 ? charArgs.filter((a) => CHARACTERS.includes(a)) : CHARACTERS;

if (!existsSync(ANIMS_DIR)) {
  console.error(`Animation directory not found: ${ANIMS_DIR}`);
  console.error("Run 'node scripts/glb-to-fbx.mjs' first and follow the Mixamo instructions.");
  process.exit(1);
}

// ─── Blender Python script ──────────────────────────────────────────
function makePythonScript(character, riggedFbx, animFiles, outputGlb) {
  const animImports = animFiles
    .map(({ path, name }) => {
      return `
# Import animation: ${name}
bpy.ops.import_scene.fbx(filepath=r"${path}")
anim_armature = None
for obj in bpy.context.selected_objects:
    if obj.type == 'ARMATURE':
        anim_armature = obj
        break

if anim_armature and anim_armature.animation_data and anim_armature.animation_data.action:
    action = anim_armature.animation_data.action
    action.name = "${name}"
    # Copy action to main armature
    if main_armature.animation_data is None:
        main_armature.animation_data_create()
    track = main_armature.animation_data.nla_tracks.new()
    track.name = "${name}"
    track.strips.new("${name}", int(action.frame_range[0]), action)
    track.mute = True  # muted NLA tracks = stored but not playing
    # Also store in blend file
    action.use_fake_user = True

# Delete imported anim armature
for obj in bpy.context.selected_objects:
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
`;
    })
    .join("\n");

  return `
import bpy
import sys

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for block in bpy.data.meshes:
    if block.users == 0:
        bpy.data.meshes.remove(block)
for block in bpy.data.armatures:
    if block.users == 0:
        bpy.data.armatures.remove(block)

# Import rigged character
bpy.ops.import_scene.fbx(filepath=r"${riggedFbx}")

# Find the main armature
main_armature = None
for obj in bpy.context.scene.objects:
    if obj.type == 'ARMATURE':
        main_armature = obj
        break

if not main_armature:
    print("ERROR: No armature found in rigged FBX!")
    sys.exit(1)

print(f"Main armature: {main_armature.name}")

# Store the T-pose/rest action
if main_armature.animation_data and main_armature.animation_data.action:
    main_armature.animation_data.action.name = "TPose"
    main_armature.animation_data.action.use_fake_user = True

bpy.ops.object.select_all(action='DESELECT')

${animImports}

# Select all objects for export
bpy.ops.object.select_all(action='SELECT')

# Set the first real animation as active (idle preferred)
if main_armature.animation_data:
    for action in bpy.data.actions:
        if action.name == "idle":
            main_armature.animation_data.action = action
            break

# Export as GLB
bpy.ops.export_scene.gltf(
    filepath=r"${outputGlb}",
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_nla_strips=True,
    export_current_frame=False,
)

print(f"Exported: ${outputGlb}")
`;
}

// ─── Process each character ─────────────────────────────────────────
for (const character of targets) {
  console.log(`\nProcessing: ${character}`);

  const riggedFbx = resolve(ANIMS_DIR, `${character}-rigged.fbx`);
  if (!existsSync(riggedFbx)) {
    console.warn(`  Skipping: ${riggedFbx} not found`);
    continue;
  }

  // Find animation files: {character}@{anim}.fbx
  const allFiles = readdirSync(ANIMS_DIR);
  const animFiles = allFiles
    .filter((f) => f.startsWith(`${character}@`) && f.endsWith(".fbx"))
    .map((f) => ({
      path: resolve(ANIMS_DIR, f).replace(/\\/g, "/"),
      name: basename(f, ".fbx").split("@")[1],
    }));

  if (animFiles.length === 0) {
    console.warn(`  No animation files found (expected ${character}@idle.fbx etc.)`);
    continue;
  }

  console.log(`  Found ${animFiles.length} animations: ${animFiles.map((a) => a.name).join(", ")}`);

  const outputGlb = resolve(MODELS_DIR, `${character}.glb`);
  const script = makePythonScript(
    character,
    riggedFbx.replace(/\\/g, "/"),
    animFiles,
    outputGlb.replace(/\\/g, "/")
  );

  const tmpScript = resolve(__dirname, `_tmp_bake_${character}.py`);
  writeFileSync(tmpScript, script);

  try {
    execSync(`"${blender}" --background --python "${tmpScript}"`, {
      stdio: "pipe",
    });
    console.log(`  ✓ Exported ${outputGlb}`);
  } catch (err) {
    console.error(`  ✗ Blender export failed:`, err.message);
    continue;
  } finally {
    try { unlinkSync(tmpScript); } catch {}
  }

  // Optimize with gltf-transform
  if (!skipOptimize) {
    console.log(`  Optimizing with gltf-transform...`);
    try {
      // Resize textures to 512 max
      execSync(
        `npx gltf-transform resize "${outputGlb}" "${outputGlb}" --width 512 --height 512`,
        { stdio: "pipe", cwd: resolve(__dirname, "..") }
      );
      // Draco compression
      execSync(
        `npx gltf-transform draco "${outputGlb}" "${outputGlb}"`,
        { stdio: "pipe", cwd: resolve(__dirname, "..") }
      );
      console.log(`  ✓ Optimized`);
    } catch (err) {
      console.warn(`  ⚠ Optimization failed (non-fatal):`, err.message);
    }
  }
}

console.log("\nDone! Rigged + animated GLBs are in public/models/");
console.log("The old static models have been replaced.");
