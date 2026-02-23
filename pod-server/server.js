/**
 * autofound.ai Pod Server
 *
 * Runs inside each agent's Fly.io machine. Provides:
 * - POST /exec          — execute shell commands
 * - GET  /files/*       — read files from agent workspace
 * - PUT  /files/*       — write files to agent workspace
 * - GET  /health        — health check
 * - POST /task/execute  — run a task (called by Convex orchestrator)
 *
 * Auth: All requests must include x-pod-secret header matching POD_SECRET env.
 */

import Fastify from "fastify";
import { exec } from "child_process";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import { dirname, join, resolve } from "path";

const PORT = parseInt(process.env.PORT || "8080");
const POD_SECRET = process.env.POD_SECRET || "";
const WORKSPACE = process.env.WORKSPACE || "/home/agent/workspace";
const CONVEX_URL = process.env.CONVEX_URL || "";
const AGENT_ID = process.env.AGENT_ID || "";

const app = Fastify({ logger: true });

// ── Auth middleware ──────────────────────────────────────────────────
app.addHook("onRequest", async (req, reply) => {
  if (req.url === "/health") return; // health check is public
  if (!POD_SECRET) return; // no secret = dev mode, skip auth
  if (req.headers["x-pod-secret"] !== POD_SECRET) {
    reply.code(401).send({ error: "Unauthorized" });
  }
});

// ── Health ───────────────────────────────────────────────────────────
app.get("/health", async () => ({
  status: "ok",
  agentId: AGENT_ID || undefined,
  uptime: process.uptime(),
  timestamp: Date.now(),
}));

// ── Shell exec ───────────────────────────────────────────────────────
app.post("/exec", async (req) => {
  const { command, timeout = 30000, cwd } = req.body;
  if (!command) return { error: "command required" };

  const workdir = cwd ? resolve(WORKSPACE, cwd) : WORKSPACE;

  return new Promise((resolve) => {
    const child = exec(command, {
      cwd: workdir,
      timeout,
      maxBuffer: 1024 * 1024, // 1MB
      env: { ...process.env, HOME: "/home/agent" },
    }, (error, stdout, stderr) => {
      resolve({
        exitCode: error?.code ?? 0,
        stdout: stdout.slice(0, 100000),
        stderr: stderr.slice(0, 50000),
      });
    });
  });
});

// ── File read ────────────────────────────────────────────────────────
app.get("/files/*", async (req, reply) => {
  const filePath = resolve(WORKSPACE, req.params["*"]);
  if (!filePath.startsWith(WORKSPACE)) {
    reply.code(403).send({ error: "Path traversal denied" });
    return;
  }

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) {
      const { readdir } = await import("fs/promises");
      const entries = await readdir(filePath, { withFileTypes: true });
      return {
        type: "directory",
        entries: entries.map((e) => ({
          name: e.name,
          isDir: e.isDirectory(),
        })),
      };
    }
    if (info.size > 5 * 1024 * 1024) {
      reply.code(413).send({ error: "File too large (>5MB)" });
      return;
    }
    const content = await readFile(filePath, "utf-8");
    return { type: "file", content, size: info.size };
  } catch (e) {
    reply.code(404).send({ error: "Not found" });
  }
});

// ── File write ───────────────────────────────────────────────────────
app.put("/files/*", async (req, reply) => {
  const filePath = resolve(WORKSPACE, req.params["*"]);
  if (!filePath.startsWith(WORKSPACE)) {
    reply.code(403).send({ error: "Path traversal denied" });
    return;
  }

  const { content } = req.body;
  if (content === undefined) {
    reply.code(400).send({ error: "content required" });
    return;
  }

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
  return { ok: true, path: req.params["*"] };
});

// ── Task execution (called by Convex flyOrchestrator) ────────────────
app.post("/task/execute", async (req) => {
  const { taskId, runId, systemPrompt, userMessage, model, apiKey, provider } = req.body;

  if (!apiKey || !userMessage) {
    return { success: false, error: "apiKey and userMessage required" };
  }

  try {
    let output;
    if (provider === "anthropic") {
      output = await callAnthropic(apiKey, model || "claude-sonnet-4-20250514", systemPrompt, userMessage);
    } else if (provider === "google") {
      output = await callGoogle(apiKey, model || "gemini-2.0-flash", systemPrompt, userMessage);
    } else {
      output = await callOpenAI(apiKey, model || "gpt-4o-mini", systemPrompt, userMessage);
    }

    // Report back to Convex if URL is set
    if (CONVEX_URL && runId) {
      await reportToConvex(runId, taskId, "completed", output);
    }

    return { success: true, output };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    if (CONVEX_URL && runId) {
      await reportToConvex(runId, taskId, "failed", error);
    }
    return { success: false, error };
  }
});

// ── LLM Calls ────────────────────────────────────────────────────────
async function callOpenAI(apiKey, model, system, user) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: user },
      ],
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey, model, system, user) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: user }],
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content[0].text;
}

async function callGoogle(apiKey, model, system, user) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ parts: [{ text: user }] }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

// ── Convex callback ──────────────────────────────────────────────────
async function reportToConvex(runId, taskId, status, output) {
  try {
    // Use Convex HTTP actions API to report results
    const body = {
      path: "agentRuns:completeRun",
      args: {
        runId,
        status,
        ...(status === "completed" ? { output } : { error: output }),
      },
    };
    await fetch(`${CONVEX_URL}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("Failed to report to Convex:", e);
  }
}

// ── Start ────────────────────────────────────────────────────────────
app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Pod server running on :${PORT} | agent=${AGENT_ID || "unset"}`);
});
