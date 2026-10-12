// Testing only. Loopback only (127.0.0.1). Uses your own Codex login via the official `codex` CLI.
// Do not expose publicly: it runs model calls under your account and has no auth of its own.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PORT = Number(process.env.PORT) || 8787;
const HOST = '127.0.0.1';
const MAX_BODY = 100 * 1024;
const TIMEOUT_MS = 90_000;
// Default model is set because the CLI's configured default may not be available on a ChatGPT login.
const CODEX_MODEL = process.env.CODEX_MODEL || 'gpt-5.5';
// On Windows, a stale codex.exe can shadow the npm install and spawn() cannot run the .cmd shim
// without a shell, so run the npm package's entry script with Node when it exists.
const npmCodexJs = join(process.env.APPDATA || '', 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
const CODEX_JS = process.env.CODEX_JS || (process.platform === 'win32' && existsSync(npmCodexJs) ? npmCodexJs : '');

// One codex run at a time: each request waits for the previous one to finish.
let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

function sendError(res, status, message) {
  send(res, status, { error: { message } });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Request body exceeds 100KB'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function buildPrompt(body) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const parts = messages.map((m) => {
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    const label = m.role === 'system' ? 'System' : m.role === 'assistant' ? 'Assistant' : 'User';
    return `${label}: ${content}`;
  });
  if (body.response_format?.type === 'json_object') {
    parts.push('Respond with only a single JSON object, no code fences.');
  }
  return parts.join('\n\n');
}

// Runs `codex exec` in an empty temp dir and returns the final message only.
async function runCodex(prompt) {
  const dir = await mkdtemp(join(tmpdir(), 'codex-proxy-'));
  const outFile = join(dir, 'last-message.txt');
  try {
    await new Promise((resolve, reject) => {
      const command = CODEX_JS ? process.execPath : 'codex';
      const prefix = CODEX_JS ? [CODEX_JS] : [];
      const child = spawn(
        command,
        [
          ...prefix,
          'exec',
          '-m', CODEX_MODEL,
          '--skip-git-repo-check',
          '--ephemeral',
          '--sandbox', 'read-only',
          '--color', 'never',
          '--output-last-message', outFile,
          '-',
        ],
        { cwd: dir, shell: false, windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] },
      );

      const timer = setTimeout(() => {
        child.kill();
        reject(new HttpError(504, 'codex run timed out after 90s'));
      }, TIMEOUT_MS);

      child.on('error', (err) => {
        clearTimeout(timer);
        reject(new HttpError(502, `failed to start codex: ${err.code || err.message}`));
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new HttpError(502, `codex exited with code ${code}`));
      });

      child.stdin.on('error', () => {}); // ignore EPIPE if codex exits early
      child.stdin.end(prompt);
    });

    let reply;
    try {
      reply = (await readFile(outFile, 'utf8')).trim();
    } catch {
      throw new HttpError(502, 'codex produced no final message');
    }
    return reply;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function handleChat(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(400, 'Body must be valid JSON');
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new HttpError(400, 'messages must be a non-empty array');
  }

  const prompt = buildPrompt(body);
  const reply = await enqueue(() => runCodex(prompt));

  send(res, 200, {
    id: `chatcmpl-${Date.now().toString(36)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'codex',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: reply },
        finish_reason: 'stop',
      },
    ],
  });
}

const server = http.createServer(async (req, res) => {
  const start = Date.now();
  const path = new URL(req.url, `http://${HOST}`).pathname;
  let status = 200;

  try {
    if (req.method === 'GET' && path === '/health') {
      send(res, 200, { ok: true });
    } else if (req.method === 'POST' && path === '/v1/chat/completions') {
      await handleChat(req, res);
    } else {
      throw new HttpError(404, 'Not found');
    }
  } catch (err) {
    status = err instanceof HttpError ? err.status : 500;
    if (!res.headersSent) sendError(res, status, err instanceof HttpError ? err.message : 'Internal error');
  } finally {
    console.log(`${new Date().toISOString()} ${req.method} ${path} ${status} ${Date.now() - start}ms`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`codex-proxy listening on http://${HOST}:${PORT}`);
});
