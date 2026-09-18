const FACES = ["background", "home", "projects", "about"];
const scene = document.getElementById("scene");
const cube = document.getElementById("cube");
const eduDetail = document.getElementById("edu-detail");
const projectDetail = document.getElementById("project-detail");
const navBtns = [...document.querySelectorAll("nav [data-go]")];
const eduBtns = [...document.querySelectorAll("[data-edu]")];
const eduPanels = [...document.querySelectorAll("[data-edu-panel]")];
const projectBtns = [...document.querySelectorAll("[data-project]")];
const projectPanels = [...document.querySelectorAll("[data-project-panel]")];
const eduBack = document.getElementById("edu-back");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const phoneMq = window.matchMedia("(max-width: 860px), (pointer: coarse)");
const DURATION = 1100;
const START = 1;

let index = START;
let rx = START * 90;
let ry = 0;
let sideOpen = null;
let busy = false;
let unlockTimer = 0;
let pendingGo = null;

function isPhone() {
  return phoneMq.matches;
}

function syncPhone() {
  document.documentElement.classList.toggle("is-phone", isPhone());
}

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
    if (!isPhone()) {
      ry = -90;
      scene.classList.add("is-edu-open");
    }
  }

  if (side === "project") {
    projectPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.projectPanel === id);
    });
    if (!isPhone()) {
      ry = 90;
      cube.classList.add("is-showing-project");
      scene.classList.add("is-project-open");
    }
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
  syncNav();
  busy = false;
  if (pendingGo !== null) {
    const next = pendingGo;
    pendingGo = null;
    goTo(next);
  }
}

function currentFace() {
  if (sideOpen === "edu") return eduDetail;
  if (sideOpen === "project") return projectDetail;
  return document.getElementById(FACES[index]);
}

function syncNav() {
  navBtns.forEach((btn) => {
    btn.classList.toggle("is-active", Number(btn.dataset.go) === index);
  });
  document.querySelectorAll(".face").forEach((face) => {
    face.classList.toggle("is-current", face === currentFace());
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

function resetFaceScroll() {
  const scroller = currentFace()?.querySelector(".face-scroll");
  if (scroller) scroller.scrollTop = 0;
}

function turnCube() {
  resetFaceScroll();
  if (isPhone()) ry = 0;
  cube.style.setProperty("--rx", `${rx}deg`);
  cube.style.setProperty("--ry", `${ry}deg`);

  if (isPhone() || reduced) {
    scene.classList.remove("is-turning");
    syncNav();
    unlock();
    return;
  }

  busy = true;
  scene.classList.add("is-turning");
  syncNav();
  window.clearTimeout(unlockTimer);
  unlockTimer = window.setTimeout(unlock, DURATION);
}

function pauseCubeMotion(fn) {
  const rig = cube.parentElement;
  cube.style.transition = "none";
  if (rig) rig.style.transition = "none";
  fn();
  cube.offsetHeight;
  cube.style.transition = "";
  if (rig) rig.style.transition = "";
}

function openSheet() {
  resetFaceScroll();
  syncNav();
}

function closeSheet() {
  scene.classList.remove("is-edu-open", "is-project-open");
  cube.classList.remove("is-showing-project");
  cube.style.setProperty("--ry", "0deg");
  resetFaceScroll();
  syncNav();
}

function openEdu(id) {
  if (busy || sideOpen || index !== 0) return;
  eduPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.eduPanel === id);
  });
  sideOpen = "edu";
  if (isPhone()) {
    openSheet();
    return;
  }
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
  if (isPhone()) {
    openSheet();
    return;
  }
  ry = 90;
  cube.classList.add("is-showing-project");
  scene.classList.add("is-project-open");
  turnCube();
}

function closeSide() {
  if (!sideOpen) return;
  sideOpen = null;
  ry = 0;
  if (isPhone()) {
    closeSheet();
    if (pendingGo !== null) {
      const next = pendingGo;
      pendingGo = null;
      goTo(next);
    }
    return;
  }
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

syncPhone();
if (typeof phoneMq.addEventListener === "function") {
  phoneMq.addEventListener("change", () => {
    syncPhone();
    setHalf();
    syncNav();
  });
}
setHalf();
pauseCubeMotion(snapToHash);

window.addEventListener("resize", () => {
  syncPhone();
  setHalf();
});
navBtns.forEach((btn) => {
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

const video = document.getElementById("world-media");
if (video) {
  const phone = window.matchMedia("(max-width: 860px), (pointer: coarse)").matches;
  video.muted = true;
  video.playsInline = true;
  video.src = phone
    ? "https://videos.pexels.com/video-files/2169880/2169880-hd_1280_720_30fps.mp4"
    : "https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_30fps.mp4";
  video.addEventListener("playing", () => video.classList.add("is-on"));
  video.addEventListener("error", () => video.classList.remove("is-on"));
  const play = video.play();
  if (play && typeof play.catch === "function") play.catch(() => {});
}
