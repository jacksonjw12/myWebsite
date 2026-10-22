// Animated background: diamond (rhombus) lattices drawn per-pixel in a WebGL
// shader, each moving at its own speed for parallax. Each lattice is two
// families of parallel lines (one per slope). Effects, toggled via `fx`:
//   drift     — each slope slides on its own (on its own this is just a translation)
//   driftSync — local drift: instead of sliding together, each line takes one
//               eased step per cycle at its own random moment; driftDensity is
//               the share of the cycle spent stepping, i.e. roughly the share
//               of lines in motion at any moment
//   pulse     — now and then a line peels off its neighbour and sweeps across to
//               the next line, so the row of diamonds it crosses shrinks to nothing
//               as the row behind it grows. Sweeps start and end on existing
//               lines, so they're seamless, and only a few lines move at a time.
// Elements marked with [data-lens] become liquid-glass lenses: the shader
// refracts the pattern at their rounded edges, slightly magnifies and frosts
// their interior, and adds a touch of chromatic aberration.

// Defaults for everyone; the dev pane (see dev.js) can override them live.
// Pulse timing: time is split into `pulseSlot`-second slots. In each slot a
// `pulseDensity` fraction of lines, picked at random, sweeps once,
// starting at a random moment and taking `pulseMove` ± `pulseJitter` seconds
// (at least MIN_MOVE, at most one slot).
export const DEFAULT_FX = {
  drift: true,
  driftSync: false,
  driftDensity: 0.25,
  driftSpeed: 0.5, // multiplier on every layer's drift speed
  // Local drift moves each line one spacing in this many hops. With 1, a line
  // can land on a neighbour that hasn't moved yet and visibly fuse with it;
  // with n, neighbours always stay at least 1 - 1/n spacings apart.
  driftHops: 2,
  pulse: true,
  pulseSlot: 6,
  pulseMove: 5,
  pulseJitter: 1,
  pulseDensity: 0.05,
  // Minimum render pixels per CSS pixel. Standard screens get 2 (supersampled
  // edges); high-density screens (Retina, phones) already have at least that
  // and render at their own density rather than a multiple of it, which would
  // cost 4–9× the pixels for no visible gain.
  renderScale: 2,
};

// Live render stats for the dev pane, updated once a second.
export const stats = { fps: 0, worstMs: 0, scale: 0 };

// Per layer: diamond cell size (CSS px); drift speed (CSS px/s) of the "/" and
// "\" line families, each across its own lines; and how strongly it follows
// the pointer. Colors and line weights live in the shader.
const LAYERS = [
  { cell: [140, 196], drift: [5, -3], depth: 0.25 }, //  far: argyle diamonds
  { cell: [84, 118], drift: [-12, 8], depth: 0.55 }, //  mid: thin green lattice
  { cell: [260, 364], drift: [20, -14], depth: 1 }, //   near: broad green stripes
];
const POINTER_PARALLAX = 28; // max pointer shift in CSS px at depth 1
const POINTER_SMOOTHING = 0.4; // time constant (s) for easing toward the pointer
// The animation runs on its own clock, which only advances while frames are
// drawn. On start, and on returning to the page, its speed eases from 0 to 1
// over RAMP_UP s. A gap longer than RESUME_GAP s (e.g. waking from sleep)
// counts as a return; shorter hitches advance the clock by at most MAX_STEP s.
const RAMP_UP = 2;
const RESUME_GAP = 1;
const MAX_STEP = 0.1;
// The pulse's random pattern repeats after `slots` slots and every `pairs`
// lines, which lets time and line positions wrap without visible jumps.
const PULSE_LOOP = { slots: 1024, pairs: 64 };
export const MIN_MOVE = 0.1; // s; shortest allowed pulse move, so jitter can't make one instant

// Duration (s) of one pulse move for a random value r in [0, 1).
export const moveDuration = (fx, r) =>
  Math.min(fx.pulseSlot, Math.max(MIN_MOVE, fx.pulseMove + fx.pulseJitter * (2 * r - 1)));

// Shortest average local-drift hop (s) among the line families: each line
// covers 1/driftHops of a spacing per cycle and spends driftDensity of it moving.
export function fastestLocalStep(fx) {
  const cycles = LAYERS.flatMap(({ cell, drift }) =>
    drift.map((speed) => 1 / (Math.abs(speed) * fx.driftSpeed * fx.driftHops * Math.hypot(1 / cell[0], 1 / cell[1]))),
  );
  return fx.driftDensity * Math.min(...cycles);
}

// bevel: width of the curved rim (px); strength: max refraction at the rim (px);
// magnify: interior zoom factor; frost: interior blur (px).
const LENSES = {
  card: { bevel: 44, strength: 30, magnify: 0.05, frost: 5 },
  panel: { bevel: 14, strength: 6, magnify: 0, frost: 12 },
  pill: { bevel: 16, strength: 9, magnify: 0, frost: 6 },
};
const MAX_LENSES = 8;

// Stay under ~16M pixels (iOS Safari's canvas limit) whatever fx.renderScale asks for.
const MAX_PIXELS = 16_000_000;

// JS name → GLSL uniform name, looked up once per compiled shader variant.
const UNIFORMS = {
  buffer: 'uBuffer',
  scale: 'uScale',
  center: 'uCenter',
  basis: 'uBasis',
  phase: 'uPhase',
  pulseTime: 'uPulseTime',
  slot: 'uSlot',
  move: 'uMove',
  jitter: 'uJitter',
  density: 'uDensity',
  driftDensity: 'uDriftDensity',
  stepA: 'uStepA',
  stepB: 'uStepB',
  hops: 'uHops',
  rect: 'uRect',
  lens: 'uLens',
  frost: 'uFrost',
  lensCount: 'uLensCount',
};

const VERTEX = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

// The fragment shader is compiled per combination of LOCAL_DRIFT and PULSE, so
// disabled features cost nothing: as runtime branches their code still sat
// in the shader and roughly doubled the cost of every pixel.
const fragmentSource = ({ localDrift, pulse }) => `
${localDrift ? '#define LOCAL_DRIFT' : ''}
${pulse ? '#define PULSE' : ''}
precision highp float;

uniform vec2 uBuffer;      // drawing buffer size (px)
uniform vec2 uScale;       // buffer px per CSS px
uniform vec2 uCenter;      // viewport center (CSS px); lattices are centred on it
uniform vec4 uBasis[${LAYERS.length}];  // per layer: normals of the two line families, in lines per CSS px
uniform vec2 uPhase[${LAYERS.length}];  // per-layer shift of each line family, in lines
uniform float uPulseTime;  // seconds, wrapped to the pulse loop
uniform float uSlot;       // pulse slot length (s)
uniform float uMove;       // pulse move duration (s)
uniform float uJitter;     // pulse move duration variation (± s)
uniform float uDensity;    // fraction of lines that sweep per slot
uniform float uDriftDensity; // local drift: fraction of each cycle a line spends stepping
// Local drift, per layer, for the "/" (A) and "\\" (B) families:
// (direction ±1 or 0 = off, cycle index, seconds into the cycle, cycle length s)
uniform vec4 uStepA[${LAYERS.length}];
uniform vec4 uStepB[${LAYERS.length}];
uniform float uHops;       // local drift hops per line spacing
uniform vec4 uRect[${MAX_LENSES}];  // center.xy, half-size.xy (CSS px)
uniform vec4 uLens[${MAX_LENSES}];  // radius, bevel, strength, magnify
uniform float uFrost[${MAX_LENSES}];
uniform int uLensCount;

const float LOOP_SLOTS = ${PULSE_LOOP.slots.toFixed(1)};
const float LOOP_PAIRS = ${PULSE_LOOP.pairs.toFixed(1)};

const vec3 PAPER = vec3(0.976, 0.988, 0.973);
const vec3 PALE  = vec3(0.886, 0.945, 0.894);
const vec3 MID   = vec3(0.247, 0.561, 0.353);
const vec3 DEEP  = vec3(0.157, 0.459, 0.271);

// Hash without sine (Dave Hoskins), stable across GPUs. Returns 0–1.
float hash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float smootherstep01(float x) {
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

// Duration of one random move (pulse sweep or drift step), capped at maxTime.
float moveDuration(vec3 seed, float maxTime) {
  return clamp(uMove + uJitter * (2.0 * hash(seed + vec3(0.0, 0.0, 1.0)) - 1.0), ${MIN_MOVE.toFixed(3)}, maxTime);
}

// Position (0–1 from line k to the next) of line k's sweeping partner;
// id = layer * 2 + family. 0 and 1 lie on existing lines, so the partner is
// invisible except mid-sweep. Direction is random; eased with smootherstep.
float pulseGap(float k, float id) {
  float slot = floor(uPulseTime / uSlot);
  float local = uPulseTime - slot * uSlot;
  vec3 seed = vec3(mod(k, LOOP_PAIRS), id, slot * 4.0);
  if (hash(seed) >= uDensity) return 0.0;
  float duration = moveDuration(seed, uSlot);
  float start = hash(seed + vec3(0.0, 0.0, 2.0)) * (uSlot - duration);
  float progress = smootherstep01(clamp((local - start) / duration, 0.0, 1.0));
  return hash(seed + vec3(0.0, 0.0, 3.0)) < 0.5 ? progress : 1.0 - progress;
}

// Local drift: how far (0–1 of a hop) line k has stepped in the current cycle.
// Each line takes one eased hop per cycle at its own random moment, lasting
// uDriftDensity of the cycle. Jitter is scaled to the step (same relative
// spread as pulse moves), so short steps don't get erratic.
float stepOffset(float k, float id, vec4 st) {
#ifdef LOCAL_DRIFT
  vec3 seed = vec3(mod(k, LOOP_PAIRS), id + 16.0, st.y * 4.0);
  float spread = uJitter / uMove * (2.0 * hash(seed + vec3(0.0, 0.0, 1.0)) - 1.0);
  float duration = clamp(uDriftDensity * st.w * (1.0 + spread), ${MIN_MOVE.toFixed(3)}, st.w);
  float start = hash(seed + vec3(0.0, 0.0, 2.0)) * (st.w - duration);
  return smootherstep01(clamp((st.z - start) / duration, 0.0, 1.0));
#else
  return 0.0;
#endif
}

// One family of parallel lines at coordinate u (in lines). Returns the
// distance (in lines) to the nearest line or pulse partner, and the index of
// the line just below u (for fill parity). Line k sits at k + dir × (cycle +
// hop) / hops, so it stays within one hop of the shared base and can't reach
// a neighbour: only three lines can be nearest — floor(base) - 1 … + 1 when
// stepping forward, floor(base) … + 2 when stepping backward. Only the partner
// in u's own gap matters; any other is farther than the line between them.
vec2 family(float u, float id, vec4 st, bool pulse) {
  float base = u - st.x * st.y / uHops;
  float k0 = floor(base) + (st.x < 0.0 ? 1.0 : 0.0);
  float dist = 1e9;
  float below = k0 - 1.0;
  float belowPos = below;
  for (int j = -1; j <= 1; j++) {
    float k = k0 + float(j);
    float pk = k + st.x * stepOffset(k, id, st) / uHops;
    dist = min(dist, abs(base - pk));
    if (pk <= base) {
      below = k;
      belowPos = pk;
    }
  }
#ifdef PULSE
  if (pulse) {
    float next = below + 1.0 + st.x * stepOffset(below + 1.0, id, st) / uHops;
    dist = min(dist, abs(base - mix(belowPos, next, pulseGap(below, id))));
  }
#endif
  return vec2(dist, below);
}

// Distance (CSS px) to the nearest line of a rhombus lattice, and the parity
// of the diamond containing p. basis holds the normal of each line family.
// Pass pulse = false to skip pulse partners (the far fill would visibly flip
// color when a sweep resets).
vec2 lattice(vec2 p, vec4 basis, vec2 phase, float layer, vec4 stepA, vec4 stepB, bool pulse) {
  vec2 uv = vec2(dot(p, basis.xy), dot(p, basis.zw)) + phase;
  vec2 a = family(uv.x, layer * 2.0, stepA, pulse);
  vec2 b = family(uv.y, layer * 2.0 + 1.0, stepB, pulse);
  float dist = min(a.x / length(basis.xy), b.x / length(basis.zw));
  return vec2(dist, mod(a.y + b.y, 2.0));
}

float line(float dist, float width, float aa) {
  return 1.0 - smoothstep(width * 0.5 - aa, width * 0.5 + aa, dist);
}

// Line mask for one layer, drawn with the given width.
float layerLine(vec2 q, vec4 basis, vec2 phase, vec4 stepA, vec4 stepB, float layer, float width, float aa) {
  return line(lattice(q, basis, phase, layer, stepA, stepB, true).x, width, aa);
}

// aa is the edge softness in CSS px: one buffer pixel outside glass, wider
// (frosted) inside it. Layers are composited back to front.
vec3 scene(vec2 p, float aa) {
  vec2 q = p - uCenter;
  vec2 far = lattice(q, uBasis[0], uPhase[0], 0.0, uStepA[0], uStepB[0], false);
  vec3 color = mix(PAPER, PALE, mix(0.5, far.y, min(far.x / aa, 1.0)));
  color = mix(color, MID, 0.8 * layerLine(q, uBasis[1], uPhase[1], uStepA[1], uStepB[1], 1.0, 3.0, aa));
  color = mix(color, DEEP, 0.3 * layerLine(q, uBasis[2], uPhase[2], uStepA[2], uStepB[2], 2.0, 18.0, aa));
  return color;
}

float sdRoundRect(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uBuffer.y - gl_FragCoord.y) / uScale;
  float aa = 0.5 / uScale.x;

  vec2 offset = vec2(0.0);
  float frost = 0.0;
  for (int i = 0; i < ${MAX_LENSES}; i++) {
    if (i >= uLensCount) break;
    vec4 rect = uRect[i];
    vec4 lens = uLens[i];
    vec2 q = p - rect.xy;
    float d = sdRoundRect(q, rect.zw, lens.x);
    if (d >= 0.0) continue;

    vec2 e = vec2(0.5, 0.0);
    vec2 normal = normalize(vec2(
      sdRoundRect(q + e.xy, rect.zw, lens.x) - sdRoundRect(q - e.xy, rect.zw, lens.x),
      sdRoundRect(q + e.yx, rect.zw, lens.x) - sdRoundRect(q - e.yx, rect.zw, lens.x)) + 1e-5);
    float rim = 1.0 - clamp(-d / lens.y, 0.0, 1.0); // 1 at the edge, 0 past the bevel

    // The rim pulls in the pattern from just outside the glass; the interior zooms.
    offset += normal * lens.z * rim * rim * rim - q * lens.w;
    frost = max(frost, uFrost[i]);
  }

  // Inside glass, sample red, green and blue at slightly different refraction
  // strengths (chromatic aberration); elsewhere one sample. A loop around a
  // single scene() call keeps one copy of the scene code in the shader:
  // three inlined calls tripled its size and slowed every pixel.
  vec3 color = vec3(0.0);
  float blur = frost > 0.0 ? aa + frost : aa;
  for (int i = 0; i < 3; i++) {
    float channel = float(i);
    if (frost == 0.0 && i > 0) break;
    vec3 sample = scene(p + offset * (1.1 - 0.1 * channel), blur);
    if (frost == 0.0) color = sample;
    else color += sample * vec3(channel == 0.0, channel == 1.0, channel == 2.0);
  }
  gl_FragColor = vec4(color, 1.0);
}
`;

// fx is read every frame, so changing it takes effect immediately.
// Returns false if WebGL is unavailable, so callers can fall back to CSS glass.
export function startBackground(canvas, fx = DEFAULT_FX) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return false;

  // Normals of each layer's "/" and "\" families, scaled so dot(p, n) counts
  // lines. Both families of a layer share the same line spacing.
  const normals = LAYERS.map(({ cell }) => [
    [1 / cell[0], 1 / cell[1]],
    [1 / cell[0], -1 / cell[1]],
  ]);

  // Shader variants, compiled on first use. Uniforms a variant compiles out
  // have null locations, and setting those is a harmless no-op.
  const variants = new Map();
  let u, variantKey, width, height;
  function useVariant() {
    const variant = { localDrift: fx.drift && fx.driftSync, pulse: fx.pulse };
    const key = `${variant.localDrift}/${variant.pulse}`;
    if (key === variantKey) return true;
    if (!variants.has(key)) {
      const program = createProgram(gl, VERTEX, fragmentSource(variant));
      if (!program) return false;
      const locations = Object.fromEntries(
        Object.entries(UNIFORMS).map(([name, glslName]) => [name, gl.getUniformLocation(program, glslName)]),
      );
      variants.set(key, { program, locations });
    }
    const { program, locations } = variants.get(key);
    gl.useProgram(program);
    u = locations;
    variantKey = key;
    gl.uniform4fv(u.basis, normals.flat(2));
    if (width) setViewUniforms();
    return true;
  }
  if (!useVariant()) return false;

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const lensElements = [...document.querySelectorAll('[data-lens]')].slice(0, MAX_LENSES);
  const radii = lensElements.map((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0);
  const rects = new Float32Array(MAX_LENSES * 4);
  const lenses = new Float32Array(MAX_LENSES * 4);
  const frosts = new Float32Array(MAX_LENSES);
  const phases = new Float32Array(LAYERS.length * 2);
  const stepsA = new Float32Array(LAYERS.length * 4);
  const stepsB = new Float32Array(LAYERS.length * 4);

  // Local drift state for one line family: each line hops 1/hops of a spacing
  // per cycle, so a cycle lasts as long as the global drift takes to cover
  // that distance. The cycle index wraps after a whole pulse pattern
  // (loopPairs lines), which shifts line indices by a whole pattern — invisible.
  function localStep(t, speed, linesPerPx) {
    if (!speed) return [0, 0, 0, 1];
    const cycle = 1 / (Math.abs(speed) * linesPerPx * fx.driftHops);
    const n = Math.floor(t / cycle);
    // A positive drift phase moves lines toward lower coordinates.
    return [-Math.sign(speed), n % (PULSE_LOOP.pairs * fx.driftHops), t - n * cycle, cycle];
  }

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let lastFrame, renderScale;
  let clock = 0, rampStart, resuming = true;
  let statsStart, statsFrames = 0, statsWorst = 0;

  function resize() {
    width = innerWidth;
    height = innerHeight;
    renderScale = fx.renderScale;
    const scale = Math.min(Math.max(devicePixelRatio || 1, renderScale), Math.sqrt(MAX_PIXELS / (width * height)));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    // The browser may clamp the drawing buffer, so measure what we actually got.
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    setViewUniforms();
    stats.scale = gl.drawingBufferWidth / width;
  }

  // Size-dependent uniforms; set on resize and whenever a variant is activated.
  function setViewUniforms() {
    gl.uniform2f(u.buffer, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(u.scale, gl.drawingBufferWidth / width, gl.drawingBufferHeight / height);
    gl.uniform2f(u.center, width / 2, height / 2);
  }

  function recordStats(now, dt) {
    statsStart ??= now;
    statsFrames++;
    statsWorst = Math.max(statsWorst, dt * 1000);
    if (now - statsStart >= 1000) {
      stats.fps = Math.round((statsFrames * 1000) / (now - statsStart));
      stats.worstMs = Math.round(statsWorst);
      statsStart = now;
      statsFrames = 0;
      statsWorst = 0;
    }
  }

  function frame(now) {
    let dt = lastFrame === undefined ? 0 : (now - lastFrame) / 1000;
    lastFrame = now;
    if (resuming || dt > RESUME_GAP) {
      resuming = false;
      rampStart = now;
      dt = 0;
    }
    recordStats(now, dt);
    useVariant();
    const ramp = Math.min((now - rampStart) / 1000 / RAMP_UP, 1);
    clock += Math.min(dt, MAX_STEP) * ramp * ramp * (3 - 2 * ramp);
    const t = reducedMotion ? 0 : clock;

    // Exponential ease toward the pointer, scaled by elapsed time so it feels
    // the same at any frame rate.
    if (fx.renderScale !== renderScale) resize();
    const ease = 1 - Math.exp(-dt / POINTER_SMOOTHING);
    pointer.x += (pointer.targetX - pointer.x) * ease;
    pointer.y += (pointer.targetY - pointer.y) * ease;

    LAYERS.forEach(({ drift, depth }, i) => {
      // The pointer shifts the whole lattice; drift slides each family across
      // its lines — all together, or (driftSync) each line stepping on its own.
      const [n1, n2] = normals[i];
      const ox = pointer.x * depth * POINTER_PARALLAX;
      const oy = pointer.y * depth * POINTER_PARALLAX;
      const linesPerPx = Math.hypot(...n1);
      const slide = fx.drift && !fx.driftSync ? t * linesPerPx * fx.driftSpeed : 0;
      const local = (speed) => localStep(t, fx.drift && fx.driftSync ? speed * fx.driftSpeed : 0, linesPerPx);
      stepsA.set(local(drift[0]), i * 4);
      stepsB.set(local(drift[1]), i * 4);
      // Wrap only after a whole pulse pattern (not one line) so each moving line
      // keeps its pair index, and with it its pulse schedule.
      phases[i * 2] = (ox * n1[0] + oy * n1[1] + drift[0] * slide) % PULSE_LOOP.pairs;
      phases[i * 2 + 1] = (ox * n2[0] + oy * n2[1] + drift[1] * slide) % PULSE_LOOP.pairs;
    });

    // Read lens geometry every frame so hover/entrance transforms stay in sync.
    lensElements.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const lens = LENSES[el.dataset.lens];
      rects.set([r.left + r.width / 2, r.top + r.height / 2, r.width / 2, r.height / 2], i * 4);
      lenses.set([Math.min(radii[i], r.width / 2, r.height / 2), lens.bevel, lens.strength, lens.magnify], i * 4);
      frosts[i] = lens.frost;
    });

    gl.uniform2fv(u.phase, phases);
    gl.uniform1f(u.pulseTime, t % (fx.pulseSlot * PULSE_LOOP.slots));
    gl.uniform1f(u.slot, fx.pulseSlot);
    gl.uniform1f(u.move, fx.pulseMove);
    gl.uniform1f(u.jitter, fx.pulseJitter);
    gl.uniform1f(u.density, fx.pulseDensity);
    gl.uniform1f(u.driftDensity, fx.driftDensity);
    gl.uniform4fv(u.stepA, stepsA);
    gl.uniform4fv(u.stepB, stepsB);
    gl.uniform1f(u.hops, fx.driftHops);
    gl.uniform4fv(u.rect, rects);
    gl.uniform4fv(u.lens, lenses);
    gl.uniform1fv(u.frost, frosts);
    gl.uniform1i(u.lensCount, lensElements.length);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  // Returning to the tab, or to the page via back/forward cache.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resuming = true;
  });
  addEventListener('pageshow', (e) => {
    if (e.persisted) resuming = true;
  });
  if (!reducedMotion) {
    addEventListener('pointermove', (e) => {
      pointer.targetX = e.clientX / width - 0.5;
      pointer.targetY = e.clientY / height - 0.5;
    });
  }
  resize();
  requestAnimationFrame(frame);
  return true;
}

function createProgram(gl, vertexSource, fragmentSrc) {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSrc]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    gl.attachShader(program, shader);
  }
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}
