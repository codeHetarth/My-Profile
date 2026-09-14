const FACES = ["background", "home", "projects", "about"];
const scene = document.getElementById("scene");
const cube = document.getElementById("cube");
const eduDetail = document.getElementById("edu-detail");
const goBtns = [...document.querySelectorAll("[data-go]")];
const navBtns = [...document.querySelectorAll("nav [data-go]")];
const eduBtns = [...document.querySelectorAll("[data-edu]")];
const eduPanels = [...document.querySelectorAll("[data-edu-panel]")];
const eduBack = document.getElementById("edu-back");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DURATION = 1100;
const START = 1;

let index = START;
let rx = START * 90;
let ry = 0;
let eduOpen = false;
let busy = false;
let unlockTimer = 0;
let pendingGo = null;

function setHalf() {
  document.documentElement.style.setProperty("--half", `${scene.clientHeight / 2}px`);
  document.documentElement.style.setProperty("--half-w", `${scene.clientWidth / 2}px`);
}

function unlock() {
  scene.classList.remove("is-turning");
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
    if (face) face.style.pointerEvents = !eduOpen && i === index ? "auto" : "none";
  });
  if (eduDetail) eduDetail.style.pointerEvents = eduOpen ? "auto" : "none";
  if (eduBack) eduBack.classList.toggle("is-visible", eduOpen);
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
  if (busy || eduOpen || index !== 0) return;
  eduPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.eduPanel === id);
  });
  eduOpen = true;
  ry = -90;
  scene.classList.add("is-edu-open");
  turnCube();
}

function closeEdu() {
  if (!eduOpen) return;
  eduOpen = false;
  ry = 0;
  scene.classList.remove("is-edu-open");
  turnCube();
}

function goTo(next) {
  next = (next + FACES.length) % FACES.length;
  if (busy) {
    pendingGo = next;
    return;
  }
  if (eduOpen) {
    pendingGo = next === index ? null : next;
    closeEdu();
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
cube.style.setProperty("--rx", `${rx}deg`);
cube.style.setProperty("--ry", `${ry}deg`);
syncNav();

window.addEventListener("resize", setHalf);
goBtns.forEach((btn) => {
  btn.addEventListener("click", () => goTo(Number(btn.dataset.go)));
});
eduBtns.forEach((btn) => {
  btn.addEventListener("click", () => openEdu(btn.dataset.edu));
});
if (eduBack) eduBack.addEventListener("click", closeEdu);

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
