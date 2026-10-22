// Live settings for A/B-ing visual effects, edited from a small pane in the
// top-left. The pane appears on localhost or with ?dev in the URL, and the
// choices persist in this browser; everyone else gets the defaults.
import { DEFAULT_FX, fastestLocalStep, moveDuration, stats } from './background.js';

const STORAGE_KEY = 'dev-fx';

// Checkboxes for booleans, sliders for numbers, and read-only hints that
// refresh whenever a slider moves. `parent` indents a control under another.
const CONTROLS = [
  { key: 'drift', label: 'Drift (slide each slope)' },
  { key: 'driftSpeed', label: 'Speed', parent: 'drift', min: 0.1, max: 2, step: 0.05, format: (v) => `${v}×` },
  { key: 'driftSync', label: 'Local (each line steps alone)', parent: 'drift' },
  {
    key: 'driftDensity',
    label: 'Density',
    parent: 'drift',
    min: 0.05,
    max: 1,
    step: 0.05,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'driftHops',
    label: 'Hops',
    parent: 'drift',
    min: 1,
    max: 4,
    step: 1,
    format: (v) => (v === 1 ? 'full' : `1/${v}`),
  },
  {
    hint: () =>
      `Local: ~${Math.round(fx.driftDensity * 100)}% moving, fastest hop ${fastestLocalStep(fx).toFixed(1)}s`,
    parent: 'drift',
  },
  { key: 'pulse', label: 'Pulse (diamonds grow/shrink)' },
  { key: 'pulseSlot', label: 'Slot', parent: 'pulse', min: 1, max: 10, step: 0.1, format: (v) => `${v}s` },
  { key: 'pulseMove', label: 'Move', parent: 'pulse', min: 0.2, max: 6, step: 0.1, format: (v) => `${v}s` },
  { key: 'pulseJitter', label: 'Jitter', parent: 'pulse', min: 0, max: 3, step: 0.1, format: (v) => `±${v}s` },
  {
    key: 'pulseDensity',
    label: 'Density',
    parent: 'pulse',
    min: 0.005,
    max: 0.5,
    step: 0.005,
    format: (v) => `${+(v * 100).toFixed(1)}%`,
  },
  {
    hint: () => `Moves take ${moveDuration(fx, 0).toFixed(1)}–${moveDuration(fx, 1).toFixed(1)}s`,
    parent: 'pulse',
  },
  { key: 'renderScale', label: 'Render', min: 0.5, max: 2, step: 0.25, format: (v) => `${v}×` },
  {
    hint: () => `${stats.fps} fps, worst frame ${stats.worstMs}ms, ${stats.scale.toFixed(2)} px per CSS px`,
    parent: 'renderScale',
  },
];

export const fx = { ...DEFAULT_FX };

export const devMode =
  ['localhost', '127.0.0.1'].includes(location.hostname) || new URLSearchParams(location.search).has('dev');

if (devMode) {
  try {
    Object.assign(fx, JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {}
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fx));
  } catch {}
}

export function mountDevPane() {
  const pane = document.createElement('aside');
  pane.className = 'dev-pane';
  pane.innerHTML = '<strong>Dev</strong>';

  const hints = [];
  const refreshHints = () => hints.forEach((refresh) => refresh());

  for (const { key, label, parent, min, max, step, format, hint } of CONTROLS) {
    const row = document.createElement(hint ? 'div' : 'label');
    if (parent) row.classList.add('sub');

    if (hint) {
      row.classList.add('hint');
      hints.push(() => (row.textContent = hint()));
    } else if (typeof DEFAULT_FX[key] === 'boolean') {
      const box = Object.assign(document.createElement('input'), { type: 'checkbox', checked: fx[key] });
      box.addEventListener('change', () => {
        fx[key] = box.checked;
        save();
      });
      row.append(box, label);
    } else {
      const slider = Object.assign(document.createElement('input'), { type: 'range', min, max, step, value: fx[key] });
      const value = document.createElement('output');
      const show = () => (value.textContent = format(fx[key]));
      slider.addEventListener('input', () => {
        fx[key] = Number(slider.value);
        show();
        refreshHints();
        save();
      });
      show();
      row.classList.add('slider');
      row.append(label, slider, value);
    }
    pane.append(row);
  }

  refreshHints();
  setInterval(refreshHints, 500); // keeps the live render stats current
  document.body.append(pane);
}
