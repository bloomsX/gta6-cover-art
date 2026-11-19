// Fixed scenes for screenshots: ?shot=cover shows the cover alone, ?shot=editor
// shows the editor with a photo loaded. The query picks the layout, grade,
// export size, caption and which sample photos fill the panels, comma separated
// (photos=boulevard,neon,rooftop). window.__shotReady is set once painted.
export async function runShot(shot, query, applyScene) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const numbers = (key) => (query.get(key) ?? '')
    .split(',')
    .filter((v) => v !== '')
    .map(Number);
  const scene = {
    layout: query.get('layout') ?? 'keyart',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? 'square',
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('tagline') ?? 'Boulevard Nights',
    photos: (query.get('photos') ?? 'boulevard').split(','),
    zooms: numbers('zooms'),
    oxs: numbers('oxs'),
    oys: numbers('oys'),
  };
  await applyScene(scene);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
