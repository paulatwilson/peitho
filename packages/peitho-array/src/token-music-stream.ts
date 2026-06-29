import { borrowedChordPool, chordPool, keyToPitchClass, normalizeScaleName, voiceChordNear } from "./index";
import {
  type ChordEvent,
  type DisplayScaleName,
  type MacroSettings,
  type NoteEvent,
  type ScaleInput,
} from "./contracts";

const ROOT_OCTAVE_BASE = 48;
const STEPS_PER_BEAT = 4;
const CHORD_UNIT_TO_STEP = 8;

const SCALE_INTERVALS_BY_NAME: Record<string, number[]> = {
  "pentatonic-major": [0, 2, 4, 7, 9],
  "pentatonic-minor": [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  "natural-minor": [0, 2, 3, 5, 7, 8, 10],
};

const QUALITY_BY_SUFFIX: Record<string, number> = {
  "": 1,
  m: 0,
  sus2: 2,
  sus4: 3,
  add9: 4,
  madd9: 4,
  power: 5,
};

const VOICE = {
  pad: 0,
  pulse: 1,
  chime: 2,
  shimmer: 3,
  bass: 4,
  kick: 5,
  snare: 6,
  hat: 7,
  open: 8,
} as const;

export type TokenChord = [o: number, l: number, d: number, x: -1 | 0 | 1, q: number, f?: number[], tn?: number[]];
export type TokenEvent = [t: number, f: number, v: number, l: number, w: number, n?: number];
export type TokenSection = [r: number, o: number, l: number, c: TokenChord[], e: TokenEvent[]];

export type TokenMusicStream = {
  v: 1 | 2;
  i: string;
  r?: string;
  sd: number;
  b: number;
  ts: 44 | 34 | 68;
  a: number;
  k: number;
  m: number[];
  mc?: [number, number, number, number];
  s: TokenSection[];
};

export type EncodeMusicInput = {
  id: string;
  seed: number;
  bpm: number;
  timeSignature: 44 | 34 | 68;
  tuningA4: number;
  key: string;
  scale: ScaleInput;
  macros?: MacroSettings;
  chords: ChordEvent[];
  melody: NoteEvent[];
  counter: NoteEvent[];
  drums: { kick: number[]; snare: number[]; hat: number[]; open: number[] };
};

export type DecodedMusic = {
  seed: number;
  bpm: number;
  timeSignature: 44 | 34 | 68;
  tuningA4: number;
  key: string;
  scale: DisplayScaleName;
  macros?: MacroSettings;
  chords: ChordEvent[];
  melody: NoteEvent[];
  counter: NoteEvent[];
  drums: { kick: number[]; snare: number[]; hat: number[]; open: number[] };
};

const SCALE_LABEL_BY_SLUG: Record<string, DisplayScaleName> = {
  "pentatonic-major": "Pentatonic Major",
  "pentatonic-minor": "Pentatonic Minor",
  major: "Heptatonic Major",
  "natural-minor": "Heptatonic Natural Minor",
};

function nearestIntervalIndex(intervals: number[], target: number): { index: number; offset: -1 | 0 | 1 } {
  let bestIndex = 0;
  let bestDistance = Infinity;
  let bestOffset: -1 | 0 | 1 = 0;

  for (let i = 0; i < intervals.length; i += 1) {
    const diff = target - intervals[i];
    const wrapped = ((diff + 18) % 12) - 6;
    const distance = Math.abs(wrapped);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
      bestOffset = wrapped > 0 ? 1 : wrapped < 0 ? -1 : 0;
    }
  }

  return { index: bestIndex, offset: bestOffset };
}

function midiToFrequency(midi: number, tuningA4: number): number {
  return Math.round(tuningA4 * 2 ** ((midi - 69) / 12) * 1000) / 1000;
}

function frequencyToMidi(frequency: number, tuningA4: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / tuningA4));
}

function noteNameSuffix(name: string, rootName: string): string {
  return name.startsWith(rootName) ? name.slice(rootName.length) : name;
}

function encodeChord(chord: ChordEvent, key: string, scale: ScaleInput): TokenChord {
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const scaleName = normalizeScaleName(scale);
  const intervals = SCALE_INTERVALS_BY_NAME[scaleName];
  const keyPc = keyToPitchClass(key);
  const rootMidi = chord.tones[0] ?? ROOT_OCTAVE_BASE;
  const rootPc = ((rootMidi % 12) + 12) % 12;
  const interval = ((rootPc - keyPc) + 12) % 12;

  const exactIndex = intervals.indexOf(interval);
  const { index, offset } = exactIndex >= 0 ? { index: exactIndex, offset: 0 as const } : nearestIntervalIndex(intervals, interval);

  const rootName = NOTE_NAMES[rootPc];
  const suffix = noteNameSuffix(chord.name, rootName);
  const quality = QUALITY_BY_SUFFIX[suffix] ?? 6;

  const beatOffset = (chord.start * CHORD_UNIT_TO_STEP) / STEPS_PER_BEAT;
  const beatLength = (chord.len * CHORD_UNIT_TO_STEP) / STEPS_PER_BEAT;

  return [beatOffset, beatLength, index, offset, quality, undefined, [...chord.tones]];
}

function decodeChordName(key: string, scale: ScaleInput, tones: number[]): string {
  const pools = [...chordPool(key, scale), ...borrowedChordPool(key, scale)];
  for (const candidate of pools) {
    const voiced = voiceChordNear(candidate, tones[0]);
    if (voiced.tones.length === tones.length && voiced.tones.every((tone, i) => tone === tones[i])) {
      return voiced.name;
    }
  }
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${NOTE_NAMES[((tones[0] ?? 0) % 12 + 12) % 12]}(custom)`;
}

function decodeChord(tuple: TokenChord, key: string, scale: ScaleInput): ChordEvent {
  const [o, l, , , , , tn] = tuple;
  const tones = tn ?? [];
  const start = (o * STEPS_PER_BEAT) / CHORD_UNIT_TO_STEP;
  const len = (l * STEPS_PER_BEAT) / CHORD_UNIT_TO_STEP;
  return { name: decodeChordName(key, scale, tones), start, len, tones };
}

function encodeNoteEvents(notes: NoteEvent[], voice: number, tuningA4: number): TokenEvent[] {
  return notes.map((note) => [
    note.step / STEPS_PER_BEAT,
    midiToFrequency(note.midi, tuningA4),
    note.vel ?? 90,
    note.len / STEPS_PER_BEAT,
    voice,
    note.midi,
  ]);
}

function decodeNoteEvents(events: TokenEvent[], voice: number, tuningA4: number): NoteEvent[] {
  return events
    .filter((event) => event[4] === voice)
    .map((event) => {
      const [t, f, v, l, , n] = event;
      const midi = n ?? frequencyToMidi(f, tuningA4);
      return { step: Math.round(t * STEPS_PER_BEAT), len: Math.round(l * STEPS_PER_BEAT), midi, vel: v };
    });
}

function encodeDrumEvents(drums: EncodeMusicInput["drums"]): TokenEvent[] {
  const out: TokenEvent[] = [];
  (["kick", "snare", "hat", "open"] as const).forEach((kind) => {
    for (const step of drums[kind]) {
      out.push([step / STEPS_PER_BEAT, 0, 100, 1 / STEPS_PER_BEAT, VOICE[kind]]);
    }
  });
  return out;
}

function decodeDrumEvents(events: TokenEvent[]): EncodeMusicInput["drums"] {
  const drums: EncodeMusicInput["drums"] = { kick: [], snare: [], hat: [], open: [] };
  const byVoice: Record<number, keyof EncodeMusicInput["drums"]> = {
    [VOICE.kick]: "kick",
    [VOICE.snare]: "snare",
    [VOICE.hat]: "hat",
    [VOICE.open]: "open",
  };
  for (const event of events) {
    const kind = byVoice[event[4]];
    if (kind) drums[kind].push(Math.round(event[0] * STEPS_PER_BEAT));
  }
  return drums;
}

export function encodeTokenMusicStream(input: EncodeMusicInput): TokenMusicStream {
  const scaleName = normalizeScaleName(input.scale);
  const intervals = SCALE_INTERVALS_BY_NAME[scaleName];
  const k = ROOT_OCTAVE_BASE + keyToPitchClass(input.key);

  const chords = input.chords.map((chord) => encodeChord(chord, input.key, input.scale));
  const events = [
    ...encodeNoteEvents(input.melody, VOICE.pulse, input.tuningA4),
    ...encodeNoteEvents(input.counter, VOICE.chime, input.tuningA4),
    ...encodeDrumEvents(input.drums),
  ];

  const lastChordEnd = input.chords.reduce((max, chord) => Math.max(max, chord.start + chord.len), 0);
  const sectionLengthBeats = (lastChordEnd * CHORD_UNIT_TO_STEP) / STEPS_PER_BEAT;

  const section: TokenSection = [1, 0, sectionLengthBeats, chords, events];

  const stream: TokenMusicStream = {
    v: 2,
    i: input.id,
    sd: input.seed,
    b: input.bpm,
    ts: input.timeSignature,
    a: input.tuningA4,
    k,
    m: intervals,
    s: [section],
  };

  if (input.macros) {
    stream.mc = [input.macros.density, input.macros.split, input.macros.sync, input.macros.rhythm];
  }

  return stream;
}

export function decodeTokenMusicStream(stream: TokenMusicStream): DecodedMusic {
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const keyPc = ((stream.k % 12) + 12) % 12;
  const key = NOTE_NAMES[keyPc];

  const scaleSlug = Object.keys(SCALE_INTERVALS_BY_NAME).find(
    (slug) => SCALE_INTERVALS_BY_NAME[slug].length === stream.m.length && SCALE_INTERVALS_BY_NAME[slug].every((n, i) => n === stream.m[i]),
  );
  const scale = SCALE_LABEL_BY_SLUG[scaleSlug ?? "pentatonic-major"];

  const section = stream.s[0];
  const chords = section ? section[3].map((tuple) => decodeChord(tuple, key, scale)) : [];
  const events = section ? section[4] : [];

  return {
    seed: stream.sd,
    bpm: stream.b,
    timeSignature: stream.ts,
    tuningA4: stream.a,
    key,
    scale,
    macros: stream.mc ? { density: stream.mc[0], split: stream.mc[1], sync: stream.mc[2], rhythm: stream.mc[3] } : undefined,
    chords,
    melody: decodeNoteEvents(events, VOICE.pulse, stream.a),
    counter: decodeNoteEvents(events, VOICE.chime, stream.a),
    drums: decodeDrumEvents(events),
  };
}
