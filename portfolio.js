const FACES = ["background", "home", "projects", "about"];
const scene = document.getElementById("scene");
const cube = document.getElementById("cube");
const eduDetail = document.getElementById("edu-detail");
const projectDetail = document.getElementById("project-detail");
const goBtns = [...document.querySelectorAll("[data-go]")];
const navBtns = [...document.querySelectorAll("nav [data-go]")];
const eduBtns = [...document.querySelectorAll("[data-edu]")];
const eduPanels = [...document.querySelectorAll("[data-edu-panel]")];
const projectBtns = [...document.querySelectorAll("[data-project]")];
const projectPanels = [...document.querySelectorAll("[data-project-panel]")];
const eduBack = document.getElementById("edu-back");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DURATION = 1100;
const START = 1;

let index = START;
let rx = START * 90;
let ry = 0;
let sideOpen = null;
let busy = false;
let unlockTimer = 0;
let pendingGo = null;

function setHalf() {
  document.documentElement.style.setProperty("--half", `${scene.clientHeight / 2}px`);
  document.documentElement.style.setProperty("--half-w", `${scene.clientWidth / 2}px`);
}

function activePanel(panels, key) {
  return panels.find((panel) => panel.classList.contains("is-active"))?.[key] ?? null;
}

function writeHash() {
  let hash = FACES[index];
  if (sideOpen === "edu") hash = activePanel(eduPanels, "dataset")?.eduPanel || hash;
  if (sideOpen === "project") hash = activePanel(projectPanels, "dataset")?.projectPanel || hash;
  const next = `#${hash}`;
  if (location.hash !== next) history.replaceState(null, "", next);
}

function parseHash() {
  const raw = (location.hash || "").replace(/^#/, "");
  if (!raw) return { index: START, side: null, id: null };

  const edu = eduPanels.find((panel) => panel.dataset.eduPanel === raw);
  if (edu) return { index: 0, side: "edu", id: edu.dataset.eduPanel };

  const project = projectPanels.find((panel) => panel.dataset.projectPanel === raw);
  if (project) return { index: 2, side: "project", id: project.dataset.projectPanel };

  const i = FACES.indexOf(raw);
  if (i >= 0) return { index: i, side: null, id: null };

  return { index: START, side: null, id: null };
}

function applySide(side, id) {
  sideOpen = side;
  ry = 0;
  scene.classList.remove("is-edu-open", "is-project-open");
  cube.classList.remove("is-showing-project");

  if (side === "edu") {
    eduPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.eduPanel === id);
    });
    ry = -90;
    scene.classList.add("is-edu-open");
  }

  if (side === "project") {
    projectPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.projectPanel === id);
    });
    ry = 90;
    cube.classList.add("is-showing-project");
    scene.classList.add("is-project-open");
  }
}

function snapToHash() {
  const state = parseHash();
  index = state.index;
  rx = index * 90;
  applySide(state.side, state.id);
  cube.style.setProperty("--rx", `${rx}deg`);
  cube.style.setProperty("--ry", `${ry}deg`);
  syncNav();
}

function unlock() {
  scene.classList.remove("is-turning");
  if (!sideOpen) cube.classList.remove("is-showing-project");
  busy = false;
  if (pendingGo !== null) {
    const next = pendingGo;
    pendingGo = null;
    goTo(next);
  }
}

function syncNav() {
  navBtns.forEach((btn) => {
    btn.classList.toggle("is-active", Number(btn.dataset.go) === index);
  });
  FACES.forEach((id, i) => {
    const face = document.getElementById(id);
    if (face) face.style.pointerEvents = !sideOpen && i === index ? "auto" : "none";
  });
  if (eduDetail) eduDetail.style.pointerEvents = sideOpen === "edu" ? "auto" : "none";
  if (projectDetail) projectDetail.style.pointerEvents = sideOpen === "project" ? "auto" : "none";
  if (eduBack) eduBack.classList.toggle("is-visible", Boolean(sideOpen));
  writeHash();
}

function turnCube() {
  busy = true;
  cube.style.setProperty("--rx", `${rx}deg`);
  cube.style.setProperty("--ry", `${ry}deg`);
  if (!reduced) scene.classList.add("is-turning");
  syncNav();
  window.clearTimeout(unlockTimer);
  unlockTimer = window.setTimeout(unlock, reduced ? 0 : DURATION);
}

function openEdu(id) {
  if (busy || sideOpen || index !== 0) return;
  eduPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.eduPanel === id);
  });
  sideOpen = "edu";
  ry = -90;
  scene.classList.add("is-edu-open");
  turnCube();
}

function openProject(id) {
  if (busy || sideOpen || index !== 2) return;
  projectPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.projectPanel === id);
  });
  sideOpen = "project";
  ry = 90;
  cube.classList.add("is-showing-project");
  scene.classList.add("is-project-open");
  turnCube();
}

function closeSide() {
  if (!sideOpen) return;
  sideOpen = null;
  ry = 0;
  scene.classList.remove("is-edu-open", "is-project-open");
  turnCube();
}

function goTo(next) {
  next = (next + FACES.length) % FACES.length;
  if (busy) {
    pendingGo = next;
    return;
  }
  if (sideOpen) {
    pendingGo = next === index ? null : next;
    closeSide();
    return;
  }
  if (next === index) return;

  let diff = next - index;
  if (diff > 2) diff -= FACES.length;
  if (diff < -2) diff += FACES.length;

  index = next;
  rx += diff * 90;
  turnCube();
}

setHalf();
const rig = cube.parentElement;
cube.style.transition = "none";
if (rig) rig.style.transition = "none";
snapToHash();
cube.offsetHeight;
cube.style.transition = "";
if (rig) rig.style.transition = "";

window.addEventListener("resize", setHalf);
goBtns.forEach((btn) => {
  btn.addEventListener("click", () => goTo(Number(btn.dataset.go)));
});
eduBtns.forEach((btn) => {
  btn.addEventListener("click", () => openEdu(btn.dataset.edu));
});
projectBtns.forEach((btn) => {
  btn.addEventListener("click", () => openProject(btn.dataset.project));
});
if (eduBack) eduBack.addEventListener("click", closeSide);

cube.addEventListener("transitionend", (event) => {
  if (event.propertyName !== "transform" || event.target !== cube) return;
  unlock();
});

const videoBg = document.getElementById("world-video");
const video = document.getElementById("world-media");
const FADE_MS = 400;

let fadeRaf = 0;
let opacity = 0;

function setOpacity(value) {
  opacity = Math.max(0, Math.min(1, value));
  if (video) video.style.opacity = String(opacity);
}

function fadeIn() {
  if (fadeRaf) cancelAnimationFrame(fadeRaf);
  const from = opacity;
  const start = performance.now();

  const tick = (now) => {
    const t = Math.min(1, (now - start) / FADE_MS);
    setOpacity(from + (1 - from) * t);
    if (t < 1) fadeRaf = requestAnimationFrame(tick);
    else fadeRaf = 0;
  };

  fadeRaf = requestAnimationFrame(tick);
}

if (video) {
  setOpacity(0);

  const startPlayback = () => {
    const play = video.play();
    if (play && typeof play.catch === "function") play.catch(() => {});
  };

  video.addEventListener("loadeddata", () => {
    startPlayback();
    fadeIn();
  });

  video.addEventListener("playing", () => {
    if (opacity < 1) fadeIn();
  });

  startPlayback();
}

if (videoBg && window.gsap && !reduced) {
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;

  window.addEventListener("mousemove", (event) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    targetX = ((event.clientX - cx) / cx) * 20;
    targetY = ((event.clientY - cy) / cy) * 20;
  });

  (function tick() {
    currentX += (targetX - currentX) * 0.06;
    currentY += (targetY - currentY) * 0.06;
    gsap.set(videoBg, { x: currentX, y: currentY });
    requestAnimationFrame(tick);
  })();
}
