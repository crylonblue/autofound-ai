#!/usr/bin/env node
/**
 * Paint character skins onto the base mesh render using Nano Banana.
 * Takes base.png (render of nude mesh) and paints clothing/hair/face onto it.
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS = resolve(__dirname, "../public/models");

const API_KEY =
  process.env.GEMINI_API_KEY ??
  (() => {
    const envPath = resolve(__dirname, "../.env");
    if (existsSync(envPath)) {
      const match = readFileSync(envPath, "utf8").match(/^GEMINI_API_KEY=(.+)$/m);
      if (match) return match[1].trim();
    }
    return "";
  })();

const MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const baseImg = readFileSync(resolve(MODELS, "sketchfab/base.png"));
const baseB64 = baseImg.toString("base64");

// Use CEO painted image as style reference for consistency
const ceoRefPath = resolve(MODELS, "chibi-ceo-painted.png");
const ceoRefB64 = existsSync(ceoRefPath)
  ? readFileSync(ceoRefPath).toString("base64")
  : null;

const styleRef = `\
Paint this 3D character model with clothing and features. \
Keep the exact same body shape, pose, silhouette, and proportions — do not add any geometry, \
hair, or anything that extends beyond the mesh surface. \
Everything must be painted flat onto the existing surface, including hair \
(paint hair as a flat color/pattern directly on the round head, like a painted toy). \
Zelda Link's Awakening 2019 remake style: matte flat colors, simple painted details. \
Simple dot eyes, tiny nose, small mouth. \
Clean plain skin, no blush circles, no cheek markings. \
Keep the same background.`;

const chars = {
  ceo: `${styleRef}
Paint as: Startup CEO. Navy blue blazer over white t-shirt, dark pants, white sneakers. \
Dark brown hair painted flat on the round head like a painted cap. Calm friendly expression.`,

  marketing: `${styleRef}
Paint as: Marketing lead. Lavender purple hoodie, black jeans, purple sneakers. \
Short auburn/red hair painted directly onto the skull surface — must not extend above or beyond the head outline. \
Hair is just a color on the existing round head shape. Cheerful smile.`,

  sales: `${styleRef}
Paint as: Sales representative. Green blazer over mint shirt, tan pants, brown shoes. \
Short dark-brown hair painted directly onto the skull surface — must not extend above or beyond the head outline. \
Hair is just a color on the existing round head shape. Friendly warm smile.`,

  dev: `${styleRef}
Paint as: Software engineer. Charcoal dark hoodie over amber/orange t-shirt, grey joggers, dark sneakers. \
Black hair painted flat on the round head like a painted cap. Thoughtful expression.`,
};

async function gen(name, prompt) {
  console.log(`Painting ${name}...`);

  const parts = [
    { inlineData: { mimeType: "image/png", data: baseB64 } },
  ];

  // Add CEO as style reference for non-CEO characters
  if (name !== "ceo" && ceoRefB64) {
    parts.push({ inlineData: { mimeType: "image/png", data: ceoRefB64 } });
    prompt = `Use the second image as a style reference — match the exact same art style, ` +
      `level of detail, color saturation, face style, and paint quality. ` +
      `Only change the outfit, hair color, and expression.\n${prompt}`;
  }

  parts.push({ text: prompt });

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });

  if (!res.ok) {
    console.error(`  ${name} failed: ${res.status} ${await res.text()}`);
    return;
  }

  const json = await res.json();
  const respParts = json.candidates?.[0]?.content?.parts ?? [];
  const img = respParts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));

  if (!img) {
    console.error(`  ${name}: no image returned`);
    respParts.filter((p) => p.text).forEach((p) => console.log(`  ${p.text}`));
    return;
  }

  const buf = Buffer.from(img.inlineData.data, "base64");
  writeFileSync(resolve(MODELS, `chibi-${name}-painted.png`), buf);
  console.log(`  Done (${(buf.length / 1024).toFixed(0)} KB)`);
}

const args = process.argv.slice(2);
const targets = args.length > 0
  ? Object.entries(chars).filter(([k]) => args.includes(k))
  : Object.entries(chars);

await Promise.all(targets.map(([k, v]) => gen(k, v)));
console.log("\nAll done!");
