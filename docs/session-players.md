# Session Players

Status: proposal. Only Composer arpeggiator work exists today. Other players and
all model-backed paths remain unimplemented.

Session Players turn chord, rhythm and optional edited-note context into reusable
symbolic performances. They return Peitho `NoteEvent[]`; playback and instruments
remain Composer concerns.

## Contract

```ts
type PlayerRequest = {
  role: "guitar" | "keys" | "strings" | "bass" | "lead" | "drums";
  style: string;
  bars: number;
  stepsPerBar: number;
  seed: number;
  key: string;
  scale: ScaleInput;
  chords: ChordEvent[];
  existingNotes?: NoteEvent[];
  density: number;
  sync: number;
  intensity: number;
};

type SessionPlayer = {
  generate(request: PlayerRequest): Promise<NoteEvent[]>;
};
```

Player contracts belong in a reusable package, not Composer UI state. Product
labels may resolve to plain parameters before the request crosses that boundary.

## Build Order

Start deterministic. These paths are testable, instant and require no model:

1. Keyboard arpeggiator: chord-tone permutations and rate.
2. Bass root/fifth: pulse pattern, octave and accents.
3. Keyboard comping: chord voicing plus rhythmic gates.
4. String pads: nearest-voice movement and common-tone retention.
5. Guitar strumming: fretboard-valid voicings and stroke timing.
6. Walking bass: chord targets with scale/chromatic approach notes.

Model-backed infilling comes only after deterministic players establish contracts
and listening fixtures.

## Roles

| Role | Deterministic baseline | Possible later model task |
| --- | --- | --- |
| Guitar | strum, fingerpick, muted pulse | continuation/fills |
| Keys | arpeggio, stride, comping | context-aware infilling |
| Strings | sustained voice leading | phrase shaping |
| Bass | root/fifth, pulse, walking rules | melodic continuation |
| Lead | motif transforms | controlled infilling |
| Drums | pattern grids and variations | fills/continuation |

## Existing Composer Arpeggiator

Current work lives inside `apps/peitho-composer/public/index.html`. Refactor target:

- pure pattern generation in reusable TypeScript
- explicit `steps`, `type`, `style` and `rate` inputs
- `ChordEvent[] -> NoteEvent[]` output
- unit tests independent of Design Component runtime
- thin Composer modal/state adapter

## Anticipatory Music Transformer Research

Reference source: `.contrib/ai-models/anticipation` (read-only).

Verified from its local README:

- project implements anticipatory dataset/sampling methods
- pretrained checkpoints are hosted by Stanford CRFM
- example checkpoint: `stanford-crfm/music-medium-800k`
- supplied runtime is Python using Hugging Face Transformers
- control inputs support accompaniment and infilling workflows
- repository does not provide model-training implementation itself

Not verified or implemented:

- TyTorch can load this checkpoint
- Bun can run its model and custom sampling/token conversion
- Metal execution or acceptable latency/memory
- generated events map losslessly into Peitho timing/instrument contracts
- one model can generate all proposed player roles reliably

Do not describe AMT as Peitho's selected ensemble runtime until a spike satisfies
the acceptance criteria in [`plan.md`](./plan.md).

## ACE-Step And MLX Research

ACE-Step may be investigated as a high-level blueprint source. It is not a
Session Player and currently has no Peitho adapter. Direct Bun/MLX execution,
quantisation, zero-copy behaviour and performance are unverified.

Keep this research separate from player contracts. A planner may choose player
parameters later; it must not define player output shapes.

## Completion Criteria Per Player

- deterministic output for same request and seed
- no overlapping/invalid notes
- bounded MIDI pitches and timing
- fixed listening fixtures
- Composer adapter without duplicated generation logic
- MIDI export and playback use same note events
- documented ownership and focused tests
