// Leonida Trophy Guide — offline trophy tracker (ES module, no libraries).
// Loads data/trophies.json, renders all 55 trophies, tracks earned state in
// localStorage, and sets window.__shotReady once the first render is done.
// Phase 2 adds: a rich roadmap view with per-stage trophy lists, a trophy
// detail side panel, and live progress stats by grade and by kind.

const STORAGE_KEY = 'leonida-trophy-guide.earned.v1';
const SPOILER_KEY = 'leonida-trophy-guide.hide-spoilers.v1';

// Stage notes are built only from the official trophy descriptions and the
// data in trophies.json — no chapter or mission details beyond what the
// descriptions themselves name.
const STAGES = [
  {
    stage: 1,
    name: 'Story playthrough',
    note: 'Play the story from the opening mission, Gone Fishing, through Chapters 1–4 to the final mission. Named missions on this list: Breakfast Run, The Cartel Heist, Child\u2019s Play, Headliners, VCIA Takedown, Operation Savage Glory. Keep a backup save before big story choices — Actions Speak Louder turns on them.',
  },
  {
    stage: 2,
    name: 'Stranger strands',
    note: 'Five named strangers have a final-mission trophy each — Andy, Kenton, Billy, Randy, Tyrone — and Strangers & Freaks needs 8 full strands, so there are more strangers to find across Leonida.',
  },
  {
    stage: 3,
    name: 'Activities',
    note: 'The biggest stage: 27 trophies. The counted ones are 250 stunts, 20 different race wins, 50 challenges, 5 bank vaults, $250,000 laundered through contacts, $100,000 spent across shops, and 10 vehicles registered to the Scooter Bros app. Most are cumulative and retryable in free roam.',
  },
  {
    stage: 4,
    name: 'Collectibles & clean-up',
    note: 'Sweep Leonida after the story: 100% completion, 3 Collectible Card sets, WAiNK at 100 locations, 100 vehicles discovered, every meditation spot, every area explored, and all garage properties.',
  },
  {
    stage: 5,
    name: 'Platinum',
    note: 'Unlocks automatically once the other 54 trophies are earned — there is nothing separate to do for it.',
  },
];

const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const KINDS = ['story', 'activities', 'collectibles'];

// Pulls the count out of an official description, where the description
// gives one ("Complete 250 Stunts.", "Earn $250,000 …"). Chapter numbers
// ("Complete Chapter 1.") are not counts and are deliberately not matched.
function extractCount(description) {
  const money = description.match(/\$[\d,]+/);
  if (money) return money[0];
  if (/100%/.test(description)) return '100%';
  const counted = description.match(
    /(\d+)\s+(?:Stunts|different races|Challenges|Bank Vaults|vehicles|locations|Collectible Card sets|mission strands)/i,
  );
  if (counted) return `\u00d7${counted[1]}`;
  return '';
}

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
  statsGrade: document.getElementById('stats-grade'),
  statsKind: document.getElementById('stats-kind'),
  detailPanel: document.getElementById('detail-panel'),
};

let trophies = [];
let earned = new Set();
let hideSpoilers = false;
let selectedId = null;

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

function setEarned(id, isEarned) {
  if (isEarned) earned.add(id);
  else earned.delete(id);
  saveEarned();
  updateProgress();
}

function stageName(stage) {
  const found = STAGES.find((s) => s.stage === stage);
  return found ? `Stage ${found.stage}: ${found.name}` : `Stage ${stage}`;
}

function updateStats() {
  const build = (container, keys, field) => {
    container.innerHTML = '';
    for (const key of keys) {
      const inGroup = trophies.filter((t) => t[field] === key);
      const done = inGroup.filter((t) => earned.has(t.id)).length;
      const wrapper = document.createElement('div');
      wrapper.className = 'stat';
      const term = document.createElement('dt');
      term.className = `stat-label stat-${key}`;
      term.textContent = key;
      const value = document.createElement('dd');
      value.className = 'stat-value';
      value.textContent = `${done} / ${inGroup.length}`;
      wrapper.append(term, value);
      container.appendChild(wrapper);
    }
  };
  build(els.statsGrade, GRADES, 'grade');
  build(els.statsKind, KINDS, 'kind');
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
    for (const row of item.querySelectorAll('.stage-trophy')) {
      const isEarned = earned.has(Number(row.dataset.id));
      row.classList.toggle('earned', isEarned);
      row.querySelector('.stage-trophy-mark').textContent = isEarned ? '\u2713' : '\u25cb';
    }
  }
  updateStats();
  // Keep the detail panel's Earned toggle in sync with the checklist.
  const detailCheck = els.detailPanel.querySelector('#detail-earned');
  if (detailCheck && selectedId !== null) {
    detailCheck.checked = earned.has(selectedId);
  }
}

function renderRoadmap() {
  els.roadmapStages.innerHTML = '';
  for (const { stage, name, note } of STAGES) {
    const inStage = trophies
      .filter((t) => t.roadmap_stage === stage)
      .sort((a, b) => a.id - b.id);
    const li = document.createElement('li');
    li.className = 'roadmap-stage';
    li.dataset.stage = String(stage);

    const head = document.createElement('div');
    head.className = 'stage-head';
    const num = document.createElement('span');
    num.className = 'stage-num';
    num.textContent = `Stage ${stage}`;
    const title = document.createElement('span');
    title.className = 'stage-name';
    title.textContent = name;
    const count = document.createElement('span');
    count.className = 'stage-count';
    count.textContent = `0 of ${inStage.length} earned`;
    head.append(num, title, count);

    const bar = document.createElement('div');
    bar.className = 'stage-bar';
    const fill = document.createElement('div');
    fill.className = 'stage-fill';
    bar.appendChild(fill);

    const noteEl = document.createElement('p');
    noteEl.className = 'stage-note';
    noteEl.textContent = note;

    const trophyList = document.createElement('ul');
    trophyList.className = 'stage-trophies';
    for (const t of inStage) {
      const row = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `stage-trophy grade-${t.grade}`;
      btn.dataset.id = String(t.id);
      btn.setAttribute('aria-label', `Open detail for ${t.name}`);
      btn.addEventListener('click', () => {
        openDetail(t.id);
        els.detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      const mark = document.createElement('span');
      mark.className = 'stage-trophy-mark';
      mark.textContent = earned.has(t.id) ? '\u2713' : '\u25cb';

      const trophyName = document.createElement('span');
      trophyName.className = 'stage-trophy-name';
      trophyName.textContent = t.name;

      const gradeBadge = document.createElement('span');
      gradeBadge.className = `badge badge-grade-${t.grade}`;
      gradeBadge.textContent = t.grade;

      btn.append(mark, trophyName, gradeBadge);

      const countText = extractCount(t.description);
      if (countText) {
        const chip = document.createElement('span');
        chip.className = 'stage-trophy-count';
        chip.textContent = countText;
        btn.appendChild(chip);
      }

      if (t.missable) {
        const miss = document.createElement('span');
        miss.className = 'badge badge-missable';
        miss.textContent = 'Missable';
        btn.appendChild(miss);
      }

      row.appendChild(btn);
      trophyList.appendChild(row);
    }

    li.append(head, bar, noteEl, trophyList);
    els.roadmapStages.appendChild(li);
  }
}

function openDetail(id) {
  const t = trophies.find((item) => item.id === id);
  if (!t) return;
  selectedId = id;
  for (const card of els.list.querySelectorAll('.trophy-card')) {
    card.classList.toggle('selected', Number(card.dataset.id) === id);
  }
  for (const row of els.roadmapStages.querySelectorAll('.stage-trophy')) {
    row.classList.toggle('selected', Number(row.dataset.id) === id);
  }

  els.detailPanel.innerHTML = '';
  const panel = document.createElement('div');
  panel.className = 'detail-body';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'detail-close';
  close.setAttribute('aria-label', 'Close trophy detail');
  close.textContent = '\u00d7';
  close.addEventListener('click', closeDetail);

  const num = document.createElement('p');
  num.className = 'detail-num';
  num.textContent = `Trophy ${t.id} of 55`;

  const name = document.createElement('h2');
  name.className = 'detail-name';
  name.textContent = t.name;

  const badges = document.createElement('div');
  badges.className = 'detail-badges';
  const gradeBadge = document.createElement('span');
  gradeBadge.className = `badge badge-grade-${t.grade}`;
  gradeBadge.textContent = t.grade;
  const kindBadge = document.createElement('span');
  kindBadge.className = 'badge badge-kind';
  kindBadge.textContent = t.kind;
  badges.append(gradeBadge, kindBadge);
  if (t.missable) {
    const miss = document.createElement('span');
    miss.className = 'badge badge-missable';
    miss.textContent = 'Missable';
    badges.appendChild(miss);
  }

  const stage = document.createElement('p');
  stage.className = 'detail-stage';
  stage.textContent = stageName(t.roadmap_stage);

  const descLabel = document.createElement('p');
  descLabel.className = 'detail-label';
  descLabel.textContent = 'Official description';
  const desc = document.createElement('p');
  desc.className = 'detail-desc';
  desc.textContent = t.description;

  const guideLabel = document.createElement('p');
  guideLabel.className = 'detail-label';
  guideLabel.textContent = 'Guide';
  const guide = document.createElement('p');
  guide.className = 'detail-guide';
  guide.textContent = t.guide;

  const sources = document.createElement('p');
  sources.className = 'detail-sources';
  sources.textContent = `Sources: ${t.sources.join(', ')}.`;

  const earnedRow = document.createElement('label');
  earnedRow.className = 'detail-earned-row';
  const earnedCheck = document.createElement('input');
  earnedCheck.type = 'checkbox';
  earnedCheck.id = 'detail-earned';
  earnedCheck.checked = earned.has(t.id);
  earnedCheck.addEventListener('change', () => {
    setEarned(t.id, earnedCheck.checked);
    const card = els.list.querySelector(`.trophy-card[data-id="${t.id}"]`);
    if (card) {
      card.classList.toggle('earned', earnedCheck.checked);
      const cardCheck = card.querySelector('.trophy-check');
      if (cardCheck) cardCheck.checked = earnedCheck.checked;
    }
    if (els.earnedOnlyToggle.checked) renderList();
  });
  const earnedLabel = document.createElement('span');
  earnedLabel.textContent = 'Earned';
  earnedRow.append(earnedCheck, earnedLabel);

  panel.append(close, num, name, badges, stage, descLabel, desc, guideLabel, guide, sources, earnedRow);
  els.detailPanel.appendChild(panel);
}

function closeDetail() {
  selectedId = null;
  for (const card of els.list.querySelectorAll('.trophy-card.selected')) {
    card.classList.remove('selected');
  }
  for (const row of els.roadmapStages.querySelectorAll('.stage-trophy.selected')) {
    row.classList.remove('selected');
  }
  els.detailPanel.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'detail-empty';
  const heading = document.createElement('h2');
  heading.textContent = 'Trophy detail';
  const text = document.createElement('p');
  text.textContent =
    'Select any trophy — in the checklist below the roadmap, or in a roadmap stage — to read its full guide here, beside the list.';
  empty.append(heading, text);
  els.detailPanel.appendChild(empty);
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
    if (t.id === selectedId) li.classList.add('selected');
    li.dataset.id = String(t.id);
    li.addEventListener('click', (event) => {
      // The checkbox and the Reveal button keep their own behaviour.
      if (event.target.closest('input, button')) return;
      openDetail(t.id);
    });

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'trophy-check';
    check.checked = isEarned;
    check.setAttribute('aria-label', `Mark ${t.name} as earned`);
    check.addEventListener('change', () => {
      setEarned(t.id, check.checked);
      li.classList.toggle('earned', check.checked);
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
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && selectedId !== null) closeDetail();
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
