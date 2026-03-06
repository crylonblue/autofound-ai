#!/usr/bin/env node
/**
 * Convert chibi PNG images to 3D GLB models using Meshy API.
 *
 * Usage:
 *   node scripts/meshy-image-to-3d.mjs                     # all 4 ACNH chibis
 *   node scripts/meshy-image-to-3d.mjs ceo                  # just one
 *   node scripts/meshy-image-to-3d.mjs --status <taskId>    # check a task
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = resolve(__dirname, "../public/models");

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

const BASE = "https://api.meshy.ai/openapi/v1/image-to-3d";
const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// ─── Characters ──────────────────────────────────────────────────────
const CHARACTERS = {
  ceo: { src: "chibi-ceo-m2.png", out: "ceo.glb" },
  marketing: { src: "chibi-marketing-m2.png", out: "marketing.glb" },
  sales: { src: "chibi-sales-m2.png", out: "sales.glb" },
  dev: { src: "chibi-dev-m2.png", out: "dev.glb" },
};

// ─── Helpers ─────────────────────────────────────────────────────────
function imageToDataUri(filePath) {
  const buf = readFileSync(filePath);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

async function createTask(name, dataUri) {
  console.log(`\n🚀 Creating Meshy task for ${name}...`);

  const res = await fetch(BASE, {
    method: "POST",
    headers,
    body: JSON.stringify({
      image_url: dataUri,
      ai_model: "meshy-5",
      topology: "triangle",
      target_polycount: 8000,
      should_texture: true,
      enable_pbr: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ✗ API error (${res.status}): ${err}`);
    return null;
  }

  const json = await res.json();
  const taskId = json.result || json.id;
  console.log(`  ✓ Task created: ${taskId}`);
  return taskId;
}

async function pollTask(taskId) {
  const maxWait = 10 * 60 * 1000; // 10 minutes
  const interval = 10_000; // 10 seconds
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const res = await fetch(`${BASE}/${taskId}`, { headers });
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
      console.log(`\n  ✗ Task ${status}: ${task.task_error?.message ?? "unknown error"}`);
      return null;
    }

    await new Promise((r) => setTimeout(r, interval));
  }

  console.log("\n  ✗ Timed out waiting for task");
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

// ─── Status check ────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args[0] === "--status" && args[1]) {
  const res = await fetch(`${BASE}/${args[1]}`, { headers });
  console.log(JSON.stringify(await res.json(), null, 2));
  process.exit(0);
}

// ─── Main ────────────────────────────────────────────────────────────
const targets =
  args.length > 0
    ? args.filter((a) => a in CHARACTERS)
    : Object.keys(CHARACTERS);

if (targets.length === 0) {
  console.error(`Unknown character. Available: ${Object.keys(CHARACTERS).join(", ")}`);
  process.exit(1);
}

// Track state for resume (in case of interruption)
const stateFile = resolve(__dirname, ".meshy-tasks.json");
let state = {};
if (existsSync(stateFile)) {
  try { state = JSON.parse(readFileSync(stateFile, "utf8")); } catch {}
}

for (const name of targets) {
  const char = CHARACTERS[name];
  const srcPath = resolve(MODELS_DIR, char.src);
  const outPath = resolve(MODELS_DIR, char.out);

  if (!existsSync(srcPath)) {
    console.error(`\n✗ Source image not found: ${srcPath}`);
    continue;
  }

  // Check if we have a pending task from a previous run
  let taskId = state[name]?.taskId;

  if (!taskId) {
    const dataUri = imageToDataUri(srcPath);
    taskId = await createTask(name, dataUri);
    if (!taskId) continue;

    // Save state
    state[name] = { taskId, status: "PENDING" };
    writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } else {
    console.log(`\n♻️  Resuming ${name} task: ${taskId}`);
  }

  // Poll until done
  const task = await pollTask(taskId);
  if (!task) continue;

  // Download GLB
  const glbUrl = task.model_urls?.glb;
  if (!glbUrl) {
    console.error(`  ✗ No GLB URL in response`);
    console.log("  Model URLs:", JSON.stringify(task.model_urls, null, 2));
    continue;
  }

  // Backup old model
  if (existsSync(outPath)) {
    const backupPath = resolve(MODELS_DIR, `${char.out}.bak`);
    writeFileSync(backupPath, readFileSync(outPath));
    console.log(`  📦 Backed up old ${char.out} → ${char.out}.bak`);
  }

  await downloadGlb(glbUrl, outPath);

  // Update state
  state[name] = { taskId, status: "DONE" };
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

console.log("\n✅ Done!");
