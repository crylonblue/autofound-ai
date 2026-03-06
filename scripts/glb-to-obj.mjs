#!/usr/bin/env node
/**
 * Convert GLB models → OBJ + MTL + textures (ZIP) for Mixamo upload.
 * Extracts mesh geometry AND textures so Mixamo has skin to work with.
 *
 * Output: public/models/mixamo/{ceo,marketing,sales,dev}.obj.zip
 *
 * Usage:
 *   node scripts/glb-to-obj.mjs              # all 4 characters
 *   node scripts/glb-to-obj.mjs ceo dev      # specific characters
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = resolve(__dirname, "../public/models");
const OUT_DIR = resolve(MODELS_DIR, "mixamo");
const CHARACTERS = ["ceo", "marketing", "sales", "dev"];

mkdirSync(OUT_DIR, { recursive: true });

const args = process.argv.slice(2);
const targets = args.length > 0 ? args.filter((a) => CHARACTERS.includes(a)) : CHARACTERS;

if (targets.length === 0) {
  console.error(`Unknown character(s). Available: ${CHARACTERS.join(", ")}`);
  process.exit(1);
}

// Load gltf-transform with Draco support
const { NodeIO } = await import("@gltf-transform/core");
const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");
const draco3d = await import("draco3dgltf");

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": await draco3d.createDecoderModule(),
  });

for (const name of targets) {
  const glbPath = resolve(MODELS_DIR, `${name}.glb`);
  if (!existsSync(glbPath)) {
    console.warn(`  Skipping ${name}: ${glbPath} not found`);
    continue;
  }

  console.log(`\nConverting ${name}.glb → OBJ + MTL + textures...`);

  const doc = await io.read(glbPath);

  // ─── Extract textures ──────────────────────────────────────────
  const textureFiles = [];
  for (const [i, tex] of doc.getRoot().listTextures().entries()) {
    const imageData = tex.getImage();
    if (!imageData) continue;
    const mime = tex.getMimeType();
    const ext = mime === "image/png" ? "png" : "jpg";
    const texName = `${name}_texture_${i}.${ext}`;
    writeFileSync(resolve(OUT_DIR, texName), Buffer.from(imageData));
    textureFiles.push(texName);
    console.log(`  ✓ Texture: ${texName} (${(imageData.length / 1024).toFixed(0)} KB)`);
  }

  // ─── Build MTL file ────────────────────────────────────────────
  const mtlName = `${name}.mtl`;
  let mtlContent = `# Material for ${name}\n`;
  const materials = doc.getRoot().listMaterials();

  if (materials.length === 0) {
    // Create a default material
    mtlContent += `newmtl default\n`;
    mtlContent += `Ka 1.0 1.0 1.0\n`;
    mtlContent += `Kd 1.0 1.0 1.0\n`;
    mtlContent += `Ks 0.0 0.0 0.0\n`;
    mtlContent += `d 1.0\n`;
    if (textureFiles.length > 0) {
      mtlContent += `map_Kd ${textureFiles[0]}\n`;
    }
  } else {
    for (const [i, mat] of materials.entries()) {
      const matName = mat.getName() || `material_${i}`;
      const color = mat.getBaseColorFactor();
      mtlContent += `newmtl ${matName}\n`;
      mtlContent += `Ka ${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)}\n`;
      mtlContent += `Kd ${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)}\n`;
      mtlContent += `Ks 0.000 0.000 0.000\n`;
      mtlContent += `d ${color[3].toFixed(3)}\n`;

      // Link texture if material has one
      const baseTex = mat.getBaseColorTexture();
      if (baseTex) {
        const texIdx = doc.getRoot().listTextures().indexOf(baseTex);
        if (texIdx >= 0 && textureFiles[texIdx]) {
          mtlContent += `map_Kd ${textureFiles[texIdx]}\n`;
        }
      } else if (textureFiles.length > 0) {
        // Fallback: assign first texture
        mtlContent += `map_Kd ${textureFiles[0]}\n`;
      }
      mtlContent += `\n`;
    }
  }

  writeFileSync(resolve(OUT_DIR, mtlName), mtlContent);
  console.log(`  ✓ Material: ${mtlName}`);

  // ─── Build OBJ file ────────────────────────────────────────────
  const firstMatName = materials.length > 0
    ? (materials[0].getName() || "material_0")
    : "default";

  let objContent = `# ${name} - converted from GLB for Mixamo\n`;
  objContent += `mtllib ${mtlName}\n`;
  objContent += `usemtl ${firstMatName}\n`;

  let vertexOffset = 0;
  let normalOffset = 0;
  let uvOffset = 0;

  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const posAccessor = prim.getAttribute("POSITION");
      if (!posAccessor) continue;

      const positions = posAccessor.getArray();
      const normalAccessor = prim.getAttribute("NORMAL");
      const normals = normalAccessor?.getArray();
      const uvAccessor = prim.getAttribute("TEXCOORD_0");
      const uvs = uvAccessor?.getArray();
      const indexAccessor = prim.getIndices();
      const indices = indexAccessor?.getArray();

      // Vertices
      for (let i = 0; i < positions.length; i += 3) {
        objContent += `v ${positions[i].toFixed(6)} ${positions[i + 1].toFixed(6)} ${positions[i + 2].toFixed(6)}\n`;
      }

      // UVs
      if (uvs) {
        for (let i = 0; i < uvs.length; i += 2) {
          objContent += `vt ${uvs[i].toFixed(6)} ${uvs[i + 1].toFixed(6)}\n`;
        }
      }

      // Normals
      if (normals) {
        for (let i = 0; i < normals.length; i += 3) {
          objContent += `vn ${normals[i].toFixed(6)} ${normals[i + 1].toFixed(6)} ${normals[i + 2].toFixed(6)}\n`;
        }
      }

      // Faces (with v/vt/vn format)
      if (indices) {
        for (let i = 0; i < indices.length; i += 3) {
          const faces = [];
          for (let j = 0; j < 3; j++) {
            const idx = indices[i + j];
            const v = idx + 1 + vertexOffset;
            const parts = [`${v}`];
            if (uvs && normals) {
              faces.push(`${v}/${idx + 1 + uvOffset}/${idx + 1 + normalOffset}`);
            } else if (uvs) {
              faces.push(`${v}/${idx + 1 + uvOffset}`);
            } else if (normals) {
              faces.push(`${v}//${idx + 1 + normalOffset}`);
            } else {
              faces.push(`${v}`);
            }
          }
          objContent += `f ${faces.join(" ")}\n`;
        }
      }

      const vertCount = positions.length / 3;
      vertexOffset += vertCount;
      if (normals) normalOffset += normals.length / 3;
      if (uvs) uvOffset += uvs.length / 2;
    }
  }

  const objPath = resolve(OUT_DIR, `${name}.obj`);
  writeFileSync(objPath, objContent);
  console.log(`  ✓ OBJ: ${name}.obj`);

  // ─── ZIP everything ────────────────────────────────────────────
  const zipPath = `${name}.obj.zip`;
  const filesToZip = [`${name}.obj`, mtlName, ...textureFiles].join(" ");
  try {
    execSync(`cd "${OUT_DIR}" && zip -j "${zipPath}" ${filesToZip}`, { stdio: "pipe" });
    console.log(`  ✓ ZIP: ${resolve(OUT_DIR, zipPath)}`);
  } catch {
    console.warn(`  ⚠ zip failed, files are still available unzipped`);
  }
}

console.log(`\nDone! Upload the .obj.zip files to mixamo.com`);
console.log(`Files are in: ${OUT_DIR}\n`);
