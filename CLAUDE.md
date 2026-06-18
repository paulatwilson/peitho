# CLAUDE.md — Peitho-Composer

**Full system documentation lives in [`docs/PEITHO.md`](./docs/PEITHO.md). Read it before editing.**

## What this is
Peitho-Composer is an 8-bar generative MIDI composition surface. The current prototype is one file:
**`docs/Peitho/Peitho.dc.html`**. Open it directly in a browser to run — there is
**no build step, no bundler, no npm**.

## Critical rules (this is NOT a normal React app)
- `docs/Peitho/Peitho.dc.html` is a **Design Component** driven by the custom
  runtime **`docs/Peitho/support.js`**. **Never edit `support.js`** — it is
  framework code.
- The file is `<x-dc>` template + a `<script>` logic class
  (`class Component extends DCLogic`). See PEITHO.md §2 for the model.
- **Template `{{ holes }}` are dotted lookups only.** No expressions — `{{ a+b }}`,
  `{{ fn() }}`, `{{ !x }}` fail silently. Compute in JS and expose the result by
  name from **`renderVals()`**.
- `renderVals()` is the single funnel from logic → template. If a value won't show
  in the UI, it's because it isn't returned there (or a hole has an expression).
- **Styling is inline only.** No CSS classes/stylesheets. The one `<helmet><style>`
  block is limited to `@keyframes` / `body` reset / scrollbar.
- Editing flow: template binds `{{ name }}` → define `name` in `renderVals()` →
  `renderVals()` derives from `state` + the pure helper functions → handlers call
  `setState`.

## Where things live
- **Generation / musicality** → pure module-level functions at the top of the
  `<script>` (`_genChords`, `_genMono`, `_genDrums`, `_recommendMacros`, profiles).
  Side-effect-free; the Peitho-Array engine. `_genMono` is the melodic heart.
- **MIDI export** → `_buildMidi` / `_dl` (Type-1 SMF, drums on channel 9).
- **State + handlers + audio + geometry** → the `Component` class.
- **Layout/visual** → inline styles in the template + style objects in `renderVals()`.

## Gotchas
- Time has two units: matrix **steps** (128 = 8 bars, 1 = 1/16) vs chord
  **half-bars** (16 total, 1 = 8 steps). Don't mix them.
- Melodies/counters are **seed-or-override**: generative (seed → recomputed live) or
  hand-edited (frozen override). Manual edits set an override; regen/macro-move
  clears it.
- Chords use `Math.random`, not the seed PRNG → not reproducible from the Ambient
  Seed. Only melodies/counters are.
- No persistence — refresh resets everything.
- Audio is a basic Web Audio synth for **auditioning only**; the exported MIDI is
  the real deliverable.
- `Peitho-Pulse` (LM engine) is a disabled stub; `Peitho-Array` is this build.

## Files
- `docs/Peitho/Peitho.dc.html` — the app.
- `docs/PEITHO.md` — full top-to-bottom documentation.
- `docs/Peitho/support.js` — runtime (do not edit).
- `Peitho Directions.dc.html` — old visual-direction exploration; not part of the app.
