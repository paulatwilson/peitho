# Peitho-Composer — System Documentation & Developer Handoff

> An 8-bar MIDI sketchpad / generative composition tool. Dark, FabFilter-grade UI.
> Pick a key + scale + creative direction, generate a chord progression, layer
> melodies and counter-melodies, add a drum groove, edit everything by hand in a
> piano-roll, audition it with the built-in synth, and export multi-track MIDI to
> drop into a DAW.

This document explains the whole system top to bottom so you can take it into
Claude Code (or any editor) and keep building. **Read the "Runtime & architecture"
section first** — this file is NOT a normal React app, and the runtime is unusual.

---

## 1. What Peitho-Composer does (product overview)

Peitho-Composer is a single-screen instrument powered by `peitho-array` and `peitho-pulse` in the background. Everything operates on a fixed canvas of
**8 bars of 4/4**, quantised to 16th notes → **128 steps** (`8 bars × 16`).

The workflow, left to right / top to bottom:

1. **Tonality** — choose Key, Scale, Tempo.
2. **Direction** — choose a musical Type / Segment / Option (e.g. *Ballad / Verse /
   Rousing Crescendo*). This **seeds** the macro sliders and biases generation.
3. **Engine Model** — *Peitho-Array* (the algorithmic engine, this build) or
   *Peitho-Pulse* (an LM-based engine — stubbed, "COMING SOON").
4. **Generation Pipeline** — a 3-step gated flow: Generate Chords → Layer Melodies
   → Counter-Melodies. Each step can be **locked** so later regeneration leaves it
   untouched. Steps 2 and 3 are disabled until the previous step is locked.
5. **Macro Shaping** — four sliders (Note Density, Note Split, Syncopation, Rhythm
   Complexity) that reshape the generated lines live. They are *seeded* from the
   Direction but freely tweakable.
6. **Chord Progression** — the harmonic skeleton: 1–16 chord cells across the 8
   bars. Each chord can be re-rolled, swapped (dropdown of in-key chords), **split**
   (scissors) or **merged** with an identical neighbour.
7. **MIDI Matrix** — the centrepiece piano-roll. Stacked lanes: Chords, Bass
   (optional), Melody, Counter, Drums. Supports horizontal + vertical zoom, pan,
   per-track mute/solo, and direct note editing (move / add / delete / resize /
   velocity). Also has a Waveform view.
8. **Transport** — Play/Pause + Loop in the header drive a Web Audio synth with a
   synced playhead.
9. **Export** — per-track MIDI download buttons, plus a footer "Export Multi-Track
   MIDI" that bundles all five tracks into one `.mid`. An "Ambient Seed" scrambler
   re-rolls the active variants.

There is **no backend and no persistence** — all state is in memory. Refresh = reset.

---

## 2. Runtime & architecture (READ THIS FIRST)

### 2.1 This is a "Design Component" (`.dc.html`), not plain React

The app lives in **`docs/Peitho/Peitho.dc.html`**. It is driven by a small custom runtime,
**`docs/Peitho/support.js`** (do not edit — it's framework code), loaded via
`<script src="./support.js">` in the `<head>`.

A `.dc.html` has three parts:

```
<x-dc>
  …TEMPLATE (HTML markup with {{ holes }})…
</x-dc>
<script type="text/x-dc" data-dc-script data-props="…">
  …LOGIC (plain JS: helper functions + `class Component extends DCLogic`)…
</script>
```

The runtime parses the template, instantiates your `Component` class (a React-like
class component), calls `renderVals()` to get a flat bag of values, and binds them
into the template's `{{ }}` holes. **It opens directly in a browser** — no build
step, no bundler, no npm.

### 2.2 Templating rules (important, they bite)

- **`{{ path }}` holes are dotted lookups only** — `{{ key }}`, `{{ ms_chord.mStyle }}`,
  `{{ c.name }}`. **No expressions** — `{{ a + b }}`, `{{ fn() }}`, `{{ !x }}` all
  fail silently (render nothing + console warning). Compute everything in JS and
  expose it by name from `renderVals()`.
- **`style="{{ obj }}"`** binds a JS **style object** (React style object: camelCase
  keys, string values). Almost every styled element here pulls its style from
  `renderVals()` (e.g. `laneStyle`, `matrixContentStyle`, `c.style`).
- **Control flow:**
  - `<sc-for list="{{ items }}" as="x" hint-placeholder-count="N">…{{ x.field }}…</sc-for>`
  - `<sc-if value="{{ flag }}" hint-placeholder-val="{{ true|false }}">…</sc-if>`
  - The `hint-*` attributes are placeholders shown while values stream in; keep them
    set sensibly.
- **Events** are camelCase whole-value attrs: `onClick="{{ handler }}"`,
  `onPointerDown="{{ handler }}"`, `ref="{{ phRef }}"`.
- **Styling is inline only.** The single `<helmet><style>` block at the top of the
  template is limited to what can't be inline: `@keyframes`, `body` reset, scrollbar
  styling. Don't add CSS classes.

### 2.3 The logic class

```js
class Component extends DCLogic {
  state = { … };
  // lifecycle: componentDidMount / componentWillUnmount / etc.
  renderVals() { return { …everything the template binds… }; }
  // + any number of helper/handler methods
}
```

- `DCLogic` and `React` are **injected** — no imports.
- It behaves like a React class component **minus `render()`**: you get
  `this.state`, `this.setState`, `this.props`, `this.forceUpdate`, refs, lifecycle.
- `renderVals()` runs every render and returns the flat object bound into the
  template. It is the single funnel between logic and markup. **If the template
  can't see a value, it's because it isn't returned here.**
- `React.createElement` is deliberately **not** used for layout — everything is
  template markup so it stays directly editable.

### 2.4 Props / Tweaks

`data-props` on the script tag declares two host-editable props:

| Prop     | Editor  | Default     | Used by                                  |
|----------|---------|-------------|------------------------------------------|
| `accent` | color   | `#4a90d9`   | `this.sel()` — the whole UI accent color |
| `glow`   | boolean | `true`      | `this.glow()` — neon glow on waveforms/drums |

Read as `this.props.accent` / `this.props.glow` with fallbacks in `sel()`/`glow()`.
These surface as a Tweaks overlay when the file is opened standalone.

---

## 3. Musical data model

### 3.1 Time

- The grid is **128 steps** (`STEP = 1/16 note`). Bars = `step / 16`. Beats =
  `step / 4`.
- **Chords** use a coarser unit: a chord's `len`/`start` are in **half-bars**
  (1 unit = 8 steps). Total chord span is always **16 half-bars** = 8 bars. When
  chords are converted to matrix notes, they're multiplied by 8
  (`step: c.start*8, len: c.len*8`).

### 3.2 Pitch

- MIDI note numbers. Middle C = 60. Chords are voiced around octave 3–4
  (root `48 + semitone`). Bass is `36 + pitchClass` (octave 2). Melody register
  `[58,84]`, Counter `[46,74]` (these shift with Segment).
- `NOTE_NAMES` = the 12 chromatic names. `SCALES` maps scale name → semitone set.
  Supported scales: Pentatonic Major/Minor, Heptatonic Major, Heptatonic Natural
  Minor.

### 3.3 A "note" object

```js
{ step: 0..127, len: stepsLong, midi: 0..127, vel?: 1..127 }
```

`vel` is optional; absent → treated as 90. Velocity drives both playback gain and
the exported MIDI velocity, and is shown as note fill-opacity + a number label.

### 3.4 A "chord" object

```js
{ name: "C#m7", len: halfBars, start: halfBars, tones: [midi, midi, …] }
```

`tones[0]` is the root → drives the Bass lane.

---

## 4. Pure helper functions (top of the `<script>`)

These are module-level, stateless, and easy to unit-test or replace. This is where
the **Peitho-Array engine** actually lives.

### Constants / tables
- `NOTE_NAMES`, `HEPT` (major/minor heptatonic interval sets), `SCALES`, `KEYS`,
  `SCALE_LIST`, `TYPES`, `SEGMENTS`, `OPTIONS`, `DRUM_PATTERNS`.
- `DRUM_REC` — maps a Type → recommended grooves (drives the "SUGGESTED" badge in
  the groove dropdown).

### RNG
- `_rand()` → fresh uint32 seed.
- `_rng(seed)` → deterministic mulberry32 PRNG. **Melodies/counters are generated
  from a stored seed**, so the same seed + same params = identical line. This is how
  lock/variant/scramble all work.
- `_clamp(v,a,b)`.

### Generation
- **`_genChords(key, scale, type)`** → array of chord objects filling 16 half-bars.
  `type` biases chord **durations** (`lensByType`) and **extension probability**
  (`extByType` — Ballad/Cinematic get richer 7ths/add9s; Pop stays simple triads).
  Uses `Math.random` (NOT seeded) — chords re-roll fresh each call.
- **`_chordPool(key, scale)`** → the list of diatonic chords offered in a chord
  cell's swap dropdown (triads + 7ths + add9 + m7b5 where appropriate).
- **`_scaleMidi(key, scale, lo, hi)`** → all in-scale MIDI numbers in a range. The
  backbone of pitch snapping and the piano-roll row highlighting.
- **`_segProfile(seg)`** → per-Segment density / register-shift / note-length /
  syncopation deltas (Intro sparse+low … Chorus dense+high).
- **`_optProfile(opt)`** → per-Option **dynamic envelope** over the 8 bars
  (`env(bar)→multiplier`) + note-length multiplier. *Rousing Crescendo* ramps up,
  *Moody Wind Down* decays, *Gentle Swell* arches, etc.
- **`_recommendMacros(type, segment, option, scale)`** → the four macro slider
  values (`density/split/sync/rhythm`) seeded from the Direction. Called whenever
  Type/Segment/Option/Scale changes, and by the MACRO "RESET" button.
- **`_genMono(seed, opts)`** → THE melodic generator. Walks 128 steps, using a
  probability-per-step derived from density × segment envelope × beat-position ×
  syncopation × rhythm-complexity, doing a small random walk through the scale,
  emitting `{step,len,midi,vel}`. `opts.counter` thins it out and `opts.register` /
  `opts.sparse` differentiate Melody vs Counter.
- **`_genDrums(pattern)`** → returns `{kick:[steps], snare:[], hat:[], open:[]}` for
  each of the six grooves. Pure step-index arrays.
- **`_wave(notes, bins)`** → downsamples a note list into a 0..1 amplitude array for
  the Waveform view.

### MIDI export
- `_vlq(n)` — variable-length quantity encoder (MIDI delta-times).
- **`_buildMidi(tempo, tracks)`** — builds a **Type-1 SMF** (`MThd` + one tempo
  track + one `MTrk` per track). `tracks` = `[{notes, channel}]`. 480 ticks/quarter,
  `T=120` ticks per step. Drums use channel 9 (GM percussion).
- `_dl(bytes, name)` — triggers a Blob download.

---

## 5. The `Component` class

### 5.1 State shape (in-memory only)

```js
state = {
  // tonality
  key, scale, tempo,
  // legacy/unused-ish: engine ('matrix'), view ('grid'|'wave'), bassOnly (Show Bass)
  engine, view, bassOnly,
  // direction
  type, segment, option,
  // engine model + edit mode
  engineModel:'array', editMode:'note'|'velocity',
  // matrix viewport
  zoom, vzoom, pan, collapseLeft, collapseTonality, collapseChords,
  // macros
  density, split, sync, rhythm,
  // chords
  chords:[…], chordsGen, chordsLocked,
  // melody: 3 variant slots, each a seed OR an override array of hand-edited notes
  melSeeds:[seed|null × 3], activeMel, melodyLocked, melOverride:[notes|null × 3],
  // counter: same structure
  ctrSeeds:[…], activeCtr, ctrOverride:[…],
  // drums: override = hand-edited grid, else generated from drumPattern
  drumOverride, drumPattern,
  // mixer
  mute:{chord,bass,mel,ctr,drums}, solo:{…},
  // ui
  openMenu, openChord, playing, loop, seed
};
```

**Key design idea — seed vs override:** a melody/counter variant is either
*generative* (a `seed` → recomputed by `_genMono` every render, so it reacts live to
macro/direction changes) or *hand-edited* (an `override` array that freezes the
notes). Any manual edit promotes the active variant to an override; regenerating or
moving a macro slider clears the override back to `null`.

### 5.2 Note derivation (the read path)

- `_opts()` — gathers the current generative params.
- `_melNotes()` / `_ctrNotes()` — return the active variant's notes: the override if
  present, else `_genMono(seed, …)`.
- `_drums()` — `drumOverride || _genDrums(drumPattern)`.
- **`computeNotes()`** — the master assembler → `{chord, mel, ctr, bass}` as matrix
  notes. Chords expand to per-tone notes; bass is built from chord roots. Called by
  `renderVals()`, the audio scheduler, and every MIDI export.

### 5.3 Piano-roll geometry

- `_top(midi, range)` → vertical % position of a pitch within a lane (12–82% band).
- `_rowPct(range)` → median spacing between adjacent in-scale rows (for note height).
- `_noteH(range)` → note block height in px, scaled by `vzoom`.
- `pianoRows(range, labelPx)` → the **highlighted scale rows + edge note labels**
  (root row tinted with accent). This is the "what notes are available" guide. Note
  labels are rendered in a separate **pinned** overlay (z-index 3) so they don't
  scroll under horizontal zoom/pan.
- `scaleBands` / `guideLines` — older/lighter variants of the same idea (still wired
  for some lanes; `pianoRows` is the primary one).
- `noteStyles(notes, range, color, hp)` → static note blocks (Chords, Bass).
- `editableNotes(notes, range, color, track, hp, mode)` → interactive note blocks
  (Melody, Counter) with drag/resize/velocity handlers, opacity from velocity, and
  the velocity number label.
- `drumStyles(d, color)` → drum hits positioned by lane row (hat/open/snare/kick).
- `waveStyles(arr, color)` → bars for the Waveform view.

### 5.4 Editing handlers (all pointer-based, with a 3px drag threshold)

- `startNoteDrag` — move a note. **Grab-anchored** (the note follows the cursor from
  where you grabbed it) and only begins after >3px movement, so a plain click never
  nudges it. Snaps X to step, Y to nearest in-scale pitch (`_snapMidi`).
- `startNoteResize` — drag the right-edge handle to lengthen/shorten (min 1 step).
- `startVelDrag` — in **Vel** mode, drag a note up/down to set velocity 1–127.
- `startAddNote` — click empty lane space (Notes mode) to add a 2-step note.
- `deleteNote` — double-click a note.
- `toggleDrumCell` / `drumCellTarget` — click the drum lane; Y position picks
  hat/snare/kick; toggles that step. Promotes drums to an override.
- `_setOverride(track, arr)` — writes the edited array into the active mel/ctr slot.

### 5.5 Pipeline / chord / variant actions

- Chords: `genChords` (regen all), `regenChord(i)`, `setChord(i,p)` (swap from pool),
  `splitChord(i)` (scissors → two equal halves), `mergeChord(i)` (merge identical
  neighbour), `addChord`, `clearAll`, `toggleLockChords`.
- Melody: `genMel` (gated on `chordsLocked`), `regenMel`, `toggleLockMel`,
  `pickMel(i)` (switch variant V1/V2/V3).
- Counter: `genCtr` (gated on `melodyLocked` + a melody existing), `regenCtr`,
  `pickCtr(i)`.
- `resetMacros` — re-seed sliders from current Direction.
- `scrambleSeed` — re-roll active variants + jitter density/sync ("Ambient Seed").
- `pick(name, val)` — the universal dropdown setter. Side effects: changing
  key/scale regenerates chords (if generative); changing type/segment/option/scale
  re-seeds macros and clears overrides; changing drumPattern clears the drum
  override.

### 5.6 Mixer

- `_audible(name)` — solo-aware: if anything is soloed, only soloed tracks play;
  else everything not muted. Used by both audio and lane dimming.
- `toggleMute` / `toggleSolo`.

### 5.7 Audio engine (Web Audio, synth — no samples)

- `_ensureAudio()` — lazily builds `AudioContext` + master gain. Created on first
  Play (must be a user gesture or the context stays suspended).
- `_voice(time, midi, dur, opts)` — one oscillator voice (type + gain) with a short
  AD envelope. Chords=sawtooth, bass=triangle, melody=square, counter=triangle.
- `_noise` / `_drumVoice` — synthesised kick (pitch-drop sine), snare (noise +
  tone), hats (filtered noise burst).
- **Transport is wall-clock driven** (`performance.now()`), NOT the audio clock —
  this keeps the playhead animating smoothly even if the audio context is suspended.
  - `_play` starts a 16ms `setInterval` scheduler + a `requestAnimationFrame`
    playhead loop.
  - `_scheduler` look-ahead schedules each step's notes ~20ms early via
    `_scheduleStep`, which respects mute/solo and scales gain by velocity.
  - `_tick` moves the playhead DOM element (`phRef`), mapping loop position through
    the current zoom/pan transform so it stays aligned with the notes.
  - Loop wraps at step 128; if `loop` is off it stops.
- `togglePlay`, `componentWillUnmount` tears down context + timers.

### 5.8 Viewport

- `zoomBy(d)` / `zoomVBy(d)` — horizontal/vertical zoom, 1×–4×, half-step quantised.
- `pan` is 0..1, edited via the pan scrollbar (reuses `startSlider`).
- The horizontal transform is computed in `renderVals()` as `matrixContentStyle`
  and `rulerContentStyle` (`width: zoom×100%`, `translateX(-pan…)`), applied to each
  lane's scrolling content **and** the bar ruler so they move together.
- `toggleLeft` / `toggleTonality` / `toggleChords` — the three collapsible panels.

### 5.9 `renderVals()` — the big funnel

One large method (~80 keys). It calls `computeNotes()` once, then builds: style
objects (sliders, buttons, lanes, mixer M/S), all the `*Items` dropdown lists, the
chord cells (with split/merge/regen/swap closures), the note style arrays per lane,
the transport + playhead, the zoom/pan/collapse values, and the footer. **This is
your map**: to find what feeds any `{{ hole }}`, search `renderVals` for the key.

---

## 6. Template structure (inside `<x-dc>`)

Top-to-bottom regions, each a comment-banner block:

1. **HEADER** — logo, Loop toggle, Play/Pause.
2. **GLOBAL PARAMS** (collapsible "TONALITY") — Key / Scale / Tempo dropdowns +
   slider, then DIRECTION: Type / Segment / Option dropdowns. Collapsed → one-line
   summary.
3. **CHORD PROGRESSION** (collapsible) — header (count, split/merge legend,
   Regenerate, export-chords, clear), then the chord cells row with the per-cell
   scissors/merge/regen/▾-swap controls, then the optional Bass-line strip
   ("Show Bass").
4. **MAIN GRID** — a flex row:
   - **LEFT column** (collapsible → vertical "CONTROLS" bar): Engine Model card,
     Generation Pipeline (3 gated steps with gen + lock buttons), Macro Shaping
     (seed caption + 4 sliders + RESET).
   - **RIGHT centerpiece**: toolbar (Matrix/Waveform toggle, H-zoom, V-zoom,
     Notes/Vel mode, Groove dropdown, Show-Bass checkbox), bar ruler, then the
     stacked lanes (Chords, Bass*, Melody, Counter, Drums) each = a 178px info
     sidebar + a scaled matrix content area + pinned scale-row labels, plus the
     absolute **PLAYHEAD** overlay and the pan scrollbar.
5. **FOOTER** — Export Multi-Track MIDI + Ambient Seed scrambler.
6. A full-screen invisible click-catcher to close any open dropdown.

Each lane follows the same three-layer pattern:
`scale-row bands (z0, pinned)` → `matrixContentStyle wrapper (zoom/pan transform)
containing grid + notes` → `pinned row labels (z3)`.

---

## 7. Known limitations / gotchas / cleanup opportunities

- **No persistence.** Everything resets on refresh. If you want save/load, serialise
  `state` (seeds + overrides + chords + params) to `localStorage` or a file.
- **Dead/legacy state:** `engine:'matrix'` and the `*Bands`/`guideLines` paths are
  partly superseded by `pianoRows`. `bassOnly` is the "Show Bass" flag (naming is
  historical). Safe to refactor but check every `renderVals` reference first.
- **Chords use `Math.random`, not the seed PRNG** — so chord regeneration isn't
  reproducible from the Ambient Seed (only melodies/counters are). If you want fully
  deterministic projects, thread a seed through `_genChords`.
- **Audio is a basic synth** for auditioning only — it is not meant to sound like
  the target instruments. The exported MIDI is the real deliverable.
- **`_genMono` is the heart of the Array engine.** Most "make it more musical" work
  (voice-leading to the chord under each step, motif repetition, phrase structure)
  belongs there. Right now it's a constrained random walk with no awareness of the
  chord beneath it — a high-value next step is to bias note choice toward current
  chord tones (you have `s.chords` and step→chord mapping available).
- **Peitho-Pulse is a stub.** The selector exists and is disabled. To implement an
  LM engine, branch in `_melNotes`/`_ctrNotes`/`genChords` on `state.engineModel`
  and call out to your model, returning the same `{step,len,midi,vel}` shape.

---

## 8. Working in Claude Code

- **Entry point:** `docs/Peitho/Peitho.dc.html`. Open it directly in a browser to run — no build.
- **Don't touch `support.js`** (runtime). `Peitho Directions.dc.html` is an old
  exploration of three visual directions and can be ignored or deleted.
- **Mental model when editing:**
  1. Template binds `{{ name }}` → find/define `name` in `renderVals()`.
  2. `renderVals()` derives from `state` (+ pure helpers).
  3. Handlers call `setState`, which re-runs `renderVals()`.
- **To change generation/musicality:** edit the pure functions in §4 — they're
  isolated and side-effect free.
- **To change layout/visuals:** edit the inline styles in the template or the style
  objects in `renderVals()`.
- **If a value won't show in the UI**, it's almost always because it isn't returned
  from `renderVals()`, or a `{{ }}` hole contains an expression (not allowed).

### Porting to a "normal" stack
If you'd rather rebuild this as a standard React/Vite app: the pure functions in §4
(generation + MIDI) port **verbatim** — they're plain JS with no framework
dependency. The `Component` class maps almost 1:1 to a React component (state →
`useState`/`useReducer`, `renderVals()` → the body of your render, the handlers →
callbacks). The only real rewrite is the template: turn the `{{ holes }}` /
`<sc-for>` / `<sc-if>` into JSX. Budget most of your effort on the matrix lanes and
the pointer-edit handlers.
