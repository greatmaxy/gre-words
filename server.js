import { createServer } from 'node:http';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dataFile = join(root, 'data', 'words.json');
const port = Number(process.env.PORT || 8000);
const contentTypes = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

async function ensureDataFile() {
  await mkdir(dirname(dataFile), { recursive: true });
  try { await stat(dataFile); } catch { await writeFile(dataFile, '{\n  "entries": []\n}\n', 'utf8'); }
}

function validateEntries(value) {
  if (!value || !Array.isArray(value.entries)) throw new Error('Expected an object with an entries array.');
  if (value.entries.length > 10000) throw new Error('A word list may contain at most 10,000 entries.');
  const seen = new Set();
  return value.entries.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new Error(`Entry ${index + 1} must be an object.`);
    const id = typeof entry.id === 'string' ? entry.id.trim() : '';
    const word = typeof entry.word === 'string' ? entry.word.trim() : '';
    const definition = typeof entry.definition === 'string' ? entry.definition.trim() : '';
    const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString();
    const note = typeof entry.note === 'string' ? entry.note.trim() : '';
    if (!id || !word || !definition) throw new Error(`Entry ${index + 1} needs an id, word, and definition.`);
    if (word.length > 80 || definition.length > 300) throw new Error(`Entry ${index + 1} exceeds the allowed length.`);
    if (note.length > 500) throw new Error(`Entry ${index + 1} note exceeds 500 characters.`);
    if (seen.has(id)) throw new Error('Every entry needs a unique id.');
    seen.add(id);
    return note ? { id, word, definition, createdAt, note } : { id, word, definition, createdAt };
  });
}

async function loadEntries() {
  await ensureDataFile();
  const parsed = JSON.parse(await readFile(dataFile, 'utf8'));
  return validateEntries(parsed);
}

async function saveEntries(entries) {
  const contents = `${JSON.stringify({ entries }, null, 2)}\n`;
  const tempFile = `${dataFile}.${process.pid}.tmp`;
  await writeFile(tempFile, contents, 'utf8');
  await rename(tempFile, dataFile);
}

function reply(response, status, body, type = 'application/json; charset=utf-8') {
  response.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  response.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function bodyOf(request) {
  let raw = '';
  for await (const chunk of request) { raw += chunk; if (raw.length > 2_000_000) throw new Error('Request body is too large.'); }
  try { return JSON.parse(raw); } catch { throw new Error('Request body must be valid JSON.'); }
}

async function serveFile(pathname, response) {
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  const safePath = normalize(requested).replace(/^(\.\.(?:[/\\]|$))+/, '');
  const file = join(root, safePath);
  if (!file.startsWith(root) || extname(file) === '.json') return reply(response, 404, { error: 'Not found.' });
  try { reply(response, 200, await readFile(file), contentTypes[extname(file)] || 'application/octet-stream'); }
  catch { reply(response, 404, 'Not found.', 'text/plain; charset=utf-8'); }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  const origin = request.headers.origin;
  if (origin && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (request.method === 'OPTIONS') { response.writeHead(204); return response.end(); }
  try {
    if (url.pathname === '/api/words' && request.method === 'GET') return reply(response, 200, { entries: await loadEntries() });
    if (url.pathname === '/api/words' && request.method === 'PUT') {
      const entries = validateEntries(await bodyOf(request));
      await saveEntries(entries);
      return reply(response, 200, { entries });
    }
    if (url.pathname === '/api/words') return reply(response, 405, { error: 'Method not allowed.' });
    return serveFile(decodeURIComponent(url.pathname), response);
  } catch (error) {
    console.error(error);
    return reply(response, 400, { error: error instanceof Error ? error.message : 'Unable to process request.' });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Wordwell is running at http://127.0.0.1:${port}`));