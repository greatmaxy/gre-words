const API_BASE = location.port === '8000' ? '' : 'http://127.0.0.1:8000';
const state = {
  entries: [], view: 'library', query: '', editingId: null, notingId: null, loading: true, loadError: null,
  round: null, results: null, feedbackMode: 'end', selectedWordId: null, selectedDefinitionId: null
};

const $ = (selector) => document.querySelector(selector);
const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function saveEntries() {
  const response = await fetch(`${API_BASE}/api/words`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries: state.entries }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The word list could not be saved.');
  state.entries = payload.entries;
}
async function loadEntries() {
  state.loading = true; state.loadError = null; render();
  try {
    const response = await fetch(`${API_BASE}/api/words`); const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Could not load data/words.json.');
    state.entries = payload.entries;
  } catch (error) { state.loadError = error instanceof Error ? error.message : 'Could not load data/words.json.'; }
  state.loading = false; clearRound(); render();
}
function clearRound() { state.round = null; state.results = null; state.selectedWordId = null; state.selectedDefinitionId = null; }
function id() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function shuffle(items) { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2600); }
function addedLabel(iso) { const date = new Date(iso); return isNaN(date) ? 'added' : `added ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toLowerCase()}`; }

function render() {
  const total = state.entries.length;
  $('#wordCount').textContent = `${total} ${total === 1 ? 'word' : 'words'}`;
  document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('is-active', link.dataset.view === state.view));
  $('#library').classList.toggle('is-active', state.view === 'library');
  $('#practice').classList.toggle('is-active', state.view === 'practice');
  renderList(); renderPractice();
}

function renderList() {
  const list = $('#wordList'); const query = state.query.trim().toLowerCase();
  const matches = state.entries.filter(e => !query || e.word.toLowerCase().includes(query) || e.definition.toLowerCase().includes(query));
  $('#resultLabel').textContent = query ? `${matches.length} of ${state.entries.length}` : '';
  if (state.loading) { list.innerHTML = '<div class="notice">loading…</div>'; return; }
  if (state.loadError) { list.innerHTML = `<div class="notice">could not load data/words.json — ${escapeHTML(state.loadError)} <a href="#retry" data-retry-load>try again</a></div>`; return; }
  if (!state.entries.length) { list.innerHTML = '<div class="notice">No words yet. Add your first one above.</div>'; return; }
  if (!matches.length) { list.innerHTML = '<div class="notice">No words match.</div>'; return; }
  list.innerHTML = '<table class="word-table"><tbody>' + matches.map((e, index) => {
    const noteLine = state.notingId === e.id
      ? `<div class="note-form"><input class="note-input" data-note-input="${e.id}" value="${escapeHTML(e.note || '')}" maxlength="500" placeholder="side note" /><a href="#save" data-note-save="${e.id}">save</a><span>|</span><a href="#cancel" data-note-cancel>cancel</a></div>`
      : e.note ? `<div class="note">${escapeHTML(e.note)}</div>` : '';
    return `<tr><td class="rank">${index + 1}.</td><td class="entry"><div class="entry-line"><strong>${escapeHTML(e.word)}</strong><span class="definition">${escapeHTML(e.definition)}</span></div>${noteLine}<div class="meta"><span>${addedLabel(e.createdAt)}</span><span>|</span><a href="#note" data-note="${e.id}">${e.note ? 'edit note' : 'add note'}</a><span>|</span><a href="#edit" data-edit="${e.id}">edit</a><span>|</span><a href="#delete" data-delete="${e.id}">delete</a></div></td></tr>`;
  }).join('') + '</tbody></table>';
}

function practiceSetup() {
  if (state.entries.length < 2) return '<div class="quiz-notice">Add at least two words to practice matching.</div>';
  const max = Math.min(state.entries.length, 20);
  const options = Array.from({ length: max - 1 }, (_, i) => i + 2).map(n => `<option value="${n}" ${n === Math.min(5, max) ? 'selected' : ''}>${n} words</option>`).join('');
  return `<form id="setupForm" class="setup-row"><span class="setup-label">round size</span><select name="count">${options}</select><label><input type="radio" name="feedback" value="end" checked /> review at end</label><label><input type="radio" name="feedback" value="instant" /> reveal as i go</label><button type="submit">start matching</button></form>`;
}

function statusFor(wordId) {
  const round = state.round; if (!round) return '';
  const defId = round.pairs[wordId]; if (!defId) return '';
  if (state.feedbackMode === 'instant' || state.results) return defId === wordId ? 'correct' : 'incorrect';
  return 'paired';
}

function renderRound() {
  const r = state.round; const paired = Object.keys(r.pairs).length; const complete = paired === r.words.length;
  const words = r.words.map((e, i) =>
    `<div class="match-row"><span class="rank">${i + 1}.</span><a href="#w" class="match ${state.selectedWordId === e.id ? 'selected' : ''} ${statusFor(e.id)}" data-word="${e.id}">${escapeHTML(e.word)}</a></div>`
  ).join('');
  const definitions = r.definitions.map((e, i) => {
    const pairedTo = Object.entries(r.pairs).find(([, d]) => d === e.id)?.[0];
    const cls = pairedTo ? statusFor(pairedTo) : '';
    const tag = pairedTo && state.feedbackMode === 'end' && !state.results ? `<span class="pair-tag">— ${escapeHTML(r.words.find(w => w.id === pairedTo)?.word || '')}</span>` : '';
    return `<div class="match-row"><span class="rank">${i + 1}.</span><span><a href="#d" class="match ${state.selectedDefinitionId === e.id ? 'selected' : ''} ${cls}" data-definition="${e.id}">${escapeHTML(e.definition)}</a>${tag}</span></div>`;
  }).join('');
  const note = state.feedbackMode === 'instant' ? 'each pair is checked immediately — pick a paired word to change it' : 'pick one word and one meaning to make a pair';
  return `<div class="score-row"><span>${paired} / ${r.words.length} paired</span><span>|</span><a href="#leave" data-end-round>leave round</a></div><div class="match-grid"><div class="match-col"><div class="col-head">words</div>${words}</div><div class="match-col"><div class="col-head">meanings</div>${definitions}</div></div><div class="result-row"><span class="verdict">${note}</span><button class="next-word" data-submit-round ${complete ? '' : 'disabled'}>${state.feedbackMode === 'instant' ? 'see results' : 'check matches'}</button></div>`;
}

function renderResults() {
  const r = state.round; const scored = r.words.filter(e => r.pairs[e.id] === e.id).length;
  const rows = r.words.map((e, i) => {
    const picked = r.definitions.find(x => x.id === r.pairs[e.id]);
    const correct = picked?.id === e.id;
    const detail = correct ? '' : `<div class="meta"><span>your match: ${escapeHTML(picked?.definition || '—')}</span></div><div class="meta"><span>correct: ${escapeHTML(e.definition)}</span></div>`;
    return `<tr><td class="rank">${i + 1}.</td><td class="entry"><div class="entry-line"><strong>${escapeHTML(e.word)}</strong><span class="${correct ? 'result-good' : 'result-bad'}">${correct ? 'correct' : 'not quite'}</span></div>${detail}</td></tr>`;
  }).join('');
  return `<div class="score-row"><span>round complete — ${scored} / ${r.words.length} correct</span><span>|</span><a href="#again" data-retry>new round</a><span>|</span><a href="#setup" data-back-setup>change settings</a></div><table class="word-table"><tbody>${rows}</tbody></table>`;
}

function renderPractice() { $('#practiceContent').innerHTML = state.results ? renderResults() : state.round ? renderRound() : practiceSetup(); }

function startRound(count, feedback) {
  const words = shuffle(state.entries).slice(0, count);
  state.round = { words, definitions: shuffle(words), pairs: {} };
  state.feedbackMode = feedback; state.results = null; state.selectedWordId = null; state.selectedDefinitionId = null;
  renderPractice();
}
function pairIfReady() {
  if (!state.selectedWordId || !state.selectedDefinitionId) return;
  const r = state.round;
  Object.keys(r.pairs).forEach(w => { if (r.pairs[w] === state.selectedDefinitionId) delete r.pairs[w]; });
  r.pairs[state.selectedWordId] = state.selectedDefinitionId;
  if (state.feedbackMode === 'instant') toast(state.selectedWordId === state.selectedDefinitionId ? 'correct' : 'not quite — pick the word again to change it');
  state.selectedWordId = null; state.selectedDefinitionId = null;
}
function chooseWord(wordId) {
  const r = state.round;
  if (r.pairs[wordId]) { delete r.pairs[wordId]; state.selectedDefinitionId = null; }
  state.selectedWordId = state.selectedWordId === wordId ? null : wordId;
  pairIfReady(); renderPractice();
}
function chooseDefinition(defId) {
  state.selectedDefinitionId = state.selectedDefinitionId === defId ? null : defId;
  pairIfReady(); renderPractice();
}

function resetForm() { state.editingId = null; $('#wordForm').reset(); $('#submitButton').textContent = 'add word'; $('#cancelEdit').classList.add('is-hidden'); }

async function saveNote(entryId) {
  const input = document.querySelector(`[data-note-input="${entryId}"]`); if (!input) return;
  const note = input.value.trim();
  const previous = state.entries;
  state.entries = state.entries.map(e => e.id === entryId ? { ...e, note } : e);
  state.notingId = null; renderList();
  try { await saveEntries(); renderList(); toast(note ? 'Note saved.' : 'Note removed.'); }
  catch (error) { state.entries = previous; renderList(); toast(error.message); }
}

function parseDelimited(text) {
  const firstLine = text.slice(0, text.indexOf('\n') === -1 ? text.length : text.indexOf('\n'));
  const delimiter = firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',';
  const rows = []; let row = []; let field = ''; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = ''; rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function importWordsFile(file) {
  let rows;
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      if (typeof XLSX === 'undefined') throw new Error('Excel support did not load — save the sheet as CSV instead.');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: false, defval: '' });
    } else {
      rows = parseDelimited(await file.text());
    }
  } catch (error) { toast(error.message || 'Could not read that file.'); return; }

  const existing = new Set(state.entries.map(e => e.word.toLowerCase()));
  const added = []; let skipped = 0;
  rows.forEach((raw, index) => {
    const word = String(raw?.[0] ?? '').trim(); const definition = String(raw?.[1] ?? '').trim();
    if (!word && !definition) return;
    if (index === 0 && word.toLowerCase() === 'word') return;
    if (!word || !definition || word.length > 80 || definition.length > 300 || existing.has(word.toLowerCase())) { skipped++; return; }
    existing.add(word.toLowerCase());
    added.push({ id: id(), word, definition, createdAt: new Date().toISOString() });
  });

  if (!added.length) { toast(skipped ? `Nothing imported — ${skipped} row${skipped === 1 ? '' : 's'} skipped (empty, too long, or already in your list).` : 'No word rows found in that file.'); return; }
  const previous = state.entries;
  state.entries = [...added, ...state.entries];
  clearRound(); render();
  try {
    await saveEntries(); render();
    toast(`Imported ${added.length} word${added.length === 1 ? '' : 's'}${skipped ? `, skipped ${skipped}` : ''}.`);
  } catch (error) { state.entries = previous; render(); toast(error.message); }
}

document.addEventListener('click', event => {
  const control = event.target.closest('a, button'); if (!control) return;
  if (control.dataset.view) { event.preventDefault(); state.view = control.dataset.view; render(); return; }
  if (control.dataset.edit) {
    event.preventDefault();
    const entry = state.entries.find(x => x.id === control.dataset.edit); if (!entry) return;
    state.editingId = entry.id; $('#wordInput').value = entry.word; $('#definitionInput').value = entry.definition;
    $('#submitButton').textContent = 'update'; $('#cancelEdit').classList.remove('is-hidden'); $('#wordInput').focus();
    return;
  }
  if (control.dataset.delete) {
    event.preventDefault();
    const previous = state.entries;
    state.entries = state.entries.filter(x => x.id !== control.dataset.delete);
    if (state.editingId === control.dataset.delete) resetForm();
    clearRound(); render();
    saveEntries().catch(error => { state.entries = previous; render(); toast(error.message); });
    return;
  }
  if (control.hasAttribute('data-retry-load')) { event.preventDefault(); loadEntries(); return; }
  if (control.dataset.note) { event.preventDefault(); state.notingId = control.dataset.note; renderList(); document.querySelector(`[data-note-input="${state.notingId}"]`)?.focus(); return; }
  if (control.dataset.noteSave) { event.preventDefault(); saveNote(control.dataset.noteSave); return; }
  if (control.hasAttribute('data-note-cancel')) { event.preventDefault(); state.notingId = null; renderList(); return; }
  if (control.dataset.word) { event.preventDefault(); chooseWord(control.dataset.word); return; }
  if (control.dataset.definition) { event.preventDefault(); chooseDefinition(control.dataset.definition); return; }
  if (control.hasAttribute('data-submit-round')) { state.results = { done: true }; renderPractice(); return; }
  if (control.hasAttribute('data-end-round') || control.hasAttribute('data-back-setup')) { event.preventDefault(); clearRound(); renderPractice(); return; }
  if (control.hasAttribute('data-retry')) { event.preventDefault(); startRound(state.round.words.length, state.feedbackMode); return; }
  if (control.id === 'cancelEdit') { event.preventDefault(); resetForm(); return; }
  if (control.id === 'importWords') { event.preventDefault(); $('#importFile').click(); return; }
  if (control.id === 'exportJson') {
    event.preventDefault();
    const blob = new Blob([JSON.stringify(state.entries, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob); anchor.download = 'words.json'; anchor.click();
    URL.revokeObjectURL(anchor.href);
  }
});

document.addEventListener('submit', event => {
  if (event.target.id !== 'setupForm') return;
  event.preventDefault();
  const form = new FormData(event.target);
  startRound(Number(form.get('count')), form.get('feedback'));
});

$('#wordForm').addEventListener('submit', async event => {
  event.preventDefault();
  const word = $('#wordInput').value.trim(); const definition = $('#definitionInput').value.trim();
  if (!word || !definition) return;
  const previous = state.entries;
  if (state.editingId) {
    state.entries = state.entries.map(e => e.id === state.editingId ? { ...e, word, definition } : e);
  } else {
    state.entries = [{ id: id(), word, definition, createdAt: new Date().toISOString() }, ...state.entries];
  }
  resetForm(); clearRound(); render();
  try { await saveEntries(); } catch (error) { state.entries = previous; render(); toast(error.message); }
});
$('#searchInput').addEventListener('input', event => { state.query = event.target.value; renderList(); });
document.addEventListener('keydown', event => {
  const input = event.target instanceof Element ? event.target.closest('[data-note-input]') : null; if (!input) return;
  if (event.key === 'Enter') { event.preventDefault(); saveNote(input.dataset.noteInput); }
  else if (event.key === 'Escape') { state.notingId = null; renderList(); }
});
$('#importFile').addEventListener('change', event => { const file = event.target.files[0]; event.target.value = ''; if (file) importWordsFile(file); });

render();
loadEntries();
