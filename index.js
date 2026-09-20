const FACES = ["background", "home", "projects", "about"];
const scene = document.getElementById("scene");
const cubeX = document.getElementById("cube-x");
const cube = document.getElementById("cube");
const eduHub = document.getElementById("edu-hub");
const certiHub = document.getElementById("certi-hub");
const eduDetail = document.getElementById("edu-detail");
const certiDetail = document.getElementById("certi-detail");
const projectDetail = document.getElementById("project-detail");
const navBtns = [...document.querySelectorAll("nav [data-go]")];
const eduPanels = [...document.querySelectorAll("[data-edu-panel]")];
const certiPanels = [...document.querySelectorAll("[data-certi-panel]")];
const projectPanels = [...document.querySelectorAll("[data-project-panel]")];
const eduBack = document.getElementById("edu-back");
const video = document.getElementById("world-media");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const phoneMq = window.matchMedia("(max-width: 860px), (pointer: coarse)");
const DURATION = 1100;
const START = 1;
const SIDE_CLASSES = ["is-edu-hub", "is-certi-hub", "is-edu-open", "is-certi-open", "is-project-open"];

let index = START;
let rx = START * 90;
let ry = 0;
let sideOpen = null;
let busy = false;
let unlockTimer = 0;
let pendingGo = null;
let turnSeq = 0;
let unlockedSeq = -1;
let lastRx = rx;
let lastRy = ry;

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

function activeId(panels, key) {
  return panels.find((panel) => panel.classList.contains("is-active"))?.dataset[key] ?? null;
}

function clearSideClasses() {
  scene.classList.remove(...SIDE_CLASSES);
  cube.classList.remove("is-showing-project");
}

function writeHash() {
  let hash = FACES[index];
  if (sideOpen === "edu-hub") hash = "edu";
  if (sideOpen === "certi-hub") hash = "certi";
  if (sideOpen === "edu") hash = activeId(eduPanels, "eduPanel") || hash;
  if (sideOpen === "certi") hash = activeId(certiPanels, "certiPanel") || hash;
  if (sideOpen === "project") hash = activeId(projectPanels, "projectPanel") || hash;
  const next = `#${hash}`;
  if (location.hash !== next) history.replaceState(null, "", next);
}

function parseHash() {
  const raw = (location.hash || "").replace(/^#/, "");
  if (!raw) return { index: START, side: null, id: null };

  if (raw === "edu") return { index: 0, side: "edu-hub", id: null };
  if (raw === "certi") return { index: 0, side: "certi-hub", id: null };

  const edu = eduPanels.find((panel) => panel.dataset.eduPanel === raw);
  if (edu) return { index: 0, side: "edu", id: edu.dataset.eduPanel };

  const certi = certiPanels.find((panel) => panel.dataset.certiPanel === raw);
  if (certi) return { index: 0, side: "certi", id: certi.dataset.certiPanel };

  const project = projectPanels.find((panel) => panel.dataset.projectPanel === raw);
  if (project) return { index: 2, side: "project", id: project.dataset.projectPanel };

  const i = FACES.indexOf(raw);
  if (i >= 0) return { index: i, side: null, id: null };

  return { index: START, side: null, id: null };
}

function applyCube() {
  cubeX.style.setProperty("--rx", `${rx}deg`);
  cube.style.setProperty("--ry", `${ry}deg`);
}

function yFor(side) {
  if (isPhone()) return 0;
  if (side === "edu-hub" || side === "certi-hub") return -90;
  if (side === "edu" || side === "certi") return -180;
  if (side === "project") return 90;
  return 0;
}

function applySide(side, id) {
  sideOpen = side;
  clearSideClasses();
  ry = yFor(side);

  if (side === "edu-hub" || side === "edu") scene.classList.add("is-edu-hub");
  if (side === "certi-hub" || side === "certi") scene.classList.add("is-certi-hub");

  if (side === "edu") {
    eduPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.eduPanel === id);
    });
    scene.classList.add("is-edu-open");
  }

  if (side === "certi") {
    certiPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.certiPanel === id);
    });
    scene.classList.add("is-certi-open");
  }

  if (side === "project") {
    projectPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.projectPanel === id);
    });
    if (!isPhone()) {
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
  applyCube();
  syncNav();
}

function closingSide() {
  return !sideOpen && SIDE_CLASSES.some((name) => scene.classList.contains(name));
}

function snapClosedSide() {
  pauseCubeMotion(clearSideClasses);
}

function finishUnlock() {
  syncNav();
  busy = false;
  if (pendingGo !== null) {
    const next = pendingGo;
    pendingGo = null;
    goTo(next);
  }
}

function unlock(seq = turnSeq) {
  if (seq !== turnSeq || seq === unlockedSeq) return;
  if (scene.dataset.settling === "1") return;

  if (sideOpen === "edu-hub") scene.classList.remove("is-edu-open");
  if (sideOpen === "certi-hub") scene.classList.remove("is-certi-open");

  if (closingSide() && pendingGo !== null) {
    unlockedSeq = seq;
    const next = pendingGo;
    pendingGo = null;
    pauseCubeMotion(clearSideClasses);
    busy = false;
    goTo(next);
    return;
  }

  if (closingSide()) {
    unlockedSeq = seq;
    scene.classList.remove("is-turning");
    scene.dataset.settling = "1";
    window.clearTimeout(unlockTimer);
    unlockTimer = window.setTimeout(() => {
      delete scene.dataset.settling;
      snapClosedSide();
      finishUnlock();
    }, DURATION);
    return;
  }

  unlockedSeq = seq;
  scene.classList.remove("is-turning");
  finishUnlock();
}

function currentFace() {
  if (sideOpen === "edu") return eduDetail;
  if (sideOpen === "certi") return certiDetail;
  if (sideOpen === "edu-hub") return eduHub;
  if (sideOpen === "certi-hub") return certiHub;
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
  eduHub.style.pointerEvents = sideOpen === "edu-hub" ? "auto" : "none";
  certiHub.style.pointerEvents = sideOpen === "certi-hub" ? "auto" : "none";
  eduDetail.style.pointerEvents = sideOpen === "edu" ? "auto" : "none";
  certiDetail.style.pointerEvents = sideOpen === "certi" ? "auto" : "none";
  projectDetail.style.pointerEvents = sideOpen === "project" ? "auto" : "none";
  eduBack.classList.toggle(
    "is-visible",
    Boolean(sideOpen) && !scene.classList.contains("is-turning")
  );
  writeHash();
}

function resetFaceScroll() {
  const scroller = currentFace()?.querySelector(".face-scroll");
  if (scroller) scroller.scrollTop = 0;
}

function turnCube() {
  resetFaceScroll();
  if (isPhone()) ry = 0;
  applyCube();

  if (isPhone() || reduced) {
    scene.classList.remove("is-turning");
    syncNav();
    unlock();
    return;
  }

  const yChanged = ry !== lastRy;
  const xChanged = rx !== lastRx;
  lastRy = ry;
  lastRx = rx;

  busy = true;
  scene.classList.add("is-turning");
  syncNav();
  window.clearTimeout(unlockTimer);
  const seq = ++turnSeq;
  cube._yTurn = yChanged;
  cubeX._xTurn = xChanged;
  unlockTimer = window.setTimeout(() => unlock(seq), DURATION);
}

function pauseCubeMotion(fn) {
  const rig = cubeX.parentElement;
  [cube, cubeX, rig].forEach((el) => {
    if (el) el.style.transition = "none";
  });
  fn();
  cube.offsetHeight;
  [cube, cubeX, rig].forEach((el) => {
    if (el) el.style.transition = "";
  });
}

function turnFrom(fromRy) {
  const targetRy = ry;
  ry = fromRy;
  pauseCubeMotion(applyCube);
  lastRy = fromRy;
  ry = targetRy;
  turnCube();
}

function showSide(side, id, requiredIndex) {
  if (busy || index !== requiredIndex) return;
  if (side === "edu" && sideOpen !== "edu-hub") return;
  if (side === "certi" && sideOpen !== "certi-hub") return;
  if ((side === "edu-hub" || side === "certi-hub") && sideOpen) return;
  if (side === "project" && sideOpen) return;

  const fromRy = ry;
  applySide(side, id);
  if (isPhone() || reduced) {
    resetFaceScroll();
    syncNav();
    return;
  }
  turnFrom(fromRy);
}

function closeSide() {
  if (!sideOpen) return;

  if (sideOpen === "edu" || sideOpen === "certi") {
    const fromRy = ry;
    const hub = sideOpen === "edu" ? "edu-hub" : "certi-hub";
    sideOpen = hub;
    ry = yFor(hub);
    if (isPhone() || reduced) {
      scene.classList.remove("is-edu-open", "is-certi-open");
      resetFaceScroll();
      syncNav();
      if (pendingGo !== null) {
        const next = pendingGo;
        pendingGo = null;
        goTo(next);
      }
      return;
    }
    lastRy = fromRy;
    turnCube();
    return;
  }

  sideOpen = null;
  ry = 0;
  if (isPhone() || reduced) {
    clearSideClasses();
    resetFaceScroll();
    syncNav();
    if (pendingGo !== null) {
      const next = pendingGo;
      pendingGo = null;
      goTo(next);
    }
    return;
  }
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
lastRx = rx;
lastRy = ry;

window.addEventListener("resize", () => {
  syncPhone();
  setHalf();
});
navBtns.forEach((btn) => {
  btn.addEventListener("click", () => goTo(Number(btn.dataset.go)));
});
document.querySelector("[data-edu-hub]")?.addEventListener("click", () => {
  showSide("edu-hub", null, 0);
});
document.querySelector("[data-certi-hub]")?.addEventListener("click", () => {
  showSide("certi-hub", null, 0);
});
document.querySelectorAll("[data-edu]").forEach((btn) => {
  btn.addEventListener("click", () => showSide("edu", btn.dataset.edu, 0));
});
document.querySelectorAll("[data-certi]").forEach((btn) => {
  btn.addEventListener("click", () => showSide("certi", btn.dataset.certi, 0));
});
document.querySelectorAll("[data-project]").forEach((btn) => {
  btn.addEventListener("click", () => showSide("project", btn.dataset.project, 2));
});
eduBack.addEventListener("click", closeSide);

cube.addEventListener("transitionend", (event) => {
  if (event.propertyName !== "transform" || event.target !== cube || !cube._yTurn) return;
  unlock(turnSeq);
});
cubeX.addEventListener("transitionend", (event) => {
  if (event.propertyName !== "transform" || event.target !== cubeX || !cubeX._xTurn) return;
  unlock(turnSeq);
});

video.src = isPhone()
  ? "https://videos.pexels.com/video-files/2169880/2169880-hd_1280_720_30fps.mp4"
  : "https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_30fps.mp4";
video.addEventListener("playing", () => video.classList.add("is-on"));
video.addEventListener("error", () => video.classList.remove("is-on"));
video.play()?.catch(() => {});
