#!/usr/bin/env node
/**
 * Generate chibi T-pose character sheets using Gemini (Nano Banana) image API.
 *
 * Usage:
 *   node scripts/generate-chibi.mjs                        # all chars, default (toon) style
 *   node scripts/generate-chibi.mjs --style voxel           # all chars, voxel style
 *   node scripts/generate-chibi.mjs --style pixel ceo       # one char, pixel style
 *   node scripts/generate-chibi.mjs --list                  # print all prompts
 *   node scripts/generate-chibi.mjs --styles                # list available styles
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../public/models");

// ─── Reference image ─────────────────────────────────────────────────
const REF_IMG_PATH = resolve(OUT_DIR, "chibi style.jpg");
const REF_IMG_B64 = existsSync(REF_IMG_PATH)
  ? readFileSync(REF_IMG_PATH).toString("base64")
  : null;

if (!REF_IMG_B64) {
  console.warn("Warning: Reference image 'chibi style.jpg' not found — generating without style reference.");
}

// ─── API config ──────────────────────────────────────────────────────
const API_KEY =
  process.env.GEMINI_API_KEY ??
  (() => {
    const envPath = resolve(__dirname, "../.env");
    if (existsSync(envPath)) {
      const match = readFileSync(envPath, "utf8").match(
        /^GEMINI_API_KEY=(.+)$/m
      );
      if (match) return match[1].trim();
    }
    return "";
  })();

if (!API_KEY && !process.argv.includes("--list") && !process.argv.includes("--styles")) {
  console.error("Error: GEMINI_API_KEY not found in env or .env file");
  process.exit(1);
}

const MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

// ─── Style preambles ────────────────────────────────────────────────

const STYLES = {
  ref: {
    label: "Reference Image Match",
    preamble: `\
Generate a 3D chibi character that exactly matches the style of the provided reference image. \
Same proportions (large head, small body, short limbs), same smooth matte clay/vinyl material, \
same T-pose with arms extended straight out to both sides. \
Same warm color palette, same level of detail, same figurine aesthetic. \
The character should look like it belongs in the same toy collection as the reference. \
Front-facing view, light grey background. No props, no text.`,
  },

  simple: {
    label: "Simple Matte Chibi",
    preamble: `\
3D render in the style of The Legend of Zelda: Link's Awakening (2019 remake). \
Full-body character in a strict T-pose: arms extended perfectly horizontal, \
straight out to both sides at exact shoulder height, palms facing down. \
Smooth matte plastic figurine, flat colors, simple rounded shapes. \
Clean plain skin, no blush marks, no cheek circles, no face markings. \
Dot eyes, tiny nose, small mouth. Mitten hands, no fingers. \
Front-facing view, symmetrical, light-grey background. \
No props, no text.`,
  },

  toon: {
    label: "Toon / Cel-shaded",
    preamble: `\
Chibi / super-deformed full-body character in a perfect T-pose (arms extended \
straight out to both sides, palms facing down, fingers relaxed). \
2.5-head-tall proportions: oversized round head, large glossy anime eyes, \
tiny nose, small curved mouth, compact torso, short stubby limbs. \
Clean toon / cel-shaded 3D render style with bold dark outlines, \
vibrant flat colors, soft ambient-occlusion shading only. \
Single front-facing view, feet flat on the ground, symmetrical pose. \
Solid flat light-grey (#F0F0F0) background. \
No props, no extra characters, no text. \
High-resolution, suitable as a reference sheet for 3D character modeling.`,
  },

  voxel: {
    label: "Voxel / Blocky",
    preamble: `\
Voxel-art full-body character in a perfect T-pose (arms extended straight out \
to both sides, blocky cube-shaped hands, fingers not visible). \
Chunky cubic proportions: large blocky head (roughly 3×3×3 voxels), \
small rectangular torso, thick square limbs made of visible voxel cubes. \
Minecraft / CrossyRoad / voxel-game aesthetic: each "pixel" is a tiny 3D cube, \
visible stepped edges, no smooth curves. \
Bold saturated colors per block, subtle baked ambient-occlusion shadows between cubes. \
Isometric-style 3/4 front-facing view, standing on a single flat voxel tile. \
Solid flat light-grey (#F0F0F0) background. \
No props, no extra characters, no text. \
High-resolution, crisp voxel edges, suitable as a reference for 3D voxel modeling.`,
  },

  clay: {
    label: "Claymation / Stop-motion",
    preamble: `\
Full-body chibi character in a perfect T-pose (arms extended straight out to both sides) \
rendered as a handmade claymation / stop-motion puppet. \
2.5-head-tall proportions: large round head sculpted from smooth clay, \
small compact body with visible clay seams and subtle fingerprint-like surface texture. \
Simple sculpted facial features: small bead-like eyes pressed into the clay, \
tiny rolled-clay nose, thin sculpted smile line. \
Slightly imperfect hand-crafted look — gentle asymmetry, soft bumpy surfaces, \
visible where pieces of clay were joined together. \
Warm muted earthy color palette with slightly desaturated tones, \
like real plasticine / polymer clay (Wallace & Gromit, Coraline aesthetic). \
Soft diffuse studio lighting as if on a miniature stop-motion set, \
gentle shadows, warm fill light. \
Single front-facing view, standing on a small clay base/platform, symmetrical T-pose. \
Solid flat light-grey (#F0F0F0) background. \
No props, no extra characters, no text. \
High-resolution photograph-like render of a real clay figurine, \
suitable as a reference for 3D character modeling.`,
  },

  zelda: {
    label: "Zelda: Link's Awakening — Matte Clay",
    preamble: `\
Full-body chibi character in a perfect T-pose (arms extended straight out to both sides) \
inspired by The Legend of Zelda: Link's Awakening 2019 remake proportions and charm, \
but rendered with a soft matte clay / polymer clay material finish. \
2-head-tall proportions: very large smooth rounded head, tiny compact body, \
short stubby limbs, small rounded mitten hands with no individual fingers. \
Face: simple small dark dot eyes set wide apart, no visible nose, \
tiny simple mouth. Absolutely NO blush, NO rosy cheeks, NO pink circles on face — \
clean smooth unadorned skin on cheeks. \
MATERIAL: Soft matte clay surface — NO shine, NO gloss, NO specular highlights, \
NO reflections, NO ceramic or lacquered look. The surface should look like \
dry polymer clay or Play-Doh: completely diffuse, slightly chalky, \
with very subtle surface grain. Think Laika stop-motion film quality. \
Warm desaturated colors, soft even lighting with minimal shadows, \
gentle ambient occlusion only in deep creases. \
Hair looks like sculpted clay shapes, not individual strands. \
Clothing has soft rounded folds as if molded from clay. \
Single front-facing view, standing on a small soft shadow, symmetrical T-pose. \
Solid flat light-grey (#F0F0F0) background. \
No props, no extra characters, no text, no UI. \
High-resolution 3D render of a matte clay figurine, \
suitable as a reference for 3D character modeling.`,
  },

  fortnite: {
    label: "Fortnite / Overwatch Stylized",
    preamble: `\
Full-body chibi character in a perfect T-pose (arms extended straight out to both sides) \
in a Fortnite / Overwatch hero-shooter stylized 3D art style. \
2.5-head-tall super-deformed proportions but with an athletic, action-figure build: \
large expressive head, defined jawline, compact but toned body, slightly oversized hands and feet. \
Bold saturated colors, clean PBR materials with metallic and glossy accents. \
Smooth high-poly surfaces, subtle rim lighting with a cool blue/cyan edge highlight. \
Stylized realistic skin shading — not photorealistic but polished and modern. \
Outfit details feel like unlockable character skins: clean geometric patterns, \
glowing accent lines or trim, futuristic-meets-casual fashion mashup. \
Dynamic energy even in T-pose — confident wide stance, slightly puffed chest. \
Professional game-studio quality render with three-point lighting setup. \
Single front-facing view, feet flat on the ground, symmetrical T-pose. \
Solid flat light-grey (#F0F0F0) background. \
No props, no extra characters, no text, no UI. \
High-resolution, suitable as a reference for 3D character modeling.`,
  },

  wow: {
    label: "World of Warcraft Chibi",
    preamble: `\
Full-body chibi character in a perfect T-pose (arms extended straight out to both sides) \
inspired by World of Warcraft art style rendered as a cute miniature figurine. \
2.5-head-tall super-deformed proportions: massive round head, large expressive \
WoW-style eyes with glowing irises and thick painted eyebrows, small pointed nose, \
confident smirk or grin. Compact muscular torso, oversized hands and feet (WoW trademark). \
Wearing stylized fantasy-MMO gear with exaggerated chunky proportions: \
oversized shoulder armor / pauldrons, detailed belt buckle, layered armor plates or cloth \
with hand-painted texture look. Gear has subtle glow effects and metallic trim. \
WoW hand-painted texture aesthetic: visible brushstroke-like color transitions, \
warm diffuse lighting, rich saturated colors, NO photorealism. \
Soft but stylized 3D render — looks like an official Blizzard chibi collectible figure. \
Single front-facing view, feet flat on the ground, symmetrical T-pose. \
Solid flat light-grey (#F0F0F0) background. \
No props, no extra characters, no text, no UI. \
High-resolution, suitable as a reference for 3D character modeling.`,
  },

  acnh: {
    label: "Animal Crossing / Pokemon BDSP",
    preamble: `\
Full-body character in a perfect T-pose (arms extended straight out to both sides, \
soft rounded mitten hands, no individual fingers). \
Inspired by Animal Crossing: New Horizons and Pokemon Brilliant Diamond / Shining Pearl. \
2-head-tall proportions: very large perfectly round head taking up nearly half the total height, \
tiny compact pill-shaped body, very short stubby legs, small rounded feet. \
Face: small simple dot eyes set wide apart, tiny dot nose or no nose, \
small cheerful curved mouth, rosy circular blush marks on cheeks. \
Smooth soft matte plastic / vinyl figurine surface — NO outlines, NO cel-shading. \
Gentle subsurface-scattering-like glow on skin, soft diffuse lighting from above. \
All forms are rounded and pillowy — no sharp edges anywhere. \
Warm, inviting color palette with slightly desaturated pastels. \
Single front-facing view, standing on a tiny round shadow on the ground, symmetrical pose. \
Solid flat light-grey (#F0F0F0) background. \
No props, no extra characters, no text, no UI elements. \
High-resolution 3D render, looks like an official Nintendo figurine photograph, \
suitable as a reference for 3D character modeling.`,
  },

  pixel: {
    label: "Pixel Art / Retro",
    preamble: `\
Pixel-art full-body character sprite in a perfect T-pose (arms extended straight \
out to both sides, hands flat). \
Classic 32×64 pixel sprite resolution scaled up with nearest-neighbor filtering \
(no anti-aliasing, hard pixel edges). \
Chibi game-sprite proportions: big square head (~40% of height), small body, \
stubby 2-pixel-wide limbs. \
Limited 16-color palette per character, dithering for shading. \
Retro SNES / GBA RPG aesthetic. Black 1-pixel outline around the entire silhouette. \
Single front-facing view, standing on a 2-pixel shadow ellipse. \
Solid flat light-grey (#F0F0F0) background. \
No props, no extra characters, no text. \
The image should look like a zoomed-in sprite sheet frame, suitable as a \
reference for pixel-art game characters.`,
  },
};

// ─── Per-character details (shared across styles) ────────────────────

const CHARACTER_DETAILS_SIMPLE = {
  ceo: `\
Character: Startup CEO. \
Dark navy blazer over white t-shirt, dark pants, white sneakers. \
Short neat dark hair. Calm expression.`,

  marketing: `\
Character: Marketing lead. \
Lavender hoodie, black jeans, purple sneakers. \
Round glasses. Wavy auburn hair. Cheerful expression.`,

  sales: `\
Character: Sales representative. \
Green blazer over mint shirt, tan pants, brown shoes. \
Short curly dark-brown hair. Friendly smile.`,

  dev: `\
Character: Software engineer. \
Charcoal hoodie over amber t-shirt, grey joggers, dark sneakers. \
Black headphones around neck. Messy black hair. Thoughtful expression.`,
};

const CHARACTER_DETAILS_FULL = {
  ceo: `\
Character: Confident startup CEO.
Outfit: Slim-fit dark navy suit jacket (unbuttoned) over a crisp white crew-neck t-shirt. \
Dark fitted trousers, clean white minimalist sneakers. \
Small round silver lapel pin on jacket. \
Hair: Short, neatly styled dark hair with a slight side part. \
Expression: Calm, assured half-smile. \
Color palette: Navy (#1e3a5f), white, charcoal, silver accents.`,

  marketing: `\
Character: Creative marketing lead.
Outfit: Oversized lavender hoodie with rolled-up sleeves, layered over a white graphic tee \
with a tiny megaphone icon on the chest. Black skinny jeans, chunky pastel-purple high-top sneakers. \
Accessories: Round rose-gold glasses, small silver hoop earring on left ear. \
Hair: Medium-length wavy auburn hair, loosely tucked behind one ear. \
Expression: Bright, enthusiastic grin. \
Color palette: Lavender (#c4b5fd), purple (#a855f7), rose-gold, black.`,

  sales: `\
Character: Energetic sales representative.
Outfit: Fitted emerald-green blazer over a light mint button-up shirt (top button open). \
Tan chinos, brown leather loafers. \
Accessories: Thin brown leather watch on left wrist, small gold tie clip on shirt placket. \
Hair: Short curly dark-brown hair, tight fade on the sides. \
Expression: Warm, approachable open-mouth smile. \
Color palette: Emerald (#22c55e), mint, tan, brown, gold accents.`,

  dev: `\
Character: Focused software engineer.
Outfit: Faded charcoal zip-up hoodie (half-zipped) over a dark amber t-shirt with a small \
terminal cursor icon "> _" on the chest. Dark grey joggers, black-and-amber running shoes. \
Accessories: Over-ear matte-black headphones resting around the neck. \
Hair: Messy shoulder-length black hair with a subtle blue streak on one side. \
Expression: Thoughtful, slight smirk. \
Color palette: Charcoal (#333), amber (#f59e0b), black, dark-blue accent.`,
};

// Use simple descriptions for the "simple" style, full for everything else
const CHARACTER_DETAILS = {}; // populated below after style is selected

// ─── Generate ────────────────────────────────────────────────────────
async function generate(name, prompt, styleName) {
  const label = `${styleName}/${name}`;
  console.log(`\n🎨 Generating ${label}...`);

  const parts = [];

  // Include reference image so Gemini matches the style
  if (REF_IMG_B64) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: REF_IMG_B64 } });
    parts.push({
      text:
        "This is a reference image showing the exact chibi style I want. " +
        "Match the same proportions, material finish (smooth matte clay/vinyl), " +
        "T-pose, level of detail, and overall aesthetic. " +
        "Generate a NEW character in this exact same style:\n\n",
    });
  }

  parts.push({ text: prompt });

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ✗ API error (${res.status}): ${err}`);
    return;
  }

  const json = await res.json();
  const respParts = json.candidates?.[0]?.content?.parts ?? [];
  const imagePart = respParts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));

  if (!imagePart) {
    console.error(`  ✗ No image in response. Text parts:`);
    respParts.filter((p) => p.text).forEach((p) => console.log(`    ${p.text}`));
    return;
  }

  const suffix = styleName === "simple" ? "" : `-${styleName}`;
  const outPath = resolve(OUT_DIR, `chibi-${name}${suffix}.png`);
  const buf = Buffer.from(imagePart.inlineData.data, "base64");
  writeFileSync(outPath, buf);
  console.log(`  ✓ Saved ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);

  const textParts = respParts.filter((p) => p.text);
  if (textParts.length) {
    console.log(`  Model notes: ${textParts.map((p) => p.text).join(" ")}`);
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes("--styles")) {
  console.log("\nAvailable styles:");
  for (const [key, s] of Object.entries(STYLES)) {
    console.log(`  ${key.padEnd(10)} ${s.label}`);
  }
  process.exit(0);
}

// Parse --style flag
const styleIdx = args.indexOf("--style");
const styleName = styleIdx >= 0 ? args[styleIdx + 1] : "ref";
const nonFlagArgs = args.filter(
  (a, i) => a !== "--style" && a !== "--list" && a !== "--lineup" && (styleIdx < 0 || i !== styleIdx + 1)
);

if (!(styleName in STYLES)) {
  console.error(`Unknown style "${styleName}". Available: ${Object.keys(STYLES).join(", ")}`);
  process.exit(1);
}

const style = STYLES[styleName];

// Pick character details: simple descriptions for "simple" and "ref" styles, full for others
const charDetails = (styleName === "simple" || styleName === "ref") ? CHARACTER_DETAILS_SIMPLE : CHARACTER_DETAILS_FULL;
Object.assign(CHARACTER_DETAILS, charDetails);

// Build full prompts
const CHARACTERS = {};
for (const [name, details] of Object.entries(CHARACTER_DETAILS)) {
  CHARACTERS[name] = `${style.preamble}\n${details}`;
}

if (args.includes("--list")) {
  console.log(`\nStyle: ${style.label}\n`);
  for (const [name, prompt] of Object.entries(CHARACTERS)) {
    console.log(`${"═".repeat(60)}\n${name.toUpperCase()}\n${"═".repeat(60)}`);
    console.log(prompt);
    console.log();
  }
  process.exit(0);
}

const targets =
  nonFlagArgs.length > 0
    ? nonFlagArgs.filter((a) => a in CHARACTERS)
    : Object.keys(CHARACTERS);

if (targets.length === 0) {
  console.error(`Unknown character. Available: ${Object.keys(CHARACTERS).join(", ")}`);
  process.exit(1);
}

// ─── Lineup mode: all characters in one image ──────────────────────
if (args.includes("--lineup")) {
  const charDescriptions = targets
    .map((name, i) => `Character ${i + 1} (${name}): ${CHARACTER_DETAILS[name]}`)
    .join("\n");

  const lineupPrompt = `\
${style.preamble}
Character lineup sheet showing ${targets.length} characters standing side by side, \
evenly spaced, all in the same T-pose, all the same height and proportions. \
Every character must share the exact same art style, head size, body shape, and level of detail. \
Each character differs only in outfit and hair:
${charDescriptions}`;

  console.log(`Style: ${style.label} (lineup)\n`);
  if (args.includes("--list")) {
    console.log(lineupPrompt);
    process.exit(0);
  }
  await generate("lineup", lineupPrompt, styleName);
  console.log("\nDone! Lineup saved — crop each character individually for Meshy.");
  process.exit(0);
}

console.log(`Style: ${style.label}`);
for (const name of targets) {
  await generate(name, CHARACTERS[name], styleName);
}

console.log("\nDone!");
