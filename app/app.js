// Leonida Trophy Guide — checklist, tracker, roadmap and detail panel.
// Vanilla ES module. Loads the trophy data from a file under app/,
// renders all 55 trophies, and saves earned progress in localStorage.
// Filters by kind, grade, search, earned-only and missable-only; a
// spoiler mode hides un-earned story trophies; a five-stage roadmap
// tracks the same checklist; clicking a trophy opens its guide in a
// detail panel; progress exports to a JSON file and imports back.
// No network request leaves the app: the only fetch is a relative
// path to the bundled data file. Sets window.__shotReady once the
// list has rendered (or an error state has rendered instead).

const DATA_URL = "data/trophies.json";
const STORAGE_KEY = "leonida-trophy-guide-earned-v2";
const SPOILER_KEY = "leonida-trophy-guide-spoiler-v2";
const EXPORT_FILENAME = "leonida-trophy-guide-progress.json";

const GRADE_ORDER = ["platinum", "gold", "silver", "bronze"];
const GRADE_LABEL = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};
const KIND_LABEL = {
  story: "Story",
  collectibles: "Collectibles",
  activities: "Activities",
  combat: "Combat",
  exploration: "Exploration",
  economy: "Economy",
  misc: "Free roam",
  meta: "Completion",
};

let trophies = [];
let trophyById = new Map();
let roadmapList = [];
let roadmapByStage = new Map();
let earned = new Set();
let spoilerMode = false;
let selectedId = null;
const filters = {
  search: "",
  kind: "",
  grade: "",
  earnedOnly: false,
  missableOnly: false,
};

const listEl = document.getElementById("trophy-list");
const statusEl = document.getElementById("status-note");
const countEl = document.getElementById("progress-count");
const statsEl = document.getElementById("grade-stats");
const fillEl = document.getElementById("progress-fill");
const barEl = document.getElementById("progress-bar");
const searchEl = document.getElementById("filter-search");
const kindEl = document.getElementById("filter-kind");
const gradeEl = document.getElementById("filter-grade");
const earnedOnlyEl = document.getElementById("filter-earned-only");
const missableOnlyEl = document.getElementById("filter-missable-only");
const spoilerEl = document.getElementById("spoiler-toggle");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFileEl = document.getElementById("import-file");
const roadmapEl = document.getElementById("roadmap");
const checklistViewEl = document.getElementById("view-checklist");
const roadmapViewEl = document.getElementById("view-roadmap");
const checklistBtn = document.getElementById("view-checklist-btn");
const roadmapBtn = document.getElementById("view-roadmap-btn");
const detailPanelEl = document.getElementById("detail-panel");
const detailContentEl = document.getElementById("detail-content");
const detailCloseEl = document.getElementById("detail-close");

function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) return new Set();
    return new Set(ids.filter((id) => Number.isInteger(id)));
  } catch {
    return new Set();
  }
}

function saveEarned() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
  } catch {
    // Storage full or unavailable (private mode): progress just
    // does not persist this session. The checklist still works.
  }
}

function loadSpoilerMode() {
  try {
    return localStorage.getItem(SPOILER_KEY) === "on";
  } catch {
    return false;
  }
}

function saveSpoilerMode() {
  try {
    localStorage.setItem(SPOILER_KEY, spoilerMode ? "on" : "off");
  } catch {
    // Same as above: the setting just does not persist this session.
  }
}

function updateProgress() {
  const total = trophies.length;
  const done = earned.size;
  countEl.textContent = `${done} / ${total} earned`;
  fillEl.style.width = total === 0 ? "0%" : `${(done / total) * 100}%`;
  barEl.setAttribute("aria-valuenow", String(done));
  barEl.setAttribute("aria-valuemax", String(total));
  renderGradeStats();
  if (roadmapList.length > 0) renderRoadmap();
}

function renderGradeStats() {
  statsEl.replaceChildren();
  for (const grade of GRADE_ORDER) {
    const inGrade = trophies.filter((t) => t.grade === grade);
    const got = inGrade.filter((t) => earned.has(t.id)).length;
    const box = document.createElement("div");
    box.className = "grade-stat";

    const label = document.createElement("span");
    label.className = `grade grade-${grade}`;
    label.textContent = GRADE_LABEL[grade];
    box.appendChild(label);

    const numbers = document.createElement("strong");
    numbers.className = "grade-stat-numbers";
    numbers.textContent = `${got}/${inGrade.length}`;
    box.appendChild(numbers);

    const track = document.createElement("div");
    track.className = "grade-stat-track";
    const fill = document.createElement("div");
    fill.className = "grade-stat-fill";
    fill.style.width = inGrade.length === 0 ? "0%" : `${(got / inGrade.length) * 100}%`;
    track.appendChild(fill);
    box.appendChild(track);

    statsEl.appendChild(box);
  }
}

function makeChip(text, extraClass) {
  const chip = document.createElement("span");
  chip.className = extraClass ? `chip ${extraClass}` : "chip";
  chip.textContent = text;
  return chip;
}

// Spoiler mode hides a story trophy's name, description and guide until
// it is earned. The grade and kind stay visible: they spoil nothing.
function isSpoilerHidden(trophy) {
  return spoilerMode && trophy.kind === "story" && !earned.has(trophy.id);
}

function buildTrophyCard(trophy) {
  const masked = isSpoilerHidden(trophy);
  const item = document.createElement("li");
  item.className = "trophy";
  item.dataset.id = String(trophy.id);
  item.dataset.grade = trophy.grade;
  item.dataset.kind = trophy.kind || "misc";
  item.dataset.stage = String(trophy.stage || "");
  item.tabIndex = 0;
  if (earned.has(trophy.id)) item.classList.add("earned");
  if (masked) item.classList.add("spoiler-hidden");

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "trophy-check";
  check.checked = earned.has(trophy.id);
  check.setAttribute("aria-label", masked ? "Mark this hidden story trophy as earned" : `Mark ${trophy.name} as earned`);
  check.addEventListener("click", (event) => event.stopPropagation());
  check.addEventListener("change", () => {
    setEarned(trophy.id, check.checked);
  });
  item.appendChild(check);

  const body = document.createElement("div");
  body.className = "trophy-body";

  const head = document.createElement("div");
  head.className = "trophy-head";
  const name = document.createElement("h2");
  name.className = "trophy-name";
  name.textContent = masked ? "Hidden story trophy" : trophy.name;
  head.appendChild(name);
  const grade = document.createElement("span");
  grade.className = `grade grade-${trophy.grade}`;
  grade.textContent = GRADE_LABEL[trophy.grade] || trophy.grade;
  head.appendChild(grade);
  body.appendChild(head);

  const desc = document.createElement("p");
  desc.className = "trophy-desc";
  desc.textContent = masked
    ? "Its name and description stay hidden until you earn it."
    : trophy.description;
  body.appendChild(desc);

  const guide = document.createElement("p");
  guide.className = "trophy-guide";
  guide.textContent = masked
    ? "Spoiler mode is on: earn this trophy to reveal its guide."
    : trophy.guide;
  body.appendChild(guide);

  const meta = document.createElement("div");
  meta.className = "trophy-meta";
  meta.appendChild(makeChip(KIND_LABEL[trophy.kind] || trophy.kind || "Trophy"));
  if (trophy.countLabel) meta.appendChild(makeChip(trophy.countLabel));
  const stage = roadmapByStage.get(trophy.stage);
  if (stage) meta.appendChild(makeChip(`Stage ${stage.stage} · ${stage.title}`));
  if (trophy.hidden) meta.appendChild(makeChip("Hidden", "chip-hidden"));
  if (trophy.missable) meta.appendChild(makeChip("Missable", "chip-missable"));
  body.appendChild(meta);

  const sources = document.createElement("p");
  sources.className = "trophy-sources";
  const names = Array.isArray(trophy.sources) ? trophy.sources : [];
  sources.textContent = names.length > 0
    ? `Sources: ${names.join(", ")}`
    : "Sources: official PlayStation trophy list";
  body.appendChild(sources);

  item.appendChild(body);
  refreshEarnedTag(item, trophy);

  // The whole card opens the detail panel; the checkbox is exempted above.
  item.addEventListener("click", () => openDetail(trophy.id));
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetail(trophy.id);
    }
  });
  return item;
}

// The single place earned state changes: the checkbox, the detail panel
// and an import all come through here, so every view stays in step.
function setEarned(id, isEarned) {
  if (isEarned) earned.add(id);
  else earned.delete(id);
  saveEarned();
  updateProgress();
  const card = listEl.querySelector(`[data-id="${id}"]`);
  const trophy = trophyById.get(id);
  if (card && trophy) {
    // Spoiler mode masks a story trophy until it is earned, so earning
    // or un-earning one changes its card content: rebuild that card.
    const fresh = buildTrophyCard(trophy);
    fresh.hidden = card.hidden;
    card.replaceWith(fresh);
  }
  if (selectedId === id) renderDetail();
  applyFilters();
}

function refreshEarnedTag(item, trophy) {
  const head = item.querySelector(".trophy-head");
  const old = head.querySelector(".earned-tag");
  if (old) old.remove();
  if (earned.has(trophy.id)) {
    const tag = document.createElement("span");
    tag.className = "earned-tag";
    tag.textContent = "✓ Earned";
    head.appendChild(tag);
  }
}

// ---------- Filters ----------

function trophyMatchesFilters(trophy) {
  if (filters.kind && trophy.kind !== filters.kind) return false;
  if (filters.grade && trophy.grade !== filters.grade) return false;
  if (filters.earnedOnly && !earned.has(trophy.id)) return false;
  if (filters.missableOnly && !trophy.missable) return false;
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    const haystack = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

function applyFilters() {
  let shown = 0;
  for (const card of listEl.children) {
    const trophy = trophyById.get(Number(card.dataset.id));
    const match = trophy ? trophyMatchesFilters(trophy) : false;
    card.hidden = !match;
    if (match) shown += 1;
  }
  const filtering =
    filters.search !== "" || filters.kind !== "" || filters.grade !== "" ||
    filters.earnedOnly || filters.missableOnly;
  statusEl.textContent = shown === 0
    ? "No trophies match these filters. Clear a filter to see the list again."
    : filtering
      ? `Showing ${shown} of ${trophies.length} trophies.`
      : `Showing all ${trophies.length} trophies. Tick a box when you earn one; your progress is saved in this browser.`;
}

// ---------- Roadmap ----------

function renderRoadmap() {
  roadmapEl.replaceChildren();
  for (const step of roadmapList) {
    const inStage = trophies.filter((t) => t.stage === step.stage);
    const got = inStage.filter((t) => earned.has(t.id)).length;

    const card = document.createElement("article");
    card.className = "roadmap-stage";

    const head = document.createElement("div");
    head.className = "roadmap-head";
    const num = document.createElement("span");
    num.className = "roadmap-num";
    num.textContent = String(step.stage);
    head.appendChild(num);
    const title = document.createElement("h2");
    title.className = "roadmap-title";
    title.textContent = step.title;
    head.appendChild(title);
    const count = document.createElement("strong");
    count.className = "roadmap-count";
    count.textContent = `${got}/${inStage.length} earned`;
    head.appendChild(count);
    card.appendChild(head);

    const summary = document.createElement("p");
    summary.className = "roadmap-summary";
    summary.textContent = step.summary;
    card.appendChild(summary);

    const track = document.createElement("div");
    track.className = "roadmap-track";
    const fill = document.createElement("div");
    fill.className = "roadmap-fill";
    fill.style.width = inStage.length === 0 ? "0%" : `${(got / inStage.length) * 100}%`;
    track.appendChild(fill);
    card.appendChild(track);

    const names = document.createElement("ul");
    names.className = "roadmap-trophies";
    for (const trophy of inStage) {
      const row = document.createElement("li");
      row.className = earned.has(trophy.id) ? "roadmap-trophy earned" : "roadmap-trophy";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "roadmap-trophy-btn";
      button.textContent = isSpoilerHidden(trophy)
        ? "Hidden story trophy"
        : `${earned.has(trophy.id) ? "✓ " : ""}${trophy.name}`;
      button.addEventListener("click", () => openDetail(trophy.id));
      row.appendChild(button);
      if (trophy.missable) row.appendChild(makeChip("Missable", "chip-missable"));
      names.appendChild(row);
    }
    card.appendChild(names);
    roadmapEl.appendChild(card);
  }
}

// ---------- Detail panel ----------

function openDetail(id) {
  selectedId = id;
  detailPanelEl.hidden = false;
  renderDetail();
}

function closeDetail() {
  selectedId = null;
  detailPanelEl.hidden = true;
  detailContentEl.replaceChildren();
}

function renderDetail() {
  const trophy = trophyById.get(selectedId);
  if (!trophy) return;
  const masked = isSpoilerHidden(trophy);
  detailContentEl.replaceChildren();

  const head = document.createElement("div");
  head.className = "detail-head";
  const name = document.createElement("h2");
  name.className = "detail-name";
  name.textContent = masked ? "Hidden story trophy" : trophy.name;
  head.appendChild(name);
  const grade = document.createElement("span");
  grade.className = `grade grade-${trophy.grade}`;
  grade.textContent = GRADE_LABEL[trophy.grade] || trophy.grade;
  head.appendChild(grade);
  detailContentEl.appendChild(head);

  const desc = document.createElement("p");
  desc.className = "detail-desc";
  desc.textContent = masked
    ? "Spoiler mode hides this story trophy until you earn it."
    : trophy.description;
  detailContentEl.appendChild(desc);

  const guideLabel = document.createElement("h3");
  guideLabel.className = "detail-label";
  guideLabel.textContent = "Guide";
  detailContentEl.appendChild(guideLabel);
  const guide = document.createElement("p");
  guide.className = "detail-guide";
  guide.textContent = masked
    ? "Earn this trophy to reveal its guide."
    : trophy.guide;
  detailContentEl.appendChild(guide);

  const meta = document.createElement("div");
  meta.className = "trophy-meta";
  meta.appendChild(makeChip(KIND_LABEL[trophy.kind] || trophy.kind || "Trophy"));
  if (trophy.countLabel) meta.appendChild(makeChip(trophy.countLabel));
  const stage = roadmapByStage.get(trophy.stage);
  if (stage) meta.appendChild(makeChip(`Stage ${stage.stage} · ${stage.title}`));
  if (trophy.hidden) meta.appendChild(makeChip("Hidden", "chip-hidden"));
  if (trophy.missable) meta.appendChild(makeChip("Missable", "chip-missable"));
  detailContentEl.appendChild(meta);

  if (trophy.missable) {
    const warn = document.createElement("p");
    warn.className = "detail-missable";
    warn.textContent = "Missable: this trophy tracks choices that lock in during a playthrough. Keep a save before major decisions.";
    detailContentEl.appendChild(warn);
  }

  const sources = document.createElement("p");
  sources.className = "trophy-sources";
  const names = Array.isArray(trophy.sources) ? trophy.sources : [];
  sources.textContent = names.length > 0
    ? `Sources: ${names.join(", ")}`
    : "Sources: official PlayStation trophy list";
  detailContentEl.appendChild(sources);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "detail-toggle";
  toggle.textContent = earned.has(trophy.id) ? "✓ Earned — mark as not earned" : "Mark as earned";
  toggle.addEventListener("click", () => setEarned(trophy.id, !earned.has(trophy.id)));
  detailContentEl.appendChild(toggle);
}

// ---------- Spoiler mode ----------

function setSpoilerMode(on) {
  spoilerMode = on;
  saveSpoilerMode();
  renderTrophies();
  if (selectedId !== null) renderDetail();
}

// ---------- Export / import ----------

function exportProgress() {
  const payload = {
    app: "Leonida Trophy Guide",
    game: "Grand Theft Auto VI",
    platform: "PlayStation 5",
    version: 2,
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = EXPORT_FILENAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  statusEl.textContent = `Exported ${earned.size} earned trophies to ${EXPORT_FILENAME}.`;
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const ids = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(ids)) throw new Error("no earned list");
      const valid = ids.filter(
        (id) => Number.isInteger(id) && trophyById.has(id),
      );
      if (valid.length === 0 && ids.length > 0) throw new Error("no known trophy ids");
      earned = new Set(valid);
      saveEarned();
      renderTrophies();
      if (selectedId !== null) renderDetail();
      statusEl.textContent = `Imported ${valid.length} earned trophies from ${file.name}.`;
    } catch {
      statusEl.textContent =
        `Could not import ${file.name}: it is not a progress file from this guide. Nothing changed.`;
    }
  };
  reader.onerror = () => {
    statusEl.textContent = `Could not read ${file.name}. Nothing changed.`;
  };
  reader.readAsText(file);
}

// ---------- Views and controls ----------

function switchView(view) {
  const showRoadmap = view === "roadmap";
  checklistViewEl.hidden = showRoadmap;
  roadmapViewEl.hidden = !showRoadmap;
  checklistBtn.classList.toggle("active", !showRoadmap);
  roadmapBtn.classList.toggle("active", showRoadmap);
  checklistBtn.setAttribute("aria-pressed", String(!showRoadmap));
  roadmapBtn.setAttribute("aria-pressed", String(showRoadmap));
}

function wireControls() {
  searchEl.addEventListener("input", () => {
    filters.search = searchEl.value.trim();
    applyFilters();
  });
  kindEl.addEventListener("change", () => {
    filters.kind = kindEl.value;
    applyFilters();
  });
  gradeEl.addEventListener("change", () => {
    filters.grade = gradeEl.value;
    applyFilters();
  });
  earnedOnlyEl.addEventListener("change", () => {
    filters.earnedOnly = earnedOnlyEl.checked;
    applyFilters();
  });
  missableOnlyEl.addEventListener("change", () => {
    filters.missableOnly = missableOnlyEl.checked;
    applyFilters();
  });
  spoilerEl.addEventListener("change", () => setSpoilerMode(spoilerEl.checked));
  exportBtn.addEventListener("click", exportProgress);
  importBtn.addEventListener("click", () => importFileEl.click());
  importFileEl.addEventListener("change", () => {
    const file = importFileEl.files && importFileEl.files[0];
    importFileEl.value = "";
    if (file) importProgress(file);
  });
  checklistBtn.addEventListener("click", () => switchView("checklist"));
  roadmapBtn.addEventListener("click", () => switchView("roadmap"));
  detailCloseEl.addEventListener("click", closeDetail);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && selectedId !== null) closeDetail();
  });
}

function renderTrophies() {
  listEl.replaceChildren();
  for (const trophy of trophies) {
    listEl.appendChild(buildTrophyCard(trophy));
  }
  applyFilters();
  updateProgress();
}

async function init() {
  earned = loadEarned();
  spoilerMode = loadSpoilerMode();
  spoilerEl.checked = spoilerMode;
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`trophy data failed to load (${response.status})`);
    const data = await response.json();
    trophies = Array.isArray(data) ? data : data.trophies || [];
    roadmapList = Array.isArray(data) ? [] : data.roadmap || [];
    roadmapByStage = new Map(roadmapList.map((step) => [step.stage, step]));
    trophies.sort((a, b) => a.id - b.id);
    trophyById = new Map(trophies.map((t) => [t.id, t]));
    wireControls();
    renderTrophies();
  } catch (error) {
    statusEl.textContent =
      "The trophy list could not be loaded. Serve the app/ folder with a static server and reload the page.";
    console.error(error);
  }
  window.__shotReady = true;
}

init();
