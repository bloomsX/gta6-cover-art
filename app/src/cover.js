// Vice Cover Studio — the cover renderer.
//
// drawCover(canvas, state) paints one GTA-style multi-panel poster: a mosaic of
// photo panels cut on a slant, a Vice sunset or neon colour grade over the whole
// picture, film grain, and a huge bold caption in the title band along the foot.
// Everything is drawn with the canvas 2D API, so the same code paints the live
// preview and the exported PNG at full size. No network, no Rockstar assets:
// the lettering is Anton + Oswald, both shipped under app/fonts/ (SIL OFL).
//
// A panel is a polygon in unit coordinates (0..1 across the canvas). The title
// band is the strip along the foot (y from TITLE_TOP to 1) that every layout
// reserves for the caption.

export const TITLE_TOP = 0.78;

/** The four panel layouts. Each panel is a polygon of [x, y] unit corners. */
export const LAYOUTS = {
  keyart: {
    name: 'Key Art',
    blurb: 'Hero panel left, two stacked panels right, slanted cut',
    panels: [
      [[0, 0], [0.615, 0], [0.575, TITLE_TOP], [0, TITLE_TOP]],
      [[0.635, 0], [1, 0], [1, 0.375], [0.595, 0.375]],
      [[0.592, 0.395], [1, 0.395], [1, TITLE_TOP], [0.572, TITLE_TOP]],
    ],
  },
  grid: {
    name: 'Comic Grid',
    blurb: 'Four equal panels, two by two',
    panels: [
      [[0, 0], [0.495, 0], [0.495, 0.385], [0, 0.385]],
      [[0.505, 0], [1, 0], [1, 0.385], [0.505, 0.385]],
      [[0, 0.395], [0.495, 0.395], [0.495, TITLE_TOP], [0, TITLE_TOP]],
      [[0.505, 0.395], [1, 0.395], [1, TITLE_TOP], [0.505, TITLE_TOP]],
    ],
  },
  split: {
    name: 'Sunset Split',
    blurb: 'One wide hero panel over two small ones',
    panels: [
      [[0, 0], [1, 0], [1, 0.52], [0, 0.52]],
      [[0, 0.535], [0.495, 0.535], [0.495, TITLE_TOP], [0, TITLE_TOP]],
      [[0.505, 0.535], [1, 0.535], [1, TITLE_TOP], [0.505, TITLE_TOP]],
    ],
  },
  strip: {
    name: 'Neon Strip',
    blurb: 'Three tall panels side by side',
    panels: [
      [[0, 0], [0.328, 0], [0.328, TITLE_TOP], [0, TITLE_TOP]],
      [[0.338, 0], [0.662, 0], [0.662, TITLE_TOP], [0.338, TITLE_TOP]],
      [[0.672, 0], [1, 0], [1, TITLE_TOP], [0.672, TITLE_TOP]],
    ],
  },
};

/** The colour grades. Each tints the photos and the whole picture. */
export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    blurb: 'Warm orange into magenta, golden hour',
    saturate: 1.28, contrast: 1.06, brightness: 1.0,
    overlay: [[0, 'rgba(255,170,60,0.10)'], [0.55, 'rgba(255,110,80,0.10)'], [1, 'rgba(220,40,130,0.28)']],
    vignette: 0.34,
  },
  neon: {
    name: 'Neon Nights',
    blurb: 'Purple shadows, cyan glow, after dark',
    saturate: 1.32, contrast: 1.08, brightness: 0.97,
    overlay: [[0, 'rgba(90,30,160,0.30)'], [0.5, 'rgba(160,40,180,0.14)'], [1, 'rgba(40,200,220,0.20)']],
    vignette: 0.42,
  },
  gold: {
    name: 'Golden Hour',
    blurb: 'Amber warmth, soft and bright',
    saturate: 1.18, contrast: 1.03, brightness: 1.04,
    overlay: [[0, 'rgba(255,200,90,0.12)'], [1, 'rgba(255,140,40,0.22)']],
    vignette: 0.26,
  },
  noir: {
    name: 'Noir',
    blurb: 'High-contrast black and white, magenta kiss',
    saturate: 0, contrast: 1.18, brightness: 1.0,
    overlay: [[0, 'rgba(255,255,255,0.04)'], [1, 'rgba(200,40,120,0.10)']],
    vignette: 0.40,
  },
};

/** The title fills: a vertical gradient painted across the caption letters. */
export const TITLE_STYLES = {
  sunset: { name: 'Sunset', stops: [[0, '#ffffff'], [0.55, '#ffd166'], [1, '#ff5e8a']] },
  white: { name: 'White', stops: [[0, '#ffffff'], [1, '#f2e9ff']] },
  neon: { name: 'Neon', stops: [[0, '#b8fff4'], [0.5, '#ff7ad9'], [1, '#7df9ff']] },
};

/** The three export sizes the bounty asks for. */
export const EXPORT_SIZES = {
  square: { name: 'Square post', w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { name: 'Portrait post', w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { name: 'Wide post', w: 1920, h: 1080, label: '1920 × 1080' },
};

// ---------------------------------------------------------------- grain ----

/** A tiny seeded random generator, so the grain is identical on every export. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
/** One 160 px tile of monochrome noise, reused as a pattern over the cover. */
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 160; tile.height = 160;
  const ctx = tile.getContext('2d');
  const img = ctx.createImageData(160, 160);
  const rnd = mulberry32(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.floor(rnd() * 20);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

// ------------------------------------------------------------- geometry ----

/** The axis-aligned bounding box of a unit polygon, in canvas pixels. */
function panelBox(poly, w, h) {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const [px, py] of poly) {
    x0 = Math.min(x0, px); y0 = Math.min(y0, py);
    x1 = Math.max(x1, px); y1 = Math.max(y1, py);
  }
  return { x: x0 * w, y: y0 * h, w: (x1 - x0) * w, h: (y1 - y0) * h };
}

/** Clips the context to a unit polygon, then runs the drawing function. */
function clipped(ctx, poly, w, h, draw) {
  ctx.save();
  ctx.beginPath();
  poly.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px * w, py * h);
    else ctx.lineTo(px * w, py * h);
  });
  ctx.closePath();
  ctx.clip();
  draw();
  ctx.restore();
}

// -------------------------------------------------------------- drawing ----

/** Draws one photo into a panel, cover-fitting it with the panel's crop. */
function drawPanelPhoto(ctx, photo, crop, poly, w, h, grade) {
  const box = panelBox(poly, w, h);
  const img = photo.img;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const base = Math.max(box.w / iw, box.h / ih);
  const scale = base * (crop.zoom || 1);
  const dw = iw * scale, dh = ih * scale;
  // ox/oy shift the photo inside its frame, -1..1 across the spare room.
  const spareX = Math.max(0, (dw - box.w) / 2);
  const spareY = Math.max(0, (dh - box.h) / 2);
  const dx = box.x + (box.w - dw) / 2 - (crop.ox || 0) * spareX;
  const dy = box.y + (box.h - dh) / 2 - (crop.oy || 0) * spareY;
  clipped(ctx, poly, w, h, () => {
    ctx.filter = `saturate(${grade.saturate}) contrast(${grade.contrast}) brightness(${grade.brightness})`;
    if (crop.flip) {
      ctx.save();
      ctx.translate(dx + dw / 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -dw / 2, dy, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
    ctx.filter = 'none';
    // A soft shade at the foot of each panel keeps the picture grounded.
    const shade = ctx.createLinearGradient(0, box.y + box.h * 0.62, 0, box.y + box.h);
    shade.addColorStop(0, 'rgba(10,4,20,0)');
    shade.addColorStop(1, 'rgba(10,4,20,0.38)');
    ctx.fillStyle = shade;
    ctx.fillRect(box.x, box.y, box.w, box.h);
  });
}

/** The empty-panel look: a violet placeholder with a dashed frame and a label. */
function drawEmptyPanel(ctx, poly, w, h, label) {
  const box = panelBox(poly, w, h);
  clipped(ctx, poly, w, h, () => {
    const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    g.addColorStop(0, '#2a1740');
    g.addColorStop(1, '#160a26');
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = Math.max(2, w * 0.002);
    ctx.setLineDash([w * 0.012, w * 0.01]);
    ctx.strokeRect(box.x + w * 0.012, box.y + w * 0.012, box.w - w * 0.024, box.h - w * 0.024);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `600 ${Math.round(h * 0.024)}px Oswald, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.toUpperCase(), box.x + box.w / 2, box.y + box.h / 2);
  });
}

/** Draws text with a fixed gap between letters, centred on (cx, y). */
function drawSpacedText(ctx, text, cx, y, tracking) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + tracking;
  });
  ctx.textAlign = prevAlign;
}

/** Splits a title into one or two balanced lines that fit the band. */
function wrapTitle(ctx, text, maxWidth, size) {
  ctx.font = `${size}px Anton, sans-serif`;
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(/\s+/);
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width;
    if (wa > maxWidth || wb > maxWidth) continue;
    const score = Math.abs(wa - wb);
    if (!best || score < best.score) best = { lines: [a, b], score };
  }
  return best ? best.lines : [text];
}

/** The caption: subtitle with rules, then the huge title, in the foot band. */
function drawCaption(ctx, state, w, h) {
  const bandY = TITLE_TOP * h;
  const bandH = h - bandY;
  // The band: deep violet melting into magenta, with a neon hairline on top.
  const bg = ctx.createLinearGradient(0, bandY, 0, h);
  bg.addColorStop(0, '#1a0b2e');
  bg.addColorStop(0.55, '#3d1150');
  bg.addColorStop(1, '#7a1e5e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, bandY, w, bandH);
  const line = ctx.createLinearGradient(0, 0, w, 0);
  line.addColorStop(0, 'rgba(255,122,217,0)');
  line.addColorStop(0.5, '#ff7ad9');
  line.addColorStop(1, 'rgba(125,249,255,0)');
  ctx.fillStyle = line;
  ctx.fillRect(0, bandY, w, Math.max(2, h * 0.004));

  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  const cx = w / 2;

  // Subtitle first, small and tracked-out, flanked by rules.
  if (subtitle) {
    const subSize = Math.round(bandH * 0.155);
    ctx.font = `600 ${subSize}px Oswald, sans-serif`;
    const tracking = subSize * 0.42;
    ctx.fillStyle = '#ffd166';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(subtitle).width + tracking * (subtitle.length - 1);
    const ruleY = bandY + bandH * 0.20;
    ctx.strokeStyle = 'rgba(255,209,102,0.7)';
    ctx.lineWidth = Math.max(1.5, h * 0.0016);
    const gap = w * 0.03;
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2 - gap - w * 0.07, ruleY);
    ctx.lineTo(cx - tw / 2 - gap, ruleY);
    ctx.moveTo(cx + tw / 2 + gap, ruleY);
    ctx.lineTo(cx + tw / 2 + gap + w * 0.07, ruleY);
    ctx.stroke();
    drawSpacedText(ctx, subtitle, cx, ruleY, tracking);
  }

  if (!title) return;
  // The title: as large as the band allows, up to two lines.
  const top = bandY + bandH * (subtitle ? 0.30 : 0.16);
  const availH = h - top - bandH * 0.07;
  const maxW = w * 0.92;
  let size = Math.min(availH * (subtitle ? 0.74 : 0.82), w * 0.16) * (state.titleScale || 1);
  let lines = wrapTitle(ctx, title, maxW, size);
  while (lines.length > 2 && size > 10) {
    size *= 0.92;
    lines = wrapTitle(ctx, title, maxW, size);
  }
  while (lines.some((ln) => ctx.measureText(ln).width > maxW) && size > 10) {
    size *= 0.94;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  const lineH = size * 0.94;
  const totalH = lineH * lines.length;
  let y = top + (availH - totalH) / 2 + size * 0.36;

  const style = TITLE_STYLES[state.titleStyle] || TITLE_STYLES.sunset;
  const fill = ctx.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.5);
  style.stops.forEach(([at, color]) => fill.addColorStop(at, color));
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160409';
  ctx.lineWidth = Math.max(2, size * 0.085);
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = size * 0.10;
  ctx.shadowOffsetY = size * 0.045;
  for (const ln of lines) {
    ctx.strokeText(ln, cx, y);
    ctx.fillStyle = fill;
    ctx.fillText(ln, cx, y);
    y += lineH;
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/** The colour grade wash, vignette and grain over the whole picture. */
function applyGrade(ctx, grade, w, h) {
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  grade.overlay.forEach(([at, color]) => wash.addColorStop(at, color));
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  // Vignette: darkened corners pull the eye to the middle.
  const vig = ctx.createRadialGradient(
    w / 2, h * 0.42, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.78,
  );
  vig.addColorStop(0, 'rgba(8,2,16,0)');
  vig.addColorStop(1, `rgba(8,2,16,${grade.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  // Film grain, barely there, makes the poster feel printed.
  const tile = getGrainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.globalAlpha = 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Paints the whole cover for `state` onto `canvas` (any size; the layout is
 * resolution independent). `state` holds layout, grade, title, subtitle,
 * titleStyle, titleScale and panels: [{ photo, zoom, ox, oy, fit, flip }].
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const layout = LAYOUTS[state.layout] || LAYOUTS.keyart;
  const grade = GRADES[state.grade] || GRADES.sunset;
  // The gutters are the deep backdrop showing between the panels.
  ctx.fillStyle = '#0e0618';
  ctx.fillRect(0, 0, w, h);
  layout.panels.forEach((poly, i) => {
    const panel = state.panels[i];
    const photo = panel && panel.photo;
    if (photo && photo.img) {
      drawPanelPhoto(ctx, photo, panel, poly, w, h, grade);
    } else {
      drawEmptyPanel(ctx, poly, w, h, `Panel ${i + 1}`);
    }
  });
  applyGrade(ctx, grade, w, h);
  drawCaption(ctx, state, w, h);
}

/** A fresh panel list for a layout: every panel starts on the first photo. */
export function freshPanels(layoutKey, photos) {
  const count = (LAYOUTS[layoutKey] || LAYOUTS.keyart).panels.length;
  // oy starts slightly negative so a tall photo shows its top (faces live there).
  return Array.from({ length: count }, () => ({
    photo: photos[0] || null, zoom: 1, ox: 0, oy: -0.25, fit: true, flip: false,
  }));
}
