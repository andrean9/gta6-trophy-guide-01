// Leonida Trophy Guide — checklist + tracker.
// Vanilla ES module. Loads the trophy data from a file under app/,
// renders all 55 trophies, and saves earned progress in localStorage.
// No network request leaves the app: the only fetch is a relative
// path to the bundled data file. Sets window.__shotReady once the
// list has rendered (or an error state has rendered instead).

const DATA_URL = "data/trophies.json";
const STORAGE_KEY = "leonida-trophy-guide-earned-v2";

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
let roadmapByStage = new Map();
let earned = new Set();

const listEl = document.getElementById("trophy-list");
const statusEl = document.getElementById("status-note");
const countEl = document.getElementById("progress-count");
const gradesEl = document.getElementById("progress-grades");
const fillEl = document.getElementById("progress-fill");
const barEl = document.getElementById("progress-bar");

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

function updateProgress() {
  const total = trophies.length;
  const done = earned.size;
  countEl.textContent = `${done} / ${total} earned`;
  fillEl.style.width = total === 0 ? "0%" : `${(done / total) * 100}%`;
  barEl.setAttribute("aria-valuenow", String(done));
  barEl.setAttribute("aria-valuemax", String(total));
  const parts = GRADE_ORDER.map((grade) => {
    const inGrade = trophies.filter((t) => t.grade === grade);
    const got = inGrade.filter((t) => earned.has(t.id)).length;
    return `${GRADE_LABEL[grade]} ${got}/${inGrade.length}`;
  });
  gradesEl.textContent = parts.join(" · ");
}

function makeChip(text, extraClass) {
  const chip = document.createElement("span");
  chip.className = extraClass ? `chip ${extraClass}` : "chip";
  chip.textContent = text;
  return chip;
}

function buildTrophyCard(trophy) {
  const item = document.createElement("li");
  item.className = "trophy";
  item.dataset.id = String(trophy.id);
  item.dataset.grade = trophy.grade;
  item.dataset.kind = trophy.kind || "misc";
  item.dataset.stage = String(trophy.stage || "");
  if (earned.has(trophy.id)) item.classList.add("earned");

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "trophy-check";
  check.checked = earned.has(trophy.id);
  check.setAttribute("aria-label", `Mark ${trophy.name} as earned`);
  check.addEventListener("change", () => {
    if (check.checked) {
      earned.add(trophy.id);
      item.classList.add("earned");
    } else {
      earned.delete(trophy.id);
      item.classList.remove("earned");
    }
    refreshEarnedTag(item, trophy);
    saveEarned();
    updateProgress();
  });
  item.appendChild(check);

  const body = document.createElement("div");
  body.className = "trophy-body";

  const head = document.createElement("div");
  head.className = "trophy-head";
  const name = document.createElement("h2");
  name.className = "trophy-name";
  name.textContent = trophy.name;
  head.appendChild(name);
  const grade = document.createElement("span");
  grade.className = `grade grade-${trophy.grade}`;
  grade.textContent = GRADE_LABEL[trophy.grade] || trophy.grade;
  head.appendChild(grade);
  body.appendChild(head);

  const desc = document.createElement("p");
  desc.className = "trophy-desc";
  desc.textContent = trophy.description;
  body.appendChild(desc);

  const guide = document.createElement("p");
  guide.className = "trophy-guide";
  guide.textContent = trophy.guide;
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
  return item;
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

function renderTrophies() {
  listEl.replaceChildren();
  for (const trophy of trophies) {
    listEl.appendChild(buildTrophyCard(trophy));
  }
  statusEl.textContent =
    `Showing all ${trophies.length} trophies. Tick a box when you earn one; your progress is saved in this browser.`;
  updateProgress();
}

async function init() {
  earned = loadEarned();
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`trophy data failed to load (${response.status})`);
    const data = await response.json();
    trophies = Array.isArray(data) ? data : data.trophies || [];
    const roadmap = Array.isArray(data) ? [] : data.roadmap || [];
    roadmapByStage = new Map(roadmap.map((step) => [step.stage, step]));
    trophies.sort((a, b) => a.id - b.id);
    renderTrophies();
  } catch (error) {
    statusEl.textContent =
      "The trophy list could not be loaded. Serve the app/ folder with a static server and reload the page.";
    console.error(error);
  }
  window.__shotReady = true;
}

init();
