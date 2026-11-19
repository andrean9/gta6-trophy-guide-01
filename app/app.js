// Leonida Trophy Guide — offline trophy tracker (ES module, no libraries).
// Loads data/trophies.json, renders all 55 trophies, tracks earned state in
// localStorage, and sets window.__shotReady once the first render is done.

const STORAGE_KEY = 'leonida-trophy-guide.earned.v1';
const SPOILER_KEY = 'leonida-trophy-guide.hide-spoilers.v1';

const STAGES = [
  { stage: 1, name: 'Story playthrough' },
  { stage: 2, name: 'Stranger strands' },
  { stage: 3, name: 'Activities' },
  { stage: 4, name: 'Collectibles & clean-up' },
  { stage: 5, name: 'Platinum' },
];

const els = {
  list: document.getElementById('trophy-list'),
  loading: document.getElementById('loading'),
  empty: document.getElementById('empty-state'),
  resultCount: document.getElementById('result-count'),
  earnedCount: document.getElementById('earned-count'),
  progressBar: document.getElementById('progress-bar'),
  progressFill: document.getElementById('progress-fill'),
  search: document.getElementById('search'),
  kindFilter: document.getElementById('kind-filter'),
  gradeFilter: document.getElementById('grade-filter'),
  spoilerToggle: document.getElementById('spoiler-toggle'),
  earnedOnlyToggle: document.getElementById('earned-only-toggle'),
  exportBtn: document.getElementById('export-btn'),
  importBtn: document.getElementById('import-btn'),
  importFile: document.getElementById('import-file'),
  roadmapStages: document.getElementById('roadmap-stages'),
};

let trophies = [];
let earned = new Set();
let hideSpoilers = false;

function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return new Set();
    return new Set(ids.filter((id) => Number.isInteger(id) && id >= 1 && id <= 55));
  } catch {
    return new Set();
  }
}

function saveEarned() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
  } catch {
    // Storage full or unavailable: the page still works for this session.
  }
}

function loadSpoilerPref() {
  try {
    return localStorage.getItem(SPOILER_KEY) === '1';
  } catch {
    return false;
  }
}

function saveSpoilerPref() {
  try {
    localStorage.setItem(SPOILER_KEY, hideSpoilers ? '1' : '0');
  } catch {
    // Ignore: preference is a nicety, not core state.
  }
}

function updateProgress() {
  const count = earned.size;
  els.earnedCount.textContent = String(count);
  els.progressFill.style.width = `${(count / 55) * 100}%`;
  els.progressBar.setAttribute('aria-valuenow', String(count));
  for (const item of els.roadmapStages.querySelectorAll('.roadmap-stage')) {
    const stage = Number(item.dataset.stage);
    const inStage = trophies.filter((t) => t.roadmap_stage === stage);
    const done = inStage.filter((t) => earned.has(t.id)).length;
    item.querySelector('.stage-count').textContent = `${done} of ${inStage.length} earned`;
    item.querySelector('.stage-fill').style.width =
      inStage.length ? `${(done / inStage.length) * 100}%` : '0%';
  }
}

function renderRoadmap() {
  els.roadmapStages.innerHTML = '';
  for (const { stage, name } of STAGES) {
    const inStage = trophies.filter((t) => t.roadmap_stage === stage);
    const li = document.createElement('li');
    li.className = 'roadmap-stage';
    li.dataset.stage = String(stage);
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = `Stage ${stage}`;
    const title = document.createElement('span');
    title.className = 'stage-name';
    title.textContent = name;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `0 of ${inStage.length} earned`;
    const bar = document.createElement('div');
    bar.className = 'stage-bar';
    const fill = document.createElement('div');
    fill.className = 'stage-fill';
    bar.appendChild(fill);
    li.append(num, title, count, bar);
    els.roadmapStages.appendChild(li);
  }
}

function matchesFilters(t) {
  const q = els.search.value.trim().toLowerCase();
  if (q) {
    const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (els.kindFilter.value !== 'all' && t.kind !== els.kindFilter.value) return false;
  if (els.gradeFilter.value !== 'all' && t.grade !== els.gradeFilter.value) return false;
  if (els.earnedOnlyToggle.checked && !earned.has(t.id)) return false;
  return true;
}

function renderList() {
  els.list.innerHTML = '';
  const visible = trophies.filter(matchesFilters);
  els.empty.hidden = visible.length > 0;
  els.resultCount.textContent =
    visible.length === trophies.length ? '' : `(${visible.length} shown)`;

  for (const t of visible) {
    const isEarned = earned.has(t.id);
    const li = document.createElement('li');
    li.className = `trophy-card grade-${t.grade}${isEarned ? ' earned' : ''}`;
    if (hideSpoilers) li.classList.add('guide-hidden');
    li.dataset.id = String(t.id);

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'trophy-check';
    check.checked = isEarned;
    check.setAttribute('aria-label', `Mark ${t.name} as earned`);
    check.addEventListener('change', () => {
      if (check.checked) earned.add(t.id);
      else earned.delete(t.id);
      saveEarned();
      li.classList.toggle('earned', check.checked);
      updateProgress();
      if (els.earnedOnlyToggle.checked) renderList();
    });

    const body = document.createElement('div');

    const head = document.createElement('div');
    head.className = 'trophy-head';
    const name = document.createElement('h3');
    name.className = 'trophy-name';
    name.textContent = t.name;
    head.appendChild(name);

    const gradeBadge = document.createElement('span');
    gradeBadge.className = `badge badge-grade-${t.grade}`;
    gradeBadge.textContent = t.grade;
    head.appendChild(gradeBadge);

    const kindBadge = document.createElement('span');
    kindBadge.className = 'badge badge-kind';
    kindBadge.textContent = t.kind;
    head.appendChild(kindBadge);

    if (t.missable) {
      const miss = document.createElement('span');
      miss.className = 'badge badge-missable';
      miss.textContent = 'Missable';
      head.appendChild(miss);
    }
    body.appendChild(head);

    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = t.description;
    body.appendChild(desc);

    const guide = document.createElement('p');
    guide.className = 'trophy-guide';
    const label = document.createElement('span');
    label.className = 'guide-label';
    label.textContent = 'Guide';
    const text = document.createElement('span');
    text.className = 'trophy-guide-text';
    text.textContent = t.guide;
    guide.append(label, text);
    body.appendChild(guide);

    if (hideSpoilers) {
      const reveal = document.createElement('button');
      reveal.type = 'button';
      reveal.className = 'reveal-btn';
      reveal.textContent = 'Reveal guide';
      reveal.addEventListener('click', () => {
        li.classList.remove('guide-hidden');
        reveal.remove();
      });
      body.appendChild(reveal);
    }

    li.append(check, body);
    els.list.appendChild(li);
  }
}

function exportProgress() {
  const payload = {
    app: 'leonida-trophy-guide',
    version: 1,
    earned: [...earned].sort((a, b) => a - b),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leonida-trophy-progress.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      const ids = Array.isArray(data) ? data : data.earned;
      if (!Array.isArray(ids)) throw new Error('no earned list');
      const valid = ids.filter((id) => Number.isInteger(id) && id >= 1 && id <= 55);
      earned = new Set(valid);
      saveEarned();
      renderList();
      updateProgress();
    } catch {
      alert('That file is not a valid Leonida Trophy Guide progress export.');
    }
  };
  reader.readAsText(file);
}

async function init() {
  earned = loadEarned();
  hideSpoilers = loadSpoilerPref();
  els.spoilerToggle.checked = hideSpoilers;

  els.search.addEventListener('input', renderList);
  els.kindFilter.addEventListener('change', renderList);
  els.gradeFilter.addEventListener('change', renderList);
  els.earnedOnlyToggle.addEventListener('change', renderList);
  els.spoilerToggle.addEventListener('change', () => {
    hideSpoilers = els.spoilerToggle.checked;
    saveSpoilerPref();
    renderList();
  });
  els.exportBtn.addEventListener('click', exportProgress);
  els.importBtn.addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', () => {
    const file = els.importFile.files && els.importFile.files[0];
    if (file) importProgress(file);
    els.importFile.value = '';
  });

  try {
    const res = await fetch('data/trophies.json');
    if (!res.ok) throw new Error(`trophies.json: ${res.status}`);
    const data = await res.json();
    trophies = data.trophies;
  } catch (err) {
    els.loading.textContent = 'Could not load the trophy list. Serve this folder over a local server and reload.';
    throw err;
  }

  els.loading.remove();
  renderRoadmap();
  renderList();
  updateProgress();
  window.__shotReady = true;
}

init();
