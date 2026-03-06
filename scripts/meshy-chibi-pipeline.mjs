#!/usr/bin/env node
/**
 * Two-step Meshy pipeline:
 *   1. Text-to-3D: Generate one clean base chibi mesh (smooth geometry, T-pose)
 *   2. Retexture:  Apply each character's skin using Gemini concept images
 *
 * Usage:
 *   node scripts/meshy-chibi-pipeline.mjs base              # Step 1: generate base mesh
 *   node scripts/meshy-chibi-pipeline.mjs texture            # Step 2: retexture all characters
 *   node scripts/meshy-chibi-pipeline.mjs texture ceo dev    # Step 2: retexture specific chars
 *   node scripts/meshy-chibi-pipeline.mjs --status <taskId>  # Check task status
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = resolve(__dirname, "../public/models");
const STATE_FILE = resolve(__dirname, ".meshy-chibi-state.json");

// ─── API config ──────────────────────────────────────────────────────
const API_KEY =
  process.env.MESHY_API ??
  (() => {
    const envPath = resolve(__dirname, "../.env");
    if (existsSync(envPath)) {
      const match = readFileSync(envPath, "utf8").match(/^MESHY_API=(.+)$/m);
      if (match) return match[1].trim();
    }
    return "";
  })();

if (!API_KEY) {
  console.error("Error: MESHY_API not found in env or .env file");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// ─── State management ────────────────────────────────────────────────
function loadState() {
  if (existsSync(STATE_FILE)) {
    try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch {}
  }
  return {};
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Polling ─────────────────────────────────────────────────────────
async function pollTask(endpoint, taskId) {
  const maxWait = 10 * 60 * 1000;
  const interval = 10_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const res = await fetch(`${endpoint}/${taskId}`, { headers });
    if (!res.ok) {
      console.error(`  ✗ Poll error (${res.status}): ${await res.text()}`);
      return null;
    }

    const task = await res.json();
    const status = task.status;
    const progress = task.progress ?? 0;

    process.stdout.write(`\r  ⏳ ${status} (${progress}%)   `);

    if (status === "SUCCEEDED") {
      console.log("");
      return task;
    }
    if (status === "FAILED" || status === "EXPIRED") {
      console.log(`\n  ✗ Task ${status}: ${task.task_error?.message ?? "unknown"}`);
      return null;
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  console.log("\n  ✗ Timed out");
  return null;
}

async function downloadGlb(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`  ✗ Download failed (${res.status})`);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
  console.log(`  ✓ Saved ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
  return true;
}

function imageToDataUri(filePath) {
  const buf = readFileSync(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

// ─── Image-to-3D: convert chibi PNGs directly to 3D models ──────────
async function imageToThreeD(targets) {
  const IMAGE_TO_3D = "https://api.meshy.ai/openapi/v1/image-to-3d";
  const state = loadState();

  console.log("Converting chibi images to 3D models via Meshy image-to-3D...\n");

  for (const name of targets) {
    const imgPath = resolve(MODELS_DIR, `chibi-${name}-ref.png`);
    if (!existsSync(imgPath)) {
      console.error(`  ✗ Image not found: chibi-${name}-ref.png — run generate-chibi.mjs first`);
      continue;
    }

    console.log(`\n  Converting: ${name}`);
    const imageDataUri = imageToDataUri(imgPath);

    const res = await fetch(IMAGE_TO_3D, {
      method: "POST",
      headers,
      body: JSON.stringify({
        image_url: imageDataUri,
        ai_model: "meshy-5",
        topology: "quad",
        target_polycount: 30000,
        should_remesh: true,
      }),
    });

    if (!res.ok) {
      console.error(`    ✗ API error (${res.status}): ${await res.text()}`);
      continue;
    }

    const json = await res.json();
    const taskId = json.result;
    console.log(`    ✓ Task: ${taskId}`);

    state[`img3d_${name}`] = taskId;
    saveState(state);

    const task = await pollTask(IMAGE_TO_3D, taskId);
    if (!task) continue;

    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) {
      console.error(`    ✗ No GLB URL in response`);
      console.log(`    Full response:`, JSON.stringify(task.model_urls, null, 2));
      continue;
    }

    // Backup old model if exists
    const outPath = resolve(MODELS_DIR, `${name}.glb`);
    if (existsSync(outPath)) {
      const bakPath = resolve(MODELS_DIR, `${name}.glb.bak`);
      writeFileSync(bakPath, readFileSync(outPath));
      console.log(`    Backed up old model to ${name}.glb.bak`);
    }

    await downloadGlb(glbUrl, outPath);

    state[`img3d_${name}_status`] = "DONE";
    saveState(state);
  }

  console.log("\n✅ Done! Character models updated in public/models/");
}

// ─── Rig & Animate: auto-rig + apply animations via Meshy ───────────

/**
 * Merge animation clips from multiple GLB files into one.
 * Takes the first file as the base (mesh + skeleton) and copies
 * animation clips from subsequent files, renaming them.
 */
async function mergeAnimationsIntoGlb(basePath, animSources, outPath) {
  const { NodeIO } = await import("@gltf-transform/core");
  const io = new NodeIO();

  const baseDoc = await io.read(basePath);

  for (const { path, clipName } of animSources) {
    const animDoc = await io.read(path);
    const anims = animDoc.getRoot().listAnimations();
    if (anims.length === 0) continue;

    // Copy each animation from the source into the base document
    for (const srcAnim of anims) {
      // Move the animation (and its dependencies) into the base document
      baseDoc.getRoot().listAnimations(); // ensure root is ready
    }

    // Use merge: read the anim doc animations into base
    // gltf-transform doesn't have a direct "copy animation" API,
    // so we merge the full documents and then clean up duplicate meshes
  }

  // Simpler approach: use the CLI merge which handles this correctly
  // Write base first, then merge each animation file on top
  await io.write(outPath, baseDoc);

  for (const { path } of animSources) {
    execSync(
      `npx gltf-transform merge "${outPath}" "${path}" "${outPath}"`,
      { cwd: resolve(__dirname, ".."), stdio: "pipe" }
    );
  }
}

async function rigAndAnimate(targets) {
  const RIG_ENDPOINT = "https://api.meshy.ai/openapi/v1/rigging";
  const ANIM_ENDPOINT = "https://api.meshy.ai/openapi/v1/animations";
  const state = loadState();

  // Idle animation preset (walking comes free from rigging)
  const EXTRA_ANIMS = {
    idle: { action_id: 0 },
  };

  console.log("Rigging & animating characters via Meshy...\n");

  for (const name of targets) {
    const glbPath = resolve(MODELS_DIR, `${name}.glb`);
    if (!existsSync(glbPath)) {
      console.error(`  ✗ Model not found: ${name}.glb — run 'image' step first`);
      continue;
    }

    // ── Step 1: Rig the model ────────────────────────────────────────
    console.log(`\n  Rigging: ${name}`);
    const glbBuf = readFileSync(glbPath);
    const modelDataUri = `data:model/gltf-binary;base64,${glbBuf.toString("base64")}`;

    const rigRes = await fetch(RIG_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model_url: modelDataUri,
        height_meters: 1.0,
      }),
    });

    if (!rigRes.ok) {
      console.error(`    ✗ Rig API error (${rigRes.status}): ${await rigRes.text()}`);
      continue;
    }

    const rigJson = await rigRes.json();
    const rigTaskId = rigJson.result;
    console.log(`    ✓ Rig task: ${rigTaskId}`);

    state[`rig_${name}`] = rigTaskId;
    saveState(state);

    const rigTask = await pollTask(RIG_ENDPOINT, rigTaskId);
    if (!rigTask) continue;

    state[`rig_${name}_status`] = "DONE";
    saveState(state);

    // Extract URLs from rigging result
    const rigResult = rigTask.result ?? rigTask;
    const riggedGlbUrl = rigResult.rigged_character_glb_url;
    const walkingGlbUrl = rigResult.basic_animations?.walking_glb_url;

    // Download rigged base model
    if (riggedGlbUrl) {
      await downloadGlb(riggedGlbUrl, resolve(MODELS_DIR, `${name}-rigged.glb`));
    } else {
      console.error(`    ✗ No rigged GLB URL`);
      continue;
    }

    // Download walking animation (free from rigging)
    const animFiles = [];
    if (walkingGlbUrl) {
      const walkPath = resolve(MODELS_DIR, `${name}-anim-walking.glb`);
      await downloadGlb(walkingGlbUrl, walkPath);
      animFiles.push({ key: "walking", path: walkPath });
    }

    // ── Step 2: Request extra animations (idle) ──────────────────────
    for (const [animKey, preset] of Object.entries(EXTRA_ANIMS)) {
      console.log(`    Animating ${name}: ${animKey} (action_id=${preset.action_id})`);

      const animRes = await fetch(ANIM_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({
          rig_task_id: rigTaskId,
          action_id: preset.action_id,
        }),
      });

      if (!animRes.ok) {
        console.error(`      ✗ Anim API error (${animRes.status}): ${await animRes.text()}`);
        continue;
      }

      const animJson = await animRes.json();
      const animTaskId = animJson.result;
      console.log(`      ✓ Anim task: ${animTaskId}`);

      state[`anim_${name}_${animKey}`] = animTaskId;
      saveState(state);

      const animTask = await pollTask(ANIM_ENDPOINT, animTaskId);
      if (!animTask) continue;

      // Animation endpoint returns result.animation_glb_url
      const animResult = animTask.result ?? animTask;
      const animGlbUrl = animResult.animation_glb_url;
      if (!animGlbUrl) {
        console.error(`      ✗ No animation GLB URL for ${animKey}`);
        continue;
      }

      const animPath = resolve(MODELS_DIR, `${name}-anim-${animKey}.glb`);
      await downloadGlb(animGlbUrl, animPath);
      animFiles.push({ key: animKey, path: animPath });
    }

    // ── Step 3: Merge animations into one GLB ────────────────────────
    if (animFiles.length === 0) {
      console.log(`    ⚠ No animations generated, using rigged model as-is`);
      const riggedPath = resolve(MODELS_DIR, `${name}-rigged.glb`);
      writeFileSync(resolve(MODELS_DIR, `${name}.glb`), readFileSync(riggedPath));
      continue;
    }

    console.log(`    Merging ${animFiles.length} animations into ${name}.glb...`);

    // Start with the first animation GLB (it includes the full rigged mesh + one anim)
    const mergedPath = resolve(MODELS_DIR, `${name}-merged.glb`);
    writeFileSync(mergedPath, readFileSync(animFiles[0].path));
    console.log(`      ✓ Base: ${animFiles[0].key}`);

    // Merge additional animation GLBs on top
    for (let i = 1; i < animFiles.length; i++) {
      const anim = animFiles[i];
      try {
        execSync(
          `npx gltf-transform merge "${mergedPath}" "${anim.path}" "${mergedPath}"`,
          { cwd: resolve(__dirname, ".."), stdio: "pipe" }
        );
        console.log(`      ✓ Merged: ${anim.key}`);
      } catch (err) {
        console.error(`      ✗ Merge failed for ${anim.key}: ${err.message}`);
      }
    }

    // Replace the original model
    const outPath = resolve(MODELS_DIR, `${name}.glb`);
    writeFileSync(resolve(MODELS_DIR, `${name}.unrigged.glb`), readFileSync(outPath));
    writeFileSync(outPath, readFileSync(mergedPath));
    console.log(`    ✓ ${name}.glb updated with ${animFiles.length} animations`);

    // Clean up temp files
    for (const anim of animFiles) {
      if (existsSync(anim.path)) unlinkSync(anim.path);
    }
    if (existsSync(mergedPath)) unlinkSync(mergedPath);

    state[`rig_${name}_final`] = "DONE";
    saveState(state);
  }

  console.log("\n✅ All characters rigged and animated!");
}

// ─── Step 2: Retexture for each character ────────────────────────────
async function retexture(targets) {
  const RETEXTURE = "https://api.meshy.ai/openapi/v1/retexture";
  const state = loadState();

  // We need either a base task ID or the base GLB file
  const baseRefineId = state.baseRefineId;
  const baseGlbPath = resolve(MODELS_DIR, "chibi-base.glb");

  if (!baseRefineId && !existsSync(baseGlbPath)) {
    console.error("No base mesh found. Run 'node scripts/meshy-chibi-pipeline.mjs base' first.");
    process.exit(1);
  }

  const CHARACTERS = {
    ceo: {
      concept: "chibi-ceo-m2.png",
      prompt:
        "Startup CEO character. Dark navy blazer over white t-shirt, dark pants, white sneakers. " +
        "Short neat dark hair on top of head. Simple dot eyes, tiny nose, small calm smile. " +
        "Clean plain skin, no blush. Matte flat colors, Zelda Link's Awakening 2019 style.",
    },
    marketing: {
      concept: "chibi-marketing-m2.png",
      prompt:
        "Marketing lead character. Lavender purple hoodie, black jeans, purple sneakers. " +
        "Wavy auburn hair, medium length. Simple dot eyes, small cheerful smile. " +
        "Clean plain skin, no blush. Matte flat colors, Zelda Link's Awakening 2019 style.",
    },
    sales: {
      concept: "chibi-sales-m2.png",
      prompt:
        "Sales representative character. Green blazer over mint shirt, tan pants, brown shoes. " +
        "Short curly dark-brown hair. Simple dot eyes, friendly smile. " +
        "Clean plain skin, no blush. Matte flat colors, Zelda Link's Awakening 2019 style.",
    },
    dev: {
      concept: "chibi-dev-m2.png",
      prompt:
        "Software engineer character. Charcoal hoodie over amber t-shirt, grey joggers, dark sneakers. " +
        "Black headphones around neck. Messy black hair. Simple dot eyes, thoughtful expression. " +
        "Clean plain skin, no blush. Matte flat colors, Zelda Link's Awakening 2019 style.",
    },
  };

  console.log("Step 2: Retexturing characters onto base mesh...\n");

  for (const name of targets) {
    const char = CHARACTERS[name];
    if (!char) {
      console.warn(`  Unknown character: ${name}`);
      continue;
    }

    console.log(`\n  Retexturing: ${name}`);

    const body = {
      text_style_prompt: char.prompt,
      enable_original_uv: true,
      enable_pbr: false,
      ai_model: "meshy-5",
    };

    // Use concept image as style reference if available
    const conceptPath = resolve(MODELS_DIR, char.concept);
    if (existsSync(conceptPath)) {
      body.image_style_url = imageToDataUri(conceptPath);
      console.log(`    Using concept image: ${char.concept}`);
    }

    // Reference the base mesh
    if (baseRefineId) {
      body.input_task_id = baseRefineId;
    } else {
      const glbBuf = readFileSync(baseGlbPath);
      body.model_url = `data:model/gltf-binary;base64,${glbBuf.toString("base64")}`;
    }

    const res = await fetch(RETEXTURE, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`    ✗ API error (${res.status}): ${await res.text()}`);
      continue;
    }

    const json = await res.json();
    const taskId = json.result;
    console.log(`    ✓ Task: ${taskId}`);

    state[`retexture_${name}`] = taskId;
    saveState(state);

    const task = await pollTask(RETEXTURE, taskId);
    if (!task) continue;

    const glbUrl = task.model_urls?.glb;
    if (!glbUrl) {
      console.error(`    ✗ No GLB URL in response`);
      continue;
    }

    // Backup old model
    const outPath = resolve(MODELS_DIR, `${name}.glb`);
    if (existsSync(outPath)) {
      writeFileSync(resolve(MODELS_DIR, `${name}.glb.bak`), readFileSync(outPath));
    }

    await downloadGlb(glbUrl, outPath);

    state[`retexture_${name}_status`] = "DONE";
    saveState(state);
  }

  console.log("\n✅ Done! Character models updated in public/models/");
}

// ─── CLI ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args[0] === "--status" && args[1]) {
  // Try both endpoints
  for (const base of [
    "https://api.meshy.ai/openapi/v2/text-to-3d",
    "https://api.meshy.ai/openapi/v1/retexture",
  ]) {
    const res = await fetch(`${base}/${args[1]}`, { headers });
    if (res.ok) {
      console.log(JSON.stringify(await res.json(), null, 2));
      process.exit(0);
    }
  }
  console.error("Task not found");
  process.exit(1);
}

if (args[0] === "image") {
  const chars = args.slice(1);
  const targets = chars.length > 0 ? chars : ["ceo", "marketing", "sales", "dev"];
  await imageToThreeD(targets);
} else if (args[0] === "rig") {
  const chars = args.slice(1);
  const targets = chars.length > 0 ? chars : ["ceo", "marketing", "sales", "dev"];
  await rigAndAnimate(targets);
} else if (args[0] === "texture") {
  const chars = args.slice(1);
  const targets = chars.length > 0 ? chars : ["ceo", "marketing", "sales", "dev"];
  await retexture(targets);
} else {
  console.log(`Usage:
  node scripts/meshy-chibi-pipeline.mjs image              # Image-to-3D for all characters
  node scripts/meshy-chibi-pipeline.mjs image ceo dev      # Image-to-3D for specific chars
  node scripts/meshy-chibi-pipeline.mjs rig                # Rig + animate all characters
  node scripts/meshy-chibi-pipeline.mjs rig ceo dev        # Rig + animate specific chars
  node scripts/meshy-chibi-pipeline.mjs texture             # Retexture base mesh (legacy)
  node scripts/meshy-chibi-pipeline.mjs --status <taskId>   # Check task status`);
}
