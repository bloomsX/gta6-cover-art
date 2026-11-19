// Vice Cover Studio — wires the editor: photos, panel layout, crop, caption,
// colour grade and PNG export. The cover itself is painted by cover.js; this
// file only moves the state around and talks to the page. Photos are read on
// the user's own machine and never uploaded anywhere.
import { drawCover, freshPanels, LAYOUTS, GRADES, TITLE_STYLES, EXPORT_SIZES } from './cover.js';
import { runShot } from './shots.js';

/** The four sample photos shipped with the app (AI-made, free to use). */
const SAMPLES = [
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
  { name: 'Neon Night', src: 'samples/neon.jpg' },
  { name: 'Rooftop', src: 'samples/rooftop.jpg' },
];

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const state = {
  layout: 'keyart',
  grade: 'sunset',
  size: 'square',
  title: 'Sunset Heist',
  subtitle: 'Boulevard Nights',
  titleStyle: 'sunset',
  titleScale: 1,
  photos: [],
  panels: [],
  selectedPanel: 0,
};
let nextPhotoId = 1;
let fontsReady = false;

// ------------------------------------------------------------ image load ----

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds an image to the photo library and returns its library entry. */
async function addPhoto(name, url) {
  const img = await loadImage(url);
  const photo = { id: nextPhotoId++, name, img, url };
  state.photos.push(photo);
  return photo;
}

/** Loads the four samples, then fills every panel with the first photo. */
async function loadSamples() {
  for (const s of SAMPLES) {
    try { await addPhoto(s.name, s.src); } catch { /* a missing sample is skipped */ }
  }
  state.panels = freshPanels(state.layout, state.photos);
  renderLibrary();
  renderPanels();
  redraw();
}

// ---------------------------------------------------------------- redraw ----

/** Repaints the preview canvas from the current state. */
function redraw() {
  drawCover(canvas, state);
  renderPanels();
  document.querySelectorAll('.steps li').forEach((li, i) => {
    li.classList.toggle('done', i === 0 || state.photos.length > 0);
  });
}

/** Sizes the preview canvas to the chosen export aspect and repaints. */
function applySize() {
  const size = EXPORT_SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  redraw();
}

// ------------------------------------------------------------------ UI ----

/** The sample strip: tap a sample to add it to the library. */
function renderSamples() {
  const box = $('samples');
  box.innerHTML = '';
  for (const s of SAMPLES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = `Use sample: ${s.name}`;
    b.innerHTML = `<img src="${s.src}" alt="${s.name} sample photo">`;
    b.addEventListener('click', async () => {
      const photo = await addPhoto(s.name, s.src);
      if (!state.panels.some((p) => p.photo)) state.panels = freshPanels(state.layout, state.photos);
      renderLibrary();
      redraw();
      setStatus(`${s.name} added — tap it in Your photos to place it.`);
    });
    box.appendChild(b);
  }
}

/** The library strip: tap a photo to put it in the selected panel. */
function renderLibrary() {
  const box = $('library');
  box.innerHTML = '';
  if (!state.photos.length) {
    box.innerHTML = '<p class="empty">No photos yet — tap a sample above or add your own.</p>';
    return;
  }
  for (const photo of state.photos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = `Place ${photo.name} in the selected panel`;
    b.dataset.photoId = photo.id;
    const assigned = state.panels.some((p) => p.photo === photo);
    b.classList.toggle('selected', assigned && state.panels[state.selectedPanel]?.photo === photo);
    b.innerHTML = `<img src="${photo.url}" alt="${photo.name}">`;
    if (state.photos.length > SAMPLES.length) {
      const rm = document.createElement('span');
      rm.className = 'rm';
      rm.textContent = '×';
      rm.title = 'Remove this photo';
      rm.addEventListener('click', (e) => {
        e.stopPropagation();
        removePhoto(photo.id);
      });
      b.appendChild(rm);
    }
    b.addEventListener('click', () => {
      assignPhotoToSelected(photo);
    });
    box.appendChild(b);
  }
}

/** Removes a photo from the library and clears any panel that used it. */
function removePhoto(id) {
  state.photos = state.photos.filter((p) => p.id !== id);
  for (const panel of state.panels) {
    if (panel.photo && panel.photo.id === id) {
      panel.photo = state.photos[0] || null;
      panel.zoom = 1; panel.ox = 0; panel.oy = 0;
    }
  }
  renderLibrary();
  redraw();
}

/** Puts `photo` into the selected panel, keeping a sensible crop. */
function assignPhotoToSelected(photo) {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.photo = photo;
  panel.zoom = 1; panel.ox = 0; panel.oy = 0;
  renderLibrary();
  redraw();
}

/** The panel slots: tap one to select it, then tap a photo to fill it. */
function renderPanels() {
  const box = $('panels');
  const layout = LAYOUTS[state.layout];
  box.innerHTML = '';
  layout.panels.forEach((_, i) => {
    const panel = state.panels[i];
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-checked', String(i === state.selectedPanel));
    const thumb = panel && panel.photo
      ? `<img class="thumb" src="${panel.photo.url}" alt="">`
      : '<span class="thumb" aria-hidden="true"></span>';
    b.innerHTML = `${thumb}<span>Panel ${i + 1}${panel && panel.photo ? ' · ' + panel.photo.name : ' · empty'}</span>`;
    b.addEventListener('click', () => {
      state.selectedPanel = i;
      syncPanelTools();
      redraw();
    });
    box.appendChild(b);
  });
  syncPanelTools();
}

/** Keeps the zoom slider in step with the selected panel. */
function syncPanelTools() {
  const panel = state.panels[state.selectedPanel];
  $('zoom').value = panel ? panel.zoom : 1;
}

/** Paints a layout's panels into a thumbnail canvas. */
function paintLayoutThumb(thumb, layoutKey) {
  const ctx = thumb.getContext('2d');
  const w = thumb.width, h = thumb.height;
  ctx.fillStyle = '#0e0618';
  ctx.fillRect(0, 0, w, h);
  for (const poly of LAYOUTS[layoutKey].panels) {
    ctx.beginPath();
    poly.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px * w, py * h);
      else ctx.lineTo(px * w, py * h);
    });
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#ff9a3d');
    g.addColorStop(1, '#ff5e8a');
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.fillStyle = '#3d1150';
  ctx.fillRect(0, 0.78 * h, w, 0.22 * h);
}

/** The layout picker, with a live miniature of each layout. */
function renderLayouts() {
  const box = $('layouts');
  box.innerHTML = '';
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.layout === key));
    b.title = layout.blurb;
    const thumb = document.createElement('canvas');
    thumb.width = 104; thumb.height = 80;
    paintLayoutThumb(thumb, key);
    b.appendChild(thumb);
    b.appendChild(document.createTextNode(layout.name));
    b.addEventListener('click', () => {
      state.layout = key;
      const photos = state.photos;
      const old = state.panels;
      state.panels = freshPanels(key, photos);
      // Carry each panel's photo across where the new layout has a slot.
      old.forEach((p, i) => {
        if (state.panels[i] && p.photo) state.panels[i].photo = p.photo;
      });
      state.selectedPanel = 0;
      renderLayouts();
      redraw();
    });
    box.appendChild(b);
  }
}

/** The grade picker: one swatch per colour grade. */
function renderGrades() {
  const box = $('grades');
  box.innerHTML = '';
  for (const [key, grade] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.grade === key));
    b.className = `grade-${key}`;
    b.title = grade.blurb;
    b.innerHTML = `<span>${grade.name}</span>`;
    b.addEventListener('click', () => {
      state.grade = key;
      renderGrades();
      redraw();
    });
    box.appendChild(b);
  }
}

/** The title colour picker. */
function renderTitleStyles() {
  const box = $('titleStyles');
  box.innerHTML = '';
  for (const [key, style] of Object.entries(TITLE_STYLES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.titleStyle === key));
    b.dataset.style = key;
    b.textContent = style.name;
    b.addEventListener('click', () => {
      state.titleStyle = key;
      renderTitleStyles();
      redraw();
    });
    box.appendChild(b);
  }
}

/** The export-size picker. */
function renderSizes() {
  const box = $('sizes');
  box.innerHTML = '';
  for (const [key, size] of Object.entries(EXPORT_SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.size === key));
    b.textContent = size.label;
    b.title = size.name;
    b.addEventListener('click', () => {
      state.size = key;
      renderSizes();
      applySize();
    });
    box.appendChild(b);
  }
}

function setStatus(text) {
  $('status').textContent = text;
}

// ------------------------------------------------------- crop interaction ----

/** Ray-casting point-in-polygon test, in unit coordinates. */
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

/** Which panel (if any) the pointer sits in, in canvas pixel coordinates. */
function panelAt(px, py) {
  const layout = LAYOUTS[state.layout];
  const x = px / canvas.width, y = py / canvas.height;
  if (y >= 0.78) return -1;
  for (let i = 0; i < layout.panels.length; i++) {
    if (pointInPoly(x, y, layout.panels[i])) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const panelIndex = panelAt(px, py);
  if (panelIndex < 0) return;
  state.selectedPanel = panelIndex;
  syncPanelTools();
  redraw();
  drag = { x: e.clientX, y: e.clientY, panel: state.panels[panelIndex] };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || !drag.panel.photo) return;
  const rect = canvas.getBoundingClientRect();
  const dx = ((e.clientX - drag.x) / rect.width) * canvas.width;
  const dy = ((e.clientY - drag.y) / rect.height) * canvas.height;
  const panel = drag.panel;
  // Dragging moves the photo the other way, like sliding a print in a frame.
  panel.ox = Math.max(-1, Math.min(1, panel.ox + (dx / canvas.width) * 2));
  panel.oy = Math.max(-1, Math.min(1, panel.oy + (dy / canvas.height) * 2));
  drag.x = e.clientX; drag.y = e.clientY;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selectedPanel];
  if (!panel || !panel.photo) return;
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  syncPanelTools();
  redraw();
}, { passive: false });

// ------------------------------------------------------------- export ----

/** Renders the cover at an export size and returns its PNG blob. */
export function exportCover(sizeKey) {
  const size = EXPORT_SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state);
  return new Promise((resolve) => off.toBlob(resolve, 'image/png'));
}

/** Downloads a blob as a file. */
function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

$('export').addEventListener('click', async () => {
  const blob = await exportCover(state.size);
  downloadBlob(blob, `vice-cover-${state.size}-${EXPORT_SIZES[state.size].w}x${EXPORT_SIZES[state.size].h}.png`);
  setStatus(`Saved vice-cover-${EXPORT_SIZES[state.size].label.replace(' × ', 'x')}.png`);
});

$('exportAll').addEventListener('click', async () => {
  for (const key of Object.keys(EXPORT_SIZES)) {
    const blob = await exportCover(key);
    downloadBlob(blob, `vice-cover-${key}-${EXPORT_SIZES[key].w}x${EXPORT_SIZES[key].h}.png`);
  }
  setStatus('Saved all 3 sizes — square, portrait and wide.');
});

$('shuffle').addEventListener('click', () => {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  state.panels = freshPanels(state.layout, state.photos);
  state.panels.forEach((panel) => {
    panel.photo = state.photos[Math.floor(Math.random() * state.photos.length)] || null;
    panel.zoom = 1 + Math.random() * 0.4;
    panel.ox = (Math.random() - 0.5) * 0.8;
    panel.oy = (Math.random() - 0.5) * 0.8;
  });
  state.selectedPanel = 0;
  renderLayouts();
  renderGrades();
  redraw();
  setStatus('Shuffled — a new layout, grade and photo mix.');
});

// ------------------------------------------------------------- controls ----

$('upload').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const url = URL.createObjectURL(file);
    await addPhoto(file.name.replace(/\.[^.]+$/, ''), url);
  }
  if (!state.panels.some((p) => p.photo)) state.panels = freshPanels(state.layout, state.photos);
  renderLibrary();
  redraw();
  setStatus(`${e.target.files.length} photo(s) added.`);
  e.target.value = '';
});

$('zoom').addEventListener('input', (e) => {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.zoom = Number(e.target.value);
  redraw();
});
$('fit').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.zoom = 1; panel.ox = 0; panel.oy = 0;
  syncPanelTools();
  redraw();
});
$('flip').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel) return;
  panel.flip = !panel.flip;
  redraw();
});
$('fillAll').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  if (!panel || !panel.photo) {
    setStatus('Pick a photo for the selected panel first.');
    return;
  }
  for (const p of state.panels) {
    p.photo = panel.photo;
    p.zoom = 1; p.ox = 0; p.oy = 0;
  }
  redraw();
  setStatus('One photo now fills every panel — drag each panel to crop it differently.');
});
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('titleScale').addEventListener('input', (e) => { state.titleScale = Number(e.target.value); redraw(); });

// ------------------------------------------------------------------ boot ----

/** Waits for the display fonts, then paints the first preview. */
async function boot() {
  renderSamples();
  renderLayouts();
  renderGrades();
  renderTitleStyles();
  renderSizes();
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('40px Anton'),
        document.fonts.load('600 20px Oswald'),
      ]),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
    fontsReady = true;
  } catch { /* fall back to system fonts */ }
  await loadSamples();
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    await runShot(query.get('shot'), query, applyShotScene);
  } else {
    redraw();
  }
}

/** Applies a fixed screenshot scene (photo + caption + layout + grade). */
async function applyShotScene(scene) {
  if (scene.layout) state.layout = scene.layout;
  if (scene.grade) state.grade = scene.grade;
  if (scene.size) { state.size = scene.size; applySize(); }
  if (scene.title) { state.title = scene.title; $('title').value = scene.title; }
  if (scene.subtitle) { state.subtitle = scene.subtitle; $('subtitle').value = scene.subtitle; }
  if (scene.photos) {
    state.panels = freshPanels(state.layout, state.photos);
    // Match by slug: "neon" finds "Neon Night", "boulevard" finds "Boulevard".
    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    scene.photos.forEach((name, i) => {
      const photo = state.photos.find((p) => slug(p.name).startsWith(slug(name)) || slug(name).startsWith(slug(p.name)));
      if (photo && state.panels[i]) {
        state.panels[i].photo = photo;
        state.panels[i].zoom = scene.zooms?.[i] ?? 1;
        state.panels[i].ox = scene.oxs?.[i] ?? 0;
        state.panels[i].oy = scene.oys?.[i] ?? -0.25;
      }
    });
  }
  renderLayouts();
  renderGrades();
  renderTitleStyles();
  renderSizes();
  redraw();
}

// For the screenshot runner: export a cover on demand and report readiness.
window.__exportCover = exportCover;
window.__state = state;

boot();
