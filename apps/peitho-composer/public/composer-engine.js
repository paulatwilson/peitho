(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toCommonJS = (from) => {
    var entry = (__moduleCache ??= new WeakMap).get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function") {
      for (var key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(entry, key))
          __defProp(entry, key, {
            get: __accessProp.bind(from, key),
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
          });
    }
    __moduleCache.set(from, entry);
    return entry;
  };
  var __moduleCache;
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // apps/peitho-composer/src/composer-engine.ts
  var exports_composer_engine = {};
  __export(exports_composer_engine, {
    ComposerEngine: () => ComposerEngine
  });

  // packages/peitho-array/src/progression-seeds.ts
  var ROMAN_DEGREES = ["I", "II", "III", "IV", "V", "VI", "VII"];
  var ROMAN_PATTERN = /^([b#]?)(VII|III|II|VI|IV|V|I|vii|iii|ii|vi|iv|v|i)([°+]?)$/;
  var NOTE_TO_PITCH_CLASS = {
    C: 0,
    "C#": 1,
    Db: 1,
    D: 2,
    "D#": 3,
    Eb: 3,
    E: 4,
    Fb: 4,
    "E#": 5,
    F: 5,
    "F#": 6,
    Gb: 6,
    G: 7,
    "G#": 8,
    Ab: 8,
    A: 9,
    "A#": 10,
    Bb: 10,
    B: 11,
    Cb: 11
  };
  var PITCH_CLASS_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  var DEGREE_INTERVALS = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10]
  };
  function pitchClass(note) {
    const value = NOTE_TO_PITCH_CLASS[note];
    if (value == null)
      throw new Error(`Unknown note name: ${note}`);
    return value;
  }
  function parseRomanDegree(token) {
    const match = token.trim().match(ROMAN_PATTERN);
    if (!match)
      return null;
    const numeral = match[2];
    const degree = ROMAN_DEGREES.indexOf(numeral.toUpperCase()) + 1;
    if (degree === 0)
      return null;
    return {
      accidental: match[1] === "b" ? -1 : match[1] === "#" ? 1 : 0,
      degree,
      quality: match[3] === "°" ? "diminished" : match[3] === "+" ? "augmented" : numeral === numeral.toLowerCase() ? "minor" : "major"
    };
  }
  function romanToChordSymbols(degrees, key, mode) {
    const tonic = pitchClass(key);
    return degrees.map((token) => {
      const parsed = parseRomanDegree(token);
      if (!parsed)
        throw new Error(`Invalid Roman degree: ${token}`);
      const root = tonic + DEGREE_INTERVALS[mode][parsed.degree - 1] + parsed.accidental;
      const name = PITCH_CLASS_NAMES[(root + 12) % 12];
      const suffix = parsed.quality === "minor" ? "m" : parsed.quality === "diminished" ? "dim" : parsed.quality === "augmented" ? "aug" : "";
      return `${name}${suffix}`;
    });
  }

  // packages/peitho-array/src/index.ts
  var ARRAY_CHORD_RUNTIME_PROFILE = {
    model: "conditional_small",
    candidateCount: 2,
    cadencePolicy: "reject",
    scalePolicy: "strict",
    chordCounts: [8, 16],
    allowImmediateRepeat: false
  };
  var DEFAULT_CHORD_LENGTHS = [1, 1, 2, 2, 2, 3, 4];
  var DEFAULT_EXTENSION_PROBABILITY = 0.35;
  var DEFAULT_PROGRESSION_PROFILE = {
    start: "any",
    cadence: "none",
    tension: 0.5,
    repetition: 0.5
  };
  var DEFAULT_SEGMENT_PROFILE = { density: 1, register: 0, length: 1, sync: 0 };
  var DEFAULT_OPTION_PROFILE = { envelope: "sparse", length: 1.6 };
  var HEPTATONIC_INTERVALS = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10]
  };
  var MAJOR_DEGREE_ROLES = [
    "tonic",
    "predominant",
    "colour",
    "predominant",
    "dominant",
    "tonic",
    "dominant"
  ];
  var MINOR_DEGREE_ROLES = [
    "tonic",
    "predominant",
    "colour",
    "predominant",
    "dominant",
    "tonic",
    "dominant"
  ];
  var MAJOR_DEGREE_SUFFIXES = ["", "m", "m", "", "", "m", "dim"];
  var MINOR_DEGREE_SUFFIXES = ["m", "dim", "", "m", "m", "", ""];
  var ROLE_TRANSITION_WEIGHTS = {
    tonic: {
      tonic: 0.7,
      predominant: 1.25,
      dominant: 1,
      colour: 0.8
    },
    predominant: {
      tonic: 0.55,
      predominant: 0.45,
      dominant: 1.55,
      colour: 0.85
    },
    dominant: {
      tonic: 1.55,
      predominant: 0.45,
      dominant: 0.35,
      colour: 0.75
    },
    colour: {
      tonic: 1.15,
      predominant: 1,
      dominant: 0.95,
      colour: 0.45
    }
  };
  var PHRASE_ROLE_WEIGHTS = {
    statement: { tonic: 1.7, predominant: 0.65, dominant: 0.55, colour: 0.9 },
    preparation: { tonic: 0.6, predominant: 1.7, dominant: 0.8, colour: 1 },
    extension: { tonic: 0.8, predominant: 1, dominant: 1.15, colour: 1.35 },
    antecedent: { tonic: 0.45, predominant: 0.8, dominant: 1.8, colour: 1 },
    consequent: { tonic: 1.8, predominant: 0.6, dominant: 0.5, colour: 0.8 }
  };
  var SCALE_INTERVALS = {
    "pentatonic-major": [0, 2, 4, 7, 9],
    "pentatonic-minor": [0, 3, 5, 7, 10],
    major: [0, 2, 4, 5, 7, 9, 11],
    "natural-minor": [0, 2, 3, 5, 7, 8, 10]
  };
  var NOTE_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
  ];
  var KEYS = NOTE_NAMES;
  var SCALE_LABELS = [
    "Pentatonic Major",
    "Pentatonic Minor",
    "Heptatonic Major",
    "Heptatonic Natural Minor"
  ];
  var SCALE_SLUGS_BY_LABEL = {
    "Pentatonic Major": "pentatonic-major",
    "Pentatonic Minor": "pentatonic-minor",
    "Heptatonic Major": "major",
    "Heptatonic Natural Minor": "natural-minor"
  };
  var DRUM_PATTERNS = [
    "Basic 8th-Note",
    "Four-on-the-Floor",
    "Syncopated",
    "Slow-Burn & 6/8 Fills",
    "Gated-Reverb Drive",
    "Driving 16th Open Hat"
  ];
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function createRng(seed) {
    let value = seed >>> 0;
    return () => {
      value = value + 1831565813 | 0;
      let next = Math.imul(value ^ value >>> 15, 1 | value);
      next = next + Math.imul(next ^ next >>> 7, 61 | next) ^ next;
      return ((next ^ next >>> 14) >>> 0) / 4294967296;
    };
  }
  function keyToPitchClass(key) {
    const index = NOTE_NAMES.indexOf(key);
    if (index === -1)
      throw new Error(`Unknown key: ${key}`);
    return index;
  }
  function normalizeScaleName(scale) {
    return SCALE_SLUGS_BY_LABEL[scale] ?? scale;
  }
  function scaleMidi(key, scale, lo, hi) {
    const root = keyToPitchClass(key);
    const scaleName = normalizeScaleName(scale);
    const intervals = new Set(SCALE_INTERVALS[scaleName].map((n) => (n + root) % 12));
    const notes = [];
    for (let midi = lo;midi <= hi; midi += 1) {
      if (intervals.has(midi % 12))
        notes.push(midi);
    }
    return notes;
  }
  function harmonicScale(scale) {
    const scaleName = normalizeScaleName(scale);
    return scaleName === "pentatonic-minor" || scaleName === "natural-minor" ? HEPTATONIC_INTERVALS.minor : HEPTATONIC_INTERVALS.major;
  }
  function chordDegreeMetadata(scale) {
    const scaleName = normalizeScaleName(scale);
    const isMinor = scaleName === "pentatonic-minor" || scaleName === "natural-minor";
    const harmony = harmonicScale(scaleName);
    const roles = isMinor ? MINOR_DEGREE_ROLES : MAJOR_DEGREE_ROLES;
    const suffixes = isMinor ? MINOR_DEGREE_SUFFIXES : MAJOR_DEGREE_SUFFIXES;
    return harmony.map((semitone, degree) => ({
      degree,
      semitone,
      role: roles[degree],
      suffix: suffixes[degree]
    }));
  }
  function pickWeightedDegree(candidates, weights, rng) {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let pick = rng() * total;
    for (let index = 0;index < weights.length; index += 1) {
      pick -= weights[index];
      if (pick <= 0)
        return candidates[index].degree;
    }
    return candidates.at(-1).degree;
  }
  function harmonicPhraseRole(index, finalIndex, cadence) {
    if (index === 0)
      return "statement";
    if ((cadence === "strong" || cadence === "soft") && index === finalIndex)
      return "consequent";
    if (cadence === "strong" && index === finalIndex - 1)
      return "antecedent";
    if (cadence === "soft" && index === finalIndex - 1)
      return "preparation";
    return ["statement", "preparation", "extension", "antecedent"][index % 4];
  }
  function weightedDegree(degrees, previous, rng, profile, phraseRole, motifReference, allowedRoles) {
    const candidates = allowedRoles ? degrees.filter((degree) => allowedRoles.includes(degree.role)) : degrees;
    if (!previous)
      return candidates[Math.floor(rng() * candidates.length)].degree;
    const tension = clamp(profile.tension, 0, 1);
    const repetition = clamp(profile.repetition, 0, 1);
    const weights = candidates.map((degree) => {
      const roleWeight = ROLE_TRANSITION_WEIGHTS[previous.role][degree.role];
      const phraseWeight = PHRASE_ROLE_WEIGHTS[phraseRole][degree.role];
      const tensionWeight = degree.role === "dominant" || degree.role === "colour" ? 0.75 + tension : 1.25 - tension * 0.5;
      const repeatWeight = degree.degree === previous.degree ? 0.35 + repetition * 5.65 : 1;
      const motifWeight = degree.degree === motifReference?.degree ? 0.5 + repetition * 4.5 : 1;
      const rootWeight = degree.degree === 0 ? 0.7 + repetition * 1.3 : 1;
      return roleWeight * phraseWeight * tensionWeight * repeatWeight * motifWeight * rootWeight;
    });
    return pickWeightedDegree(candidates, weights, rng);
  }
  function loopCadenceDegree(degrees, previous, opening, rng, profile) {
    const tension = clamp(profile.tension, 0, 1);
    const repetition = clamp(profile.repetition, 0, 1);
    const returningDegrees = degrees.filter((degree) => {
      if (degree.degree === opening.degree)
        return false;
      if (opening.role === "tonic")
        return degree.role === "dominant";
      return ROLE_TRANSITION_WEIGHTS[degree.role][opening.role] >= 1;
    });
    const candidates = returningDegrees.length > 0 ? returningDegrees : degrees.filter((degree) => degree !== opening);
    const weights = candidates.map((degree) => {
      const fromPrevious = previous ? ROLE_TRANSITION_WEIGHTS[previous.role][degree.role] : 1;
      const toOpening = ROLE_TRANSITION_WEIGHTS[degree.role][opening.role];
      const tensionWeight = degree.role === "dominant" || degree.role === "colour" ? 0.75 + tension : 1.25 - tension * 0.5;
      const repeatWeight = degree.degree === previous?.degree ? 0.65 + repetition * 1.35 : 1;
      const openingWeight = degree.degree === opening.degree ? 0.15 + repetition * 0.5 : 1;
      return fromPrevious * toOpening * toOpening * tensionWeight * repeatWeight * openingWeight;
    });
    return pickWeightedDegree(candidates, weights, rng);
  }
  function cadenceDegree(index, finalIndex, degrees, previous, opening, profile, phraseRole, motifReference, rng) {
    if (profile.cadence === "none")
      return null;
    if (profile.cadence === "strong") {
      if (index === finalIndex)
        return 0;
      if (index === finalIndex - 1)
        return 4;
    }
    if (profile.cadence === "soft") {
      if (index === finalIndex)
        return 0;
      if (index === finalIndex - 1) {
        return weightedDegree(degrees, previous, rng, profile, phraseRole, motifReference, ["predominant", "colour"]);
      }
    }
    if (profile.cadence === "loop" && index === finalIndex && opening) {
      return loopCadenceDegree(degrees, previous, opening, rng, profile);
    }
    return null;
  }
  function stackedScaleTone(tonic, harmony, degree, stackOffset) {
    const scaleIndex = degree + stackOffset;
    return tonic + harmony[scaleIndex % harmony.length] + Math.floor(scaleIndex / harmony.length) * 12;
  }
  function seventhSuffix(triadSuffix, root, seventh) {
    if (triadSuffix === "dim")
      return "m7b5";
    const interval = seventh - root;
    if (triadSuffix === "m")
      return interval === 11 ? "m(maj7)" : "m7";
    return interval === 11 ? "maj7" : "7";
  }
  function chordPool(key, scale) {
    const root = keyToPitchClass(key);
    const harmony = harmonicScale(scale);
    const roots = SCALE_INTERVALS[normalizeScaleName(scale)];
    const tonic = 48 + root;
    const out = [];
    for (const rootStep of roots) {
      const degreeIndex = harmony.indexOf(rootStep);
      if (degreeIndex === -1)
        continue;
      const third = harmony[(degreeIndex + 2) % harmony.length] + (degreeIndex + 2 >= harmony.length ? 12 : 0);
      const fifth = harmony[(degreeIndex + 4) % harmony.length] + (degreeIndex + 4 >= harmony.length ? 12 : 0);
      const seventh = harmony[(degreeIndex + 6) % harmony.length] + (degreeIndex + 6 >= harmony.length ? 12 : 0);
      const second = harmony[(degreeIndex + 1) % harmony.length] + (degreeIndex + 1 >= harmony.length ? 12 : 0);
      const thirdInterval = third - rootStep;
      const fifthInterval = fifth - rootStep;
      const seventhInterval = seventh - rootStep;
      const secondInterval = second - rootStep;
      const rootName = NOTE_NAMES[(root + rootStep) % 12];
      const base = thirdInterval === 4 ? "" : thirdInterval === 3 ? "m" : thirdInterval <= 2 ? "sus2" : "sus4";
      const fifthQuality = fifthInterval === 6 ? "b5" : fifthInterval === 8 ? "#5" : "";
      const triad = [tonic + rootStep, tonic + third, tonic + fifth];
      out.push({ name: `${rootName}${base}${fifthQuality}`, tones: triad });
      if ((base === "" || base === "m") && fifthQuality === "") {
        let seventhSuffix2 = null;
        if (seventhInterval === 11)
          seventhSuffix2 = base === "" ? "maj7" : "m(maj7)";
        else if (seventhInterval === 10)
          seventhSuffix2 = base === "" ? "7" : "m7";
        if (seventhSuffix2) {
          out.push({
            name: `${rootName}${seventhSuffix2}`,
            tones: [tonic + rootStep, tonic + third, tonic + fifth, tonic + seventh]
          });
        }
        out.push({
          name: `${rootName}${base}add9`,
          tones: [tonic + rootStep, tonic + third, tonic + fifth, tonic + rootStep + secondInterval + 12]
        });
      } else if (fifthQuality === "b5") {
        out.push({
          name: `${rootName}m7b5`,
          tones: [tonic + rootStep, tonic + third, tonic + fifth, tonic + seventh]
        });
      }
    }
    return out;
  }
  function generateChords(options) {
    const root = keyToPitchClass(options.key);
    const scaleName = normalizeScaleName(options.scale);
    const harmony = harmonicScale(scaleName);
    const degrees = chordDegreeMetadata(scaleName);
    const rng = options.seed == null ? Math.random : createRng(options.seed);
    const lengths = options.chordLengths ?? DEFAULT_CHORD_LENGTHS;
    const extensionProbability = options.extensionProbability ?? DEFAULT_EXTENSION_PROBABILITY;
    const progressionProfile = {
      ...DEFAULT_PROGRESSION_PROFILE,
      ...options.progressionProfile
    };
    const totalHalfBars = (options.bars ?? 8) * 2;
    const segments = [];
    const chordCount = options.chordCount;
    if (chordCount != null) {
      if (!Number.isInteger(chordCount) || chordCount < 1 || chordCount > totalHalfBars) {
        throw new Error(`chordCount must be an integer from 1 to ${totalHalfBars}`);
      }
      segments.push(...Array.from({ length: chordCount }, () => 1));
      for (let remaining = totalHalfBars - chordCount;remaining > 0; remaining -= 1) {
        segments[Math.floor(rng() * segments.length)] += 1;
      }
    } else {
      let remaining = totalHalfBars;
      while (remaining > 0) {
        let length = lengths[Math.floor(rng() * lengths.length)];
        if (length > remaining)
          length = remaining;
        segments.push(length);
        remaining -= length;
      }
    }
    let start = 0;
    let previousDegree = null;
    let openingDegree = null;
    const degreeHistory = [];
    const finalSegmentIndex = segments.length - 1;
    return segments.map((len, index) => {
      const phraseRole = harmonicPhraseRole(index, finalSegmentIndex, progressionProfile.cadence);
      const motifReference = degreeHistory.at(-4) ?? degreeHistory.at(-2) ?? null;
      const cadence = cadenceDegree(index, finalSegmentIndex, degrees, previousDegree, openingDegree, progressionProfile, phraseRole, motifReference, rng);
      const degree = cadence ?? (index === 0 && progressionProfile.start === "tonic" ? 0 : weightedDegree(degrees, previousDegree, rng, progressionProfile, phraseRole, motifReference));
      const degreeMeta = degrees[degree];
      if (index === 0)
        openingDegree = degreeMeta;
      previousDegree = degreeMeta;
      degreeHistory.push(degreeMeta);
      const semitone = degreeMeta.semitone;
      const noteName = NOTE_NAMES[(root + semitone) % 12];
      let suffix = degreeMeta.suffix;
      const tonic = 48 + root;
      const tones = [
        stackedScaleTone(tonic, harmony, degree, 0),
        stackedScaleTone(tonic, harmony, degree, 2),
        stackedScaleTone(tonic, harmony, degree, 4)
      ];
      const isMinorStrongDominant = (scaleName === "natural-minor" || scaleName === "pentatonic-minor") && progressionProfile.cadence === "strong" && index === finalSegmentIndex - 1 && degree === 4;
      if (isMinorStrongDominant) {
        tones[1] += 1;
        suffix = "";
      }
      if (rng() < extensionProbability) {
        const seventh = stackedScaleTone(tonic, harmony, degree, 6);
        tones.push(seventh);
        suffix = seventhSuffix(suffix, tones[0], seventh);
      }
      const chord = { name: `${noteName}${suffix}`, len, start, tones };
      start += len;
      return chord;
    });
  }
  function resolveSegmentProfile(profile) {
    return { ...DEFAULT_SEGMENT_PROFILE, ...profile };
  }
  function resolveOptionProfile(profile) {
    return { ...DEFAULT_OPTION_PROFILE, ...profile };
  }
  function envelopeProfile(profile) {
    const envelope = profile.envelope;
    if (envelope === "rise") {
      return { envelope: (bar, bars) => 0.45 + bar / Math.max(1, bars - 1) * 1, length: profile.length };
    }
    if (envelope === "fall") {
      return { envelope: (bar, bars) => 1.25 - bar / Math.max(1, bars - 1) * 0.9, length: profile.length };
    }
    if (envelope === "swell") {
      return {
        envelope: (bar, bars) => 0.5 + Math.sin(bar / Math.max(1, bars - 1) * Math.PI) * 0.7,
        length: profile.length
      };
    }
    if (envelope === "alternate") {
      return { envelope: (bar) => 0.85 + bar % 2 * 0.25, length: profile.length };
    }
    if (envelope === "flat") {
      return { envelope: () => 1, length: profile.length };
    }
    return { envelope: () => 0.62, length: profile.length };
  }
  function generateMono(options) {
    const segment = resolveSegmentProfile(options.segmentProfile);
    const option = envelopeProfile(resolveOptionProfile(options.optionProfile));
    const steps = options.steps ?? 128;
    const stepsPerBar = options.stepsPerBar ?? 16;
    const bars = Math.max(1, Math.ceil(steps / stepsPerBar));
    const lo = options.register[0] + segment.register;
    const hi = options.register[1] + segment.register;
    const rng = createRng(options.seed);
    const notes = scaleMidi(options.key, options.scale, lo, hi);
    if (!notes.length)
      return [];
    const baseDensity = Math.max(0.05, options.density * options.sparse);
    const syncEffect = clamp(options.sync + segment.sync, 0, 1.2);
    const out = [];
    let noteIndex = Math.floor(rng() * notes.length);
    let step = 0;
    while (step < steps) {
      const bar = Math.floor(step / stepsPerBar);
      const envelope = option.envelope(bar, bars);
      const isDown = step % 4 === 0;
      const isBeat = step % 2 === 0;
      let probability = baseDensity * envelope * segment.density;
      if (isDown)
        probability *= 1.15;
      else if (isBeat)
        probability *= 0.75 * (0.6 + syncEffect);
      else
        probability *= 0.5 * (0.3 + syncEffect) * (0.5 + options.rhythm);
      if (options.counter)
        probability *= 0.7;
      if (rng() < probability) {
        noteIndex += Math.round(rng() * 4 - 2);
        noteIndex = clamp(noteIndex, 0, notes.length - 1);
        let length = [1, 1, 2, 2, 3, 4][Math.floor(rng() * 6)];
        length = Math.max(1, Math.round(length * (1.2 - options.density * 0.4) * segment.length * option.length));
        const velocity = Math.round(clamp((isDown ? 104 : isBeat ? 88 : 72) * (0.7 + 0.3 * envelope) + (rng() * 16 - 8), 35, 122));
        out.push({ step, len: length, midi: notes[noteIndex], vel: velocity });
        step += length;
      } else {
        step += 1;
      }
    }
    return out;
  }
  function generateDrums(pattern, bars = 8, stepsPerBar = 16) {
    const kick = [];
    const snare = [];
    const hat = [];
    const open = [];
    for (let bar = 0;bar < bars; bar += 1) {
      const offset = bar * stepsPerBar;
      const fill = bar % 4 === 3;
      if (pattern === "Basic 8th-Note") {
        kick.push(offset, offset + 8);
        snare.push(offset + 4, offset + 12);
        for (let i = 0;i < stepsPerBar; i += 2)
          hat.push(offset + i);
      } else if (pattern === "Four-on-the-Floor") {
        kick.push(offset, offset + 4, offset + 8, offset + 12);
        snare.push(offset + 4, offset + 12);
        for (let i = 0;i < stepsPerBar; i += 2)
          hat.push(offset + i);
        for (let i = 2;i < stepsPerBar; i += 4)
          open.push(offset + i);
      } else if (pattern === "Syncopated") {
        kick.push(offset, offset + 6, offset + 10);
        snare.push(offset + 4, offset + 12);
        if (bar % 2)
          snare.push(offset + 14);
        for (let i = 0;i < stepsPerBar; i += 2)
          hat.push(offset + i);
        hat.push(offset + 7, offset + 15);
      } else if (pattern === "Slow-Burn & 6/8 Fills") {
        kick.push(offset, offset + 9);
        snare.push(offset + 6);
        [0, 3, 6, 9, 12, 15].forEach((i) => hat.push(offset + i));
        if (fill)
          snare.push(offset + 10, offset + 12, offset + 14);
      } else if (pattern === "Gated-Reverb Drive") {
        kick.push(offset, offset + 8, offset + 11);
        snare.push(offset + 4, offset + 12);
        for (let i = 0;i < stepsPerBar; i += 2)
          hat.push(offset + i);
      } else if (pattern === "Driving 16th Open Hat") {
        kick.push(offset, offset + 8);
        snare.push(offset + 4, offset + 12);
        for (let i = 0;i < stepsPerBar; i += 1)
          hat.push(offset + i);
        for (let i = 2;i < stepsPerBar; i += 4)
          open.push(offset + i);
      }
    }
    return { kick, snare, hat, open };
  }
  function waveformBins(notes, bins, steps = 128) {
    const values = new Array(bins).fill(0);
    for (const note of notes) {
      const firstBin = Math.floor(note.step / steps * bins);
      const lastBin = Math.floor((note.step + note.len) / steps * bins);
      for (let bin = firstBin;bin <= Math.min(bins - 1, lastBin); bin += 1) {
        values[bin] += 1;
      }
    }
    const max = Math.max(1, ...values);
    return values.map((value, index) => {
      const base = value / max;
      const jitter = base > 0 ? 0.16 * Math.abs(Math.sin(index * 1.7)) : 0;
      return Math.min(1, base * 0.88 + jitter);
    });
  }
  function variableLengthQuantity(value) {
    const bytes = [value & 127];
    let next = value >> 7;
    while (next > 0) {
      bytes.unshift(next & 127 | 128);
      next >>= 7;
    }
    return bytes;
  }
  function buildMidi(tempo, tracks) {
    const ticksPerStep = 120;
    const u16 = (value) => [value >> 8 & 255, value & 255];
    const u32 = (value) => [value >>> 24 & 255, value >> 16 & 255, value >> 8 & 255, value & 255];
    const chunks = [];
    const microsecondsPerBeat = Math.round(60000000 / tempo);
    let tempoTrack = [];
    tempoTrack = tempoTrack.concat(variableLengthQuantity(0), [255, 81, 3, microsecondsPerBeat >> 16 & 255, microsecondsPerBeat >> 8 & 255, microsecondsPerBeat & 255], variableLengthQuantity(0), [255, 47, 0]);
    chunks.push(tempoTrack);
    for (const track of tracks) {
      const events = [];
      for (const note of track.notes) {
        events.push({ time: note.step * ticksPerStep, status: 144, note: note.midi, velocity: note.vel ?? 90 });
        events.push({
          time: (note.step + Math.max(1, note.len)) * ticksPerStep,
          status: 128,
          note: note.midi,
          velocity: 0
        });
      }
      events.sort((left, right) => left.time - right.time || left.status - right.status);
      let bytes = [];
      let lastTime = 0;
      for (const event of events) {
        bytes = bytes.concat(variableLengthQuantity(event.time - lastTime), [
          event.status | track.channel,
          event.note,
          event.velocity
        ]);
        lastTime = event.time;
      }
      bytes = bytes.concat(variableLengthQuantity(0), [255, 47, 0]);
      chunks.push(bytes);
    }
    let midi = [77, 84, 104, 100].concat(u32(6), u16(1), u16(chunks.length), u16(480));
    for (const chunk of chunks) {
      midi = midi.concat([77, 84, 114, 107], u32(chunk.length), chunk);
    }
    return new Uint8Array(midi);
  }
  // apps/peitho-composer/src/direction-presets.json
  var direction_presets_default = {
    chordDirections: {
      typeDefaults: {
        Ballad: { start: "tonic", cadence: "soft", tension: 0.35, repetition: 0.5, scalePolicy: "cadential", model: "conditional_medium", candidateCount: 4, cadencePolicy: "repair" },
        Pop: { start: "tonic", cadence: "strong", tension: 0.45, repetition: 0.75, scalePolicy: "strict", model: "conditional_medium", candidateCount: 4, cadencePolicy: "repair" },
        Cinematic: { start: "tonic", cadence: "strong", tension: 0.7, repetition: 0.35, scalePolicy: "chromatic", model: "conditional_large", candidateCount: 6, cadencePolicy: "reject" },
        "Lo-Fi": { start: "any", cadence: "loop", tension: 0.3, repetition: 0.7, scalePolicy: "cadential", model: "conditional_medium", candidateCount: 4, cadencePolicy: "reject" },
        Ambient: { start: "any", cadence: "loop", tension: 0.25, repetition: 0.65, scalePolicy: "cadential", model: "conditional_medium", candidateCount: 4, cadencePolicy: "reject" },
        "New Wave": { start: "tonic", cadence: "loop", tension: 0.55, repetition: 0.75, scalePolicy: "cadential", model: "conditional_medium", candidateCount: 4, cadencePolicy: "repair" },
        Electropop: { start: "tonic", cadence: "strong", tension: 0.55, repetition: 0.8, scalePolicy: "strict", model: "conditional_medium", candidateCount: 4, cadencePolicy: "repair" },
        Classical: { start: "tonic", cadence: "strong", tension: 0.5, repetition: 0.35, scalePolicy: "strict", model: "conditional_large", candidateCount: 6, cadencePolicy: "reject" },
        Jazz: { start: "any", cadence: "soft", tension: 0.65, repetition: 0.35, scalePolicy: "chromatic", model: "conditional_large", candidateCount: 6, cadencePolicy: "reject" },
        Funk: { start: "tonic", cadence: "loop", tension: 0.55, repetition: 0.8, scalePolicy: "cadential", model: "conditional_medium", candidateCount: 4, cadencePolicy: "repair" },
        "R&B": { start: "tonic", cadence: "soft", tension: 0.5, repetition: 0.55, scalePolicy: "chromatic", model: "conditional_medium", candidateCount: 4, cadencePolicy: "reject" },
        House: { start: "tonic", cadence: "loop", tension: 0.6, repetition: 0.85, scalePolicy: "strict", model: "conditional_small", candidateCount: 4, cadencePolicy: "repair" },
        Synth: { start: "any", cadence: "loop", tension: 0.55, repetition: 0.65, scalePolicy: "cadential", model: "conditional_medium", candidateCount: 4, cadencePolicy: "repair" },
        Folk: { start: "tonic", cadence: "soft", tension: 0.3, repetition: 0.65, scalePolicy: "strict", model: "conditional_medium", candidateCount: 4, cadencePolicy: "repair" },
        Rock: { start: "tonic", cadence: "strong", tension: 0.6, repetition: 0.7, scalePolicy: "cadential", model: "conditional_medium", candidateCount: 4, cadencePolicy: "repair" },
        Punk: { start: "tonic", cadence: "strong", tension: 0.7, repetition: 0.8, scalePolicy: "strict", model: "conditional_small", candidateCount: 4, cadencePolicy: "repair" },
        "Post-Rock": { start: "tonic", cadence: "strong", tension: 0.65, repetition: 0.45, scalePolicy: "chromatic", model: "conditional_large", candidateCount: 6, cadencePolicy: "reject" },
        Darkwave: { start: "tonic", cadence: "loop", tension: 0.75, repetition: 0.7, scalePolicy: "chromatic", model: "conditional_medium", candidateCount: 4, cadencePolicy: "reject" }
      },
      segmentModifiers: {
        Intro: { cadence: "none", tensionShift: -0.2, repetitionShift: 0.1, chordLengthScale: 1.25, extensionShift: -0.1, cadencePolicyOverride: "reject", candidateCountShift: 0 },
        Verse: { cadence: "none", tensionShift: -0.05, repetitionShift: 0.05, chordLengthScale: 1, extensionShift: 0, cadencePolicyOverride: null, candidateCountShift: 0 },
        "Pre-Chorus": { cadence: "none", tensionShift: 0.15, repetitionShift: -0.05, chordLengthScale: 0.85, extensionShift: 0.05, cadencePolicyOverride: "repair", candidateCountShift: 0 },
        Build: { cadence: "none", tensionShift: 0.25, repetitionShift: -0.1, chordLengthScale: 0.75, extensionShift: 0.05, cadencePolicyOverride: "repair", candidateCountShift: 1 },
        Chorus: { cadence: "strong", tensionShift: 0.05, repetitionShift: 0.1, chordLengthScale: 1, extensionShift: 0.05, cadencePolicyOverride: "repair", candidateCountShift: 2 },
        Hook: { cadence: "loop", tensionShift: 0.1, repetitionShift: 0.2, chordLengthScale: 0.8, extensionShift: 0, cadencePolicyOverride: "repair", candidateCountShift: 2 },
        Drop: { cadence: "loop", tensionShift: 0.2, repetitionShift: 0.25, chordLengthScale: 0.7, extensionShift: -0.15, cadencePolicyOverride: "repair", candidateCountShift: 0 },
        Bridge: { cadence: "soft", tensionShift: 0.1, repetitionShift: -0.15, chordLengthScale: 1, extensionShift: 0.1, cadencePolicyOverride: "reject", candidateCountShift: 2 },
        Solo: { cadence: "none", tensionShift: 0.15, repetitionShift: -0.2, chordLengthScale: 0.75, extensionShift: 0.1, cadencePolicyOverride: "reject", candidateCountShift: 1 },
        "Middle-Eight": { cadence: "soft", tensionShift: 0.2, repetitionShift: -0.15, chordLengthScale: 0.85, extensionShift: 0.1, cadencePolicyOverride: "reject", candidateCountShift: 2 },
        Interlude: { cadence: "loop", tensionShift: -0.15, repetitionShift: 0.1, chordLengthScale: 1.3, extensionShift: 0.15, cadencePolicyOverride: "reject", candidateCountShift: 0 },
        Breakdown: { cadence: "none", tensionShift: -0.1, repetitionShift: 0.2, chordLengthScale: 1.4, extensionShift: -0.1, cadencePolicyOverride: "reject", candidateCountShift: 0 },
        Outro: { cadence: "strong", tensionShift: -0.1, repetitionShift: 0.1, chordLengthScale: 1.2, extensionShift: 0.05, cadencePolicyOverride: "repair", candidateCountShift: 0 }
      },
      optionModifiers: {
        "Rousing Crescendo": { cadence: "strong", tensionShift: 0.25, repetitionShift: -0.1, chordLengthScale: 0.75, extensionShift: 0.15, cadencePolicyOverride: "repair", candidateCountShift: 2 },
        "Moody Wind Down": { cadence: "soft", tensionShift: -0.2, repetitionShift: 0.1, chordLengthScale: 1.25, extensionShift: 0.05, cadencePolicyOverride: "reject", candidateCountShift: 1 },
        "Gentle Swell": { cadence: "soft", tensionShift: -0.1, repetitionShift: 0.05, chordLengthScale: 1.15, extensionShift: 0.1, cadencePolicyOverride: "reject", candidateCountShift: 1 },
        "Steady Groove": { cadence: "loop", tensionShift: 0, repetitionShift: 0.2, chordLengthScale: 0.9, extensionShift: -0.05, cadencePolicyOverride: "repair", candidateCountShift: 0 },
        "Sparse Reflection": { cadence: "none", tensionShift: -0.2, repetitionShift: 0.1, chordLengthScale: 1.5, extensionShift: -0.1, cadencePolicyOverride: "reject", candidateCountShift: 0 },
        "Driving Pulse": { cadence: "loop", tensionShift: 0.15, repetitionShift: 0.3, chordLengthScale: 0.7, extensionShift: -0.1, cadencePolicyOverride: "repair", candidateCountShift: 0 },
        "Tension Lift": { cadence: "none", tensionShift: 0.3, repetitionShift: -0.15, chordLengthScale: 0.8, extensionShift: 0.1, cadencePolicyOverride: "reject", candidateCountShift: 2 },
        "Release Drop": { cadence: "strong", tensionShift: -0.2, repetitionShift: 0.1, chordLengthScale: 1.1, extensionShift: 0, cadencePolicyOverride: "repair", candidateCountShift: 0 },
        "Nocturne Drift": { cadence: "loop", tensionShift: -0.1, repetitionShift: 0.05, chordLengthScale: 1.25, extensionShift: 0.15, cadencePolicyOverride: "reject", candidateCountShift: 1 },
        "Angular Push": { cadence: "none", tensionShift: 0.2, repetitionShift: -0.2, chordLengthScale: 0.65, extensionShift: -0.05, cadencePolicyOverride: "reject", candidateCountShift: 2 },
        "Anthem Rise": { cadence: "strong", tensionShift: 0.2, repetitionShift: 0.05, chordLengthScale: 0.8, extensionShift: 0.05, cadencePolicyOverride: "repair", candidateCountShift: 2 },
        "Minimal Loop": { cadence: "loop", tensionShift: -0.1, repetitionShift: 0.35, chordLengthScale: 1.1, extensionShift: -0.2, cadencePolicyOverride: "repair", candidateCountShift: 0 },
        "Motorik Drive": { cadence: "loop", tensionShift: 0.15, repetitionShift: 0.35, chordLengthScale: 0.65, extensionShift: -0.15, cadencePolicyOverride: "repair", candidateCountShift: 0 },
        "Arpeggio Bloom": { cadence: "none", tensionShift: 0.1, repetitionShift: -0.05, chordLengthScale: 0.75, extensionShift: 0.2, cadencePolicyOverride: "reject", candidateCountShift: 1 },
        "Blue Note Turn": { cadence: "soft", tensionShift: 0.1, repetitionShift: -0.05, chordLengthScale: 0.9, extensionShift: 0.2, cadencePolicyOverride: "reject", candidateCountShift: 2 },
        "Power Chord Lift": { cadence: "strong", tensionShift: 0.2, repetitionShift: 0.15, chordLengthScale: 0.75, extensionShift: -0.2, cadencePolicyOverride: "repair", candidateCountShift: 0 },
        "Dorian Drift": { cadence: "loop", tensionShift: 0, repetitionShift: -0.05, chordLengthScale: 1.1, extensionShift: 0.1, cadencePolicyOverride: "reject", candidateCountShift: 1 },
        "Chromatic Tension": { cadence: "none", tensionShift: 0.35, repetitionShift: -0.2, chordLengthScale: 0.75, extensionShift: 0.2, cadencePolicyOverride: "reject", candidateCountShift: 2 },
        "Half-Time Drop": { cadence: "loop", tensionShift: -0.05, repetitionShift: 0.2, chordLengthScale: 1.35, extensionShift: -0.1, cadencePolicyOverride: "reject", candidateCountShift: 0 },
        "Call And Response": { cadence: "soft", tensionShift: 0.05, repetitionShift: 0.1, chordLengthScale: 0.9, extensionShift: 0.05, cadencePolicyOverride: "repair", candidateCountShift: 1 },
        "Staccato Push": { cadence: "none", tensionShift: 0.15, repetitionShift: 0.1, chordLengthScale: 0.65, extensionShift: -0.1, cadencePolicyOverride: "repair", candidateCountShift: 0 },
        "Legato Float": { cadence: "soft", tensionShift: -0.1, repetitionShift: 0.05, chordLengthScale: 1.3, extensionShift: 0.15, cadencePolicyOverride: "reject", candidateCountShift: 1 },
        "Syncopated Lift": { cadence: "none", tensionShift: 0.15, repetitionShift: 0.05, chordLengthScale: 0.75, extensionShift: 0.05, cadencePolicyOverride: "repair", candidateCountShift: 0 },
        "Suspended Colour": { cadence: "soft", tensionShift: 0.1, repetitionShift: -0.05, chordLengthScale: 1.1, extensionShift: 0.25, cadencePolicyOverride: "reject", candidateCountShift: 1 },
        "Pedal Point": { cadence: "loop", tensionShift: -0.05, repetitionShift: 0.4, chordLengthScale: 1.2, extensionShift: -0.05, cadencePolicyOverride: "repair", candidateCountShift: 0 },
        "Descending Line": { cadence: "soft", tensionShift: -0.05, repetitionShift: -0.05, chordLengthScale: 0.9, extensionShift: 0.1, cadencePolicyOverride: "reject", candidateCountShift: 1 }
      }
    },
    scaleProfiles: {
      "Pentatonic Major": {
        pulseKeywords: ["major", "open"],
        replacements: { minor: "major" }
      },
      "Pentatonic Minor": {
        pulseKeywords: ["minor", "soulful"],
        replacements: { major: "minor", bright: "earthy", uplifting: "defiant" }
      },
      "Heptatonic Major": {
        pulseKeywords: ["major", "bright"],
        replacements: { minor: "major" }
      },
      "Heptatonic Natural Minor": {
        pulseKeywords: ["minor", "melancholic"],
        replacements: { major: "minor", bright: "bittersweet", uplifting: "yearning" }
      }
    },
    types: [
      {
        name: "Ballad",
        pulseConditions: { genres: ["Pop", "Folk"], defaultDecade: 1970 },
        macro: {
          density: 0.42,
          split: 0.55,
          sync: 0.22,
          rhythm: 0.4
        },
        chordLengths: [
          2,
          2,
          3,
          4,
          4
        ],
        extensionProbability: 0.6,
        drumRecommendations: [
          "Slow-Burn & 6/8 Fills",
          "Basic 8th-Note"
        ],
        pulseKeywords: [
          "emotional",
          "lyrical",
          "warm"
        ],
        keywords: [
          "emotional",
          "slow",
          "lyrical",
          "intimate",
          "melodic"
        ]
      },
      {
        name: "Pop",
        pulseConditions: { genres: ["Pop"], defaultDecade: 2010 },
        macro: {
          density: 0.62,
          split: 0.45,
          sync: 0.4,
          rhythm: 0.5
        },
        chordLengths: [
          1,
          1,
          2,
          2,
          2
        ],
        extensionProbability: 0.18,
        drumRecommendations: [
          "Four-on-the-Floor",
          "Basic 8th-Note"
        ],
        pulseKeywords: [
          "bright",
          "hooky",
          "polished"
        ],
        keywords: [
          "bright",
          "hooky",
          "polished",
          "upbeat",
          "direct"
        ]
      },
      {
        name: "Cinematic",
        pulseConditions: { genres: ["Soundtrack"], defaultDecade: 2000 },
        macro: {
          density: 0.5,
          split: 0.6,
          sync: 0.25,
          rhythm: 0.55
        },
        chordLengths: [
          2,
          3,
          4,
          4,
          2
        ],
        extensionProbability: 0.65,
        drumRecommendations: [
          "Gated-Reverb Drive",
          "Slow-Burn & 6/8 Fills"
        ],
        pulseKeywords: [
          "wide",
          "dramatic",
          "orchestral"
        ],
        keywords: [
          "dramatic",
          "wide",
          "epic",
          "orchestral",
          "emotional"
        ]
      },
      {
        name: "Lo-Fi",
        pulseConditions: { genres: ["Hip Hop", "Electronic"], defaultDecade: 2010 },
        macro: {
          density: 0.55,
          split: 0.4,
          sync: 0.55,
          rhythm: 0.6
        },
        chordLengths: [
          1,
          2,
          2,
          2,
          3
        ],
        extensionProbability: 0.5,
        drumRecommendations: [
          "Syncopated",
          "Basic 8th-Note"
        ],
        pulseKeywords: [
          "dusty",
          "intimate",
          "soft"
        ],
        keywords: [
          "dusty",
          "warm",
          "intimate",
          "relaxed",
          "hazy"
        ]
      },
      {
        name: "Ambient",
        pulseConditions: { genres: ["New Age", "Electronic"], defaultDecade: 1990 },
        macro: {
          density: 0.3,
          split: 0.7,
          sync: 0.18,
          rhythm: 0.35
        },
        chordLengths: [
          4,
          4,
          3,
          2
        ],
        extensionProbability: 0.5,
        drumRecommendations: [
          "Slow-Burn & 6/8 Fills",
          "Syncopated"
        ],
        pulseKeywords: [
          "spacious",
          "dreamy",
          "slow"
        ],
        keywords: [
          "spacious",
          "dreamy",
          "slow",
          "floating",
          "minimal"
        ]
      },
      {
        name: "New Wave",
        pulseConditions: { genres: ["Electronic", "Pop"], defaultDecade: 1980 },
        macro: {
          density: 0.58,
          split: 0.42,
          sync: 0.48,
          rhythm: 0.62
        },
        chordLengths: [
          1,
          1,
          2,
          2,
          4
        ],
        extensionProbability: 0.35,
        drumRecommendations: [
          "Driving 16th Open Hat",
          "Four-on-the-Floor"
        ],
        pulseKeywords: [
          "angular",
          "80s",
          "driving"
        ],
        keywords: [
          "angular",
          "retro",
          "driving",
          "bright",
          "synthetic"
        ]
      },
      {
        name: "Electropop",
        pulseConditions: { genres: ["Electronic", "Pop"], defaultDecade: 2010 },
        macro: {
          density: 0.66,
          split: 0.38,
          sync: 0.44,
          rhythm: 0.58
        },
        chordLengths: [
          1,
          1,
          1,
          2,
          2
        ],
        extensionProbability: 0.28,
        drumRecommendations: [
          "Driving 16th Open Hat",
          "Four-on-the-Floor"
        ],
        pulseKeywords: [
          "glossy",
          "synthetic",
          "club"
        ],
        keywords: [
          "glossy",
          "club",
          "synthetic",
          "bright",
          "pulsing"
        ]
      },
      {
        name: "Classical",
        pulseConditions: { genres: ["Classical"], defaultDecade: 1950 },
        macro: {
          density: 0.46,
          split: 0.58,
          sync: 0.18,
          rhythm: 0.42
        },
        chordLengths: [
          2,
          2,
          4,
          4
        ],
        extensionProbability: 0.42,
        drumRecommendations: [
          "Basic 8th-Note"
        ],
        pulseKeywords: [
          "elegant",
          "ordered",
          "flowing"
        ],
        keywords: [
          "elegant",
          "ordered",
          "flowing",
          "refined",
          "melodic"
        ]
      },
      {
        name: "Jazz",
        pulseConditions: { genres: ["Jazz"], defaultDecade: 1960 },
        macro: {
          density: 0.58,
          split: 0.5,
          sync: 0.66,
          rhythm: 0.72
        },
        chordLengths: [
          1,
          2,
          2,
          3
        ],
        extensionProbability: 0.8,
        drumRecommendations: [
          "Syncopated",
          "Basic 8th-Note"
        ],
        pulseKeywords: [
          "extended",
          "syncopated",
          "swing"
        ],
        keywords: [
          "syncopated",
          "extended",
          "swinging",
          "colourful",
          "fluid"
        ]
      },
      {
        name: "Funk",
        pulseConditions: { genres: ["R&B, Funk & Soul"], defaultDecade: 1970 },
        macro: {
          density: 0.68,
          split: 0.36,
          sync: 0.72,
          rhythm: 0.78
        },
        chordLengths: [
          1,
          1,
          1,
          2
        ],
        extensionProbability: 0.48,
        drumRecommendations: [
          "Syncopated",
          "Driving 16th Open Hat"
        ],
        pulseKeywords: [
          "groove",
          "syncopated",
          "staccato"
        ],
        keywords: [
          "groove",
          "syncopated",
          "staccato",
          "rhythmic",
          "tight"
        ]
      },
      {
        name: "R&B",
        pulseConditions: { genres: ["R&B, Funk & Soul"], defaultDecade: 2000 },
        macro: {
          density: 0.5,
          split: 0.48,
          sync: 0.6,
          rhythm: 0.52
        },
        chordLengths: [
          2,
          2,
          3,
          4
        ],
        extensionProbability: 0.74,
        drumRecommendations: [
          "Syncopated",
          "Basic 8th-Note"
        ],
        pulseKeywords: [
          "smooth",
          "lush",
          "late-night"
        ],
        keywords: [
          "smooth",
          "lush",
          "late night",
          "soulful",
          "syncopated"
        ]
      },
      {
        name: "House",
        pulseConditions: { genres: ["Electronic", "Disco"], defaultDecade: 1990 },
        macro: {
          density: 0.64,
          split: 0.34,
          sync: 0.38,
          rhythm: 0.66
        },
        chordLengths: [
          1,
          1,
          2,
          2,
          4
        ],
        extensionProbability: 0.3,
        drumRecommendations: [
          "Four-on-the-Floor",
          "Driving 16th Open Hat"
        ],
        pulseKeywords: [
          "four-on-floor",
          "looped",
          "club"
        ],
        keywords: [
          "club",
          "four on floor",
          "looped",
          "steady",
          "uplifting"
        ]
      },
      {
        name: "Synth",
        pulseConditions: { genres: ["Electronic"], defaultDecade: 1980 },
        macro: {
          density: 0.6,
          split: 0.46,
          sync: 0.36,
          rhythm: 0.56
        },
        chordLengths: [
          1,
          2,
          2,
          4
        ],
        extensionProbability: 0.36,
        drumRecommendations: [
          "Driving 16th Open Hat",
          "Four-on-the-Floor"
        ],
        pulseKeywords: [
          "analogue",
          "sequenced",
          "wide"
        ],
        keywords: [
          "analogue",
          "sequenced",
          "wide",
          "pulsing",
          "textural"
        ]
      },
      {
        name: "Folk",
        pulseConditions: { genres: ["Folk"], defaultDecade: 1960 },
        macro: {
          density: 0.44,
          split: 0.56,
          sync: 0.2,
          rhythm: 0.36
        },
        chordLengths: [
          2,
          2,
          4,
          4
        ],
        extensionProbability: 0.2,
        drumRecommendations: [
          "Basic 8th-Note",
          "Slow-Burn & 6/8 Fills"
        ],
        pulseKeywords: [
          "organic",
          "simple",
          "acoustic"
        ],
        keywords: [
          "organic",
          "acoustic",
          "simple",
          "earthy",
          "storytelling"
        ]
      },
      {
        name: "Rock",
        pulseConditions: { genres: ["Rock"], defaultDecade: 1970 },
        macro: {
          density: 0.64,
          split: 0.4,
          sync: 0.28,
          rhythm: 0.54
        },
        chordLengths: [
          1,
          1,
          2,
          4
        ],
        extensionProbability: 0.22,
        drumRecommendations: [
          "Gated-Reverb Drive",
          "Basic 8th-Note"
        ],
        pulseKeywords: [
          "direct",
          "anthemic",
          "guitar-led"
        ],
        keywords: [
          "direct",
          "anthemic",
          "guitar led",
          "driving",
          "bold"
        ]
      },
      {
        name: "Punk",
        pulseConditions: { genres: ["Rock"], defaultDecade: 1970 },
        macro: {
          density: 0.76,
          split: 0.32,
          sync: 0.18,
          rhythm: 0.64
        },
        chordLengths: [
          1,
          1,
          1,
          2
        ],
        extensionProbability: 0.12,
        drumRecommendations: [
          "Gated-Reverb Drive",
          "Driving 16th Open Hat"
        ],
        pulseKeywords: [
          "raw",
          "fast",
          "minimal"
        ],
        keywords: [
          "raw",
          "fast",
          "minimal",
          "urgent",
          "rough"
        ]
      },
      {
        name: "Post-Rock",
        pulseConditions: { genres: ["Rock", "Experimental"], defaultDecade: 1990 },
        macro: {
          density: 0.48,
          split: 0.62,
          sync: 0.24,
          rhythm: 0.48
        },
        chordLengths: [
          3,
          4,
          4,
          6
        ],
        extensionProbability: 0.68,
        drumRecommendations: [
          "Slow-Burn & 6/8 Fills",
          "Gated-Reverb Drive"
        ],
        pulseKeywords: [
          "expansive",
          "crescendo",
          "textural"
        ],
        keywords: [
          "expansive",
          "crescendo",
          "textural",
          "patient",
          "emotional"
        ]
      },
      {
        name: "Darkwave",
        pulseConditions: { genres: ["Darkwave", "Electronic"], defaultDecade: 1980 },
        macro: {
          density: 0.5,
          split: 0.55,
          sync: 0.34,
          rhythm: 0.58
        },
        chordLengths: [
          2,
          2,
          3,
          4
        ],
        extensionProbability: 0.52,
        drumRecommendations: [
          "Gated-Reverb Drive",
          "Driving 16th Open Hat"
        ],
        pulseKeywords: [
          "cold",
          "minor",
          "shadowy"
        ],
        keywords: [
          "cold",
          "minor",
          "shadowy",
          "brooding",
          "synthetic"
        ]
      }
    ],
    segments: [
      {
        name: "Intro",
        macro: {
          density: -0.15,
          split: -0.05,
          sync: -0.05,
          rhythm: -0.05
        },
        profile: {
          density: 0.55,
          register: -3,
          length: 1.4,
          sync: -0.1
        },
        pulseKeywords: [
          "opening",
          "restrained"
        ],
        keywords: [
          "opening",
          "restrained",
          "establishing",
          "sparse",
          "anticipation"
        ]
      },
      {
        name: "Verse",
        macro: {
          density: 0,
          split: 0,
          sync: 0,
          rhythm: 0
        },
        profile: {
          density: 0.85,
          register: 0,
          length: 1.1,
          sync: 0
        },
        pulseKeywords: [
          "narrative",
          "steady"
        ],
        keywords: [
          "understated",
          "narrative",
          "sparse",
          "grounded",
          "steady"
        ]
      },
      {
        name: "Pre-Chorus",
        macro: {
          density: 0.08,
          split: -0.05,
          sync: 0.05,
          rhythm: 0.05
        },
        profile: {
          density: 1.05,
          register: 2,
          length: 0.9,
          sync: 0.12
        },
        pulseKeywords: [
          "lift",
          "anticipation"
        ],
        keywords: [
          "rising",
          "anticipation",
          "transition",
          "building",
          "lift"
        ]
      },
      {
        name: "Build",
        macro: {
          density: 0.12,
          split: -0.06,
          sync: 0.06,
          rhythm: 0.12
        },
        profile: {
          density: 1.15,
          register: 3,
          length: 0.85,
          sync: 0.16
        },
        pulseKeywords: [
          "rising",
          "tension"
        ],
        keywords: [
          "rising",
          "tension",
          "escalating",
          "driving",
          "anticipation"
        ]
      },
      {
        name: "Chorus",
        macro: {
          density: 0.18,
          split: -0.1,
          sync: 0.08,
          rhythm: 0.08
        },
        profile: {
          density: 1.3,
          register: 4,
          length: 0.8,
          sync: 0.18
        },
        pulseKeywords: [
          "big",
          "resolved"
        ],
        keywords: [
          "anthemic",
          "high energy",
          "climax",
          "full texture",
          "driving"
        ]
      },
      {
        name: "Hook",
        macro: {
          density: 0.16,
          split: -0.12,
          sync: 0.1,
          rhythm: 0.1
        },
        profile: {
          density: 1.25,
          register: 4,
          length: 0.75,
          sync: 0.2
        },
        pulseKeywords: [
          "memorable",
          "compact"
        ],
        keywords: [
          "memorable",
          "compact",
          "catchy",
          "focused",
          "bright"
        ]
      },
      {
        name: "Drop",
        macro: {
          density: 0.2,
          split: -0.16,
          sync: 0.1,
          rhythm: 0.16
        },
        profile: {
          density: 1.35,
          register: 2,
          length: 0.7,
          sync: 0.18
        },
        pulseKeywords: [
          "impact",
          "release"
        ],
        keywords: [
          "impact",
          "release",
          "high energy",
          "heavy",
          "driving"
        ]
      },
      {
        name: "Bridge",
        macro: {
          density: 0,
          split: 0.05,
          sync: 0.05,
          rhythm: 0.1
        },
        profile: {
          density: 0.95,
          register: -2,
          length: 1,
          sync: 0.1
        },
        pulseKeywords: [
          "contrast",
          "shift"
        ],
        keywords: [
          "contrast",
          "shift",
          "fresh",
          "transitional",
          "open"
        ]
      },
      {
        name: "Solo",
        macro: {
          density: 0.1,
          split: 0.18,
          sync: 0.08,
          rhythm: 0.1
        },
        profile: {
          density: 1.2,
          register: 6,
          length: 0.9,
          sync: 0.14
        },
        pulseKeywords: [
          "lead",
          "expressive"
        ],
        keywords: [
          "expressive",
          "lead",
          "featured",
          "melodic",
          "free"
        ]
      },
      {
        name: "Middle-Eight",
        macro: {
          density: 0.03,
          split: 0.08,
          sync: 0.06,
          rhythm: 0.12
        },
        profile: {
          density: 1,
          register: 1,
          length: 0.95,
          sync: 0.14
        },
        pulseKeywords: [
          "departure",
          "contrast"
        ],
        keywords: [
          "departure",
          "contrast",
          "surprising",
          "fresh",
          "turning"
        ]
      },
      {
        name: "Interlude",
        macro: {
          density: -0.16,
          split: 0.08,
          sync: -0.02,
          rhythm: -0.04
        },
        profile: {
          density: 0.62,
          register: -1,
          length: 1.35,
          sync: -0.02
        },
        pulseKeywords: [
          "breathing-space",
          "transitional"
        ],
        keywords: [
          "breathing space",
          "transitional",
          "open",
          "reduced",
          "reflective"
        ]
      },
      {
        name: "Breakdown",
        macro: {
          density: -0.22,
          split: 0.14,
          sync: 0.04,
          rhythm: -0.04
        },
        profile: {
          density: 0.5,
          register: -4,
          length: 1.45,
          sync: 0.05
        },
        pulseKeywords: [
          "stripped",
          "low"
        ],
        keywords: [
          "stripped",
          "tension",
          "minimal",
          "suspense",
          "low"
        ]
      },
      {
        name: "Outro",
        macro: {
          density: -0.18,
          split: 0.1,
          sync: -0.05,
          rhythm: -0.05
        },
        profile: {
          density: 0.55,
          register: -4,
          length: 1.5,
          sync: -0.08
        },
        pulseKeywords: [
          "closing",
          "fade"
        ],
        keywords: [
          "closing",
          "resolved",
          "fading",
          "reflective",
          "gentle"
        ]
      }
    ],
    options: [
      {
        name: "Rousing Crescendo",
        macro: {
          density: 0.06,
          sync: 0.05,
          rhythm: 0.05
        },
        envelope: "rise",
        length: 0.95,
        pulseKeywords: [
          "rising",
          "uplifting"
        ],
        keywords: [
          "building",
          "rising",
          "triumphant",
          "intensifying",
          "uplifting"
        ]
      },
      {
        name: "Moody Wind Down",
        macro: {
          density: -0.08,
          sync: -0.05,
          rhythm: 0
        },
        envelope: "fall",
        length: 1.3,
        pulseKeywords: [
          "falling",
          "reflective"
        ],
        keywords: [
          "falling",
          "reflective",
          "softening",
          "melancholic",
          "settling"
        ]
      },
      {
        name: "Gentle Swell",
        macro: {
          density: -0.02,
          sync: 0,
          rhythm: 0
        },
        envelope: "swell",
        length: 1.15,
        pulseKeywords: [
          "soft-build",
          "gentle"
        ],
        keywords: [
          "gentle",
          "soft build",
          "warm",
          "rounded",
          "flowing"
        ]
      },
      {
        name: "Steady Groove",
        macro: {
          density: 0.05,
          sync: 0.08,
          rhythm: -0.05
        },
        envelope: "flat",
        length: 0.85,
        pulseKeywords: [
          "steady",
          "locked"
        ],
        keywords: [
          "steady",
          "locked",
          "groove",
          "balanced",
          "controlled"
        ]
      },
      {
        name: "Sparse Reflection",
        macro: {
          density: -0.18,
          sync: -0.08,
          rhythm: -0.1
        },
        envelope: "sparse",
        length: 1.6,
        pulseKeywords: [
          "minimal",
          "open"
        ],
        keywords: [
          "minimal",
          "open",
          "reflective",
          "quiet",
          "intimate"
        ]
      },
      {
        name: "Driving Pulse",
        macro: {
          density: 0.08,
          sync: 0.06,
          rhythm: 0.08
        },
        envelope: "flat",
        length: 0.85,
        pulseKeywords: [
          "pulsing",
          "forward"
        ],
        keywords: [
          "pulsing",
          "forward",
          "driving",
          "energetic",
          "steady"
        ]
      },
      {
        name: "Tension Lift",
        macro: {
          density: 0.04,
          sync: 0.04,
          rhythm: 0.12
        },
        envelope: "swell",
        length: 1.15,
        pulseKeywords: [
          "tense",
          "climbing"
        ],
        keywords: [
          "tense",
          "climbing",
          "suspense",
          "tightening",
          "urgent"
        ]
      },
      {
        name: "Release Drop",
        macro: {
          density: -0.1,
          sync: 0.02,
          rhythm: -0.02
        },
        envelope: "fall",
        length: 1.3,
        pulseKeywords: [
          "release",
          "drop"
        ],
        keywords: [
          "release",
          "drop",
          "impact",
          "falling",
          "heavy"
        ]
      },
      {
        name: "Nocturne Drift",
        macro: {
          density: -0.12,
          sync: -0.04,
          rhythm: -0.04
        },
        envelope: "sparse",
        length: 1.6,
        pulseKeywords: [
          "night",
          "drifting"
        ],
        keywords: [
          "night",
          "drifting",
          "soft",
          "shadowy",
          "slow"
        ]
      },
      {
        name: "Angular Push",
        macro: {
          density: 0.04,
          sync: 0.14,
          rhythm: 0.16
        },
        envelope: "alternate",
        length: 0.8,
        pulseKeywords: [
          "angular",
          "off-kilter"
        ],
        keywords: [
          "angular",
          "off kilter",
          "pushing",
          "sharp",
          "syncopated"
        ]
      },
      {
        name: "Anthem Rise",
        macro: {
          density: 0.1,
          sync: 0.03,
          rhythm: 0.08
        },
        envelope: "rise",
        length: 0.95,
        pulseKeywords: [
          "anthemic",
          "wide"
        ],
        keywords: [
          "anthemic",
          "rising",
          "wide",
          "uplifting",
          "bold"
        ]
      },
      {
        name: "Minimal Loop",
        macro: {
          density: -0.2,
          sync: -0.02,
          rhythm: -0.08
        },
        envelope: "sparse",
        length: 1.6,
        pulseKeywords: [
          "looped",
          "minimal"
        ],
        keywords: [
          "looped",
          "minimal",
          "hypnotic",
          "restrained",
          "focused"
        ]
      },
      {
        name: "Motorik Drive",
        macro: {
          density: 0.09,
          sync: 0.03,
          rhythm: 0.13
        },
        envelope: "flat",
        length: 0.8,
        pulseKeywords: [
          "motorik",
          "persistent"
        ],
        keywords: [
          "motorik",
          "persistent",
          "steady",
          "forward",
          "locked"
        ]
      },
      {
        name: "Arpeggio Bloom",
        macro: {
          density: 0.12,
          sync: 0.05,
          rhythm: 0.1
        },
        envelope: "swell",
        length: 0.9,
        pulseKeywords: [
          "arpeggiated",
          "blooming"
        ],
        keywords: [
          "arpeggiated",
          "blooming",
          "bright",
          "flowing",
          "rising"
        ]
      },
      {
        name: "Blue Note Turn",
        macro: {
          density: 0.05,
          sync: 0.16,
          rhythm: 0.14
        },
        envelope: "alternate",
        length: 0.95,
        pulseKeywords: [
          "bluesy",
          "turnaround"
        ],
        keywords: [
          "bluesy",
          "turnaround",
          "colourful",
          "syncopated",
          "expressive"
        ]
      },
      {
        name: "Power Chord Lift",
        macro: {
          density: 0.08,
          sync: -0.02,
          rhythm: 0.1
        },
        envelope: "rise",
        length: 0.9,
        pulseKeywords: [
          "powerful",
          "simple"
        ],
        keywords: [
          "powerful",
          "simple",
          "bold",
          "rising",
          "direct"
        ]
      },
      {
        name: "Dorian Drift",
        macro: {
          density: -0.04,
          sync: 0.04,
          rhythm: 0.05
        },
        envelope: "sparse",
        length: 1.35,
        pulseKeywords: [
          "modal",
          "dorian"
        ],
        keywords: [
          "modal",
          "dorian",
          "drifting",
          "open",
          "cool"
        ]
      },
      {
        name: "Chromatic Tension",
        macro: {
          density: 0.02,
          sync: 0.1,
          rhythm: 0.18
        },
        envelope: "rise",
        length: 1,
        pulseKeywords: [
          "chromatic",
          "uneasy"
        ],
        keywords: [
          "chromatic",
          "uneasy",
          "tense",
          "dark",
          "unstable"
        ]
      },
      {
        name: "Half-Time Drop",
        macro: {
          density: -0.08,
          sync: 0.04,
          rhythm: -0.02
        },
        envelope: "fall",
        length: 1.4,
        pulseKeywords: [
          "half-time",
          "heavy"
        ],
        keywords: [
          "half time",
          "heavy",
          "spacious",
          "low",
          "impact"
        ]
      },
      {
        name: "Call And Response",
        macro: {
          density: 0.03,
          sync: 0.12,
          rhythm: 0.08
        },
        envelope: "alternate",
        length: 1.05,
        pulseKeywords: [
          "call-response",
          "phrased"
        ],
        keywords: [
          "call response",
          "phrased",
          "conversational",
          "alternating",
          "playful"
        ]
      },
      {
        name: "Staccato Push",
        macro: {
          density: 0.1,
          sync: 0.05,
          rhythm: 0.14
        },
        envelope: "flat",
        length: 0.65,
        pulseKeywords: [
          "staccato",
          "urgent"
        ],
        keywords: [
          "staccato",
          "urgent",
          "short",
          "rhythmic",
          "pushing"
        ]
      },
      {
        name: "Legato Float",
        macro: {
          density: -0.08,
          sync: -0.03,
          rhythm: -0.06
        },
        envelope: "swell",
        length: 1.75,
        pulseKeywords: [
          "legato",
          "floating"
        ],
        keywords: [
          "legato",
          "floating",
          "smooth",
          "soft",
          "long"
        ]
      },
      {
        name: "Syncopated Lift",
        macro: {
          density: 0.04,
          sync: 0.18,
          rhythm: 0.12
        },
        envelope: "rise",
        length: 0.9,
        pulseKeywords: [
          "syncopated",
          "lifted"
        ],
        keywords: [
          "syncopated",
          "lifted",
          "rhythmic",
          "rising",
          "energetic"
        ]
      },
      {
        name: "Suspended Colour",
        macro: {
          density: -0.02,
          sync: 0.02,
          rhythm: 0.04
        },
        envelope: "sparse",
        length: 1.25,
        pulseKeywords: [
          "suspended",
          "colourful"
        ],
        keywords: [
          "suspended",
          "colourful",
          "open",
          "unresolved",
          "lush"
        ]
      },
      {
        name: "Pedal Point",
        macro: {
          density: -0.04,
          sync: -0.02,
          rhythm: 0
        },
        envelope: "flat",
        length: 1.2,
        pulseKeywords: [
          "anchored",
          "pedal"
        ],
        keywords: [
          "anchored",
          "pedal",
          "grounded",
          "steady",
          "hypnotic"
        ]
      },
      {
        name: "Descending Line",
        macro: {
          density: 0.02,
          sync: 0.02,
          rhythm: 0.06
        },
        envelope: "fall",
        length: 1,
        pulseKeywords: [
          "descending",
          "resolved"
        ],
        keywords: [
          "descending",
          "resolved",
          "falling",
          "melodic",
          "settling"
        ]
      }
    ]
  };

  // apps/peitho-composer/src/composer-engine.ts
  var PULSE_GENRES = [
    "Rock",
    "Folk",
    "Pop",
    "Soundtrack",
    "R&B, Funk & Soul",
    "Country",
    "Jazz",
    "Experimental",
    "Religious Music",
    "Reggae & Ska",
    "Hip Hop",
    "Electronic",
    "Comedy",
    "Metal",
    "Blues",
    "World Music",
    "Disco",
    "Classical",
    "New Age",
    "Darkwave"
  ];
  var PULSE_DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
  var PRESETS = direction_presets_default;
  var TYPE_PRESETS = Object.fromEntries(PRESETS.types.map((preset) => [preset.name, preset]));
  var SEGMENT_PRESETS = Object.fromEntries(PRESETS.segments.map((preset) => [preset.name, preset]));
  var OPTION_PRESETS = Object.fromEntries(PRESETS.options.map((preset) => [preset.name, preset]));
  var PULSE_KEYWORDS = [
    ...new Set([
      ...[...PRESETS.types, ...PRESETS.segments, ...PRESETS.options].flatMap((preset) => preset.pulseKeywords),
      ...Object.values(PRESETS.scaleProfiles).flatMap((profile) => [
        ...profile.pulseKeywords,
        ...Object.values(profile.replacements)
      ])
    ])
  ];
  var DEFAULT_TYPE = TYPE_PRESETS.Ballad;
  var DEFAULT_SEGMENT = SEGMENT_PRESETS.Verse;
  var DEFAULT_OPTION = OPTION_PRESETS["Rousing Crescendo"];
  function presetMacros(type, segment, option, scale) {
    const base = (TYPE_PRESETS[type] ?? DEFAULT_TYPE).macro;
    const segmentMacro = (SEGMENT_PRESETS[segment] ?? DEFAULT_SEGMENT).macro;
    const optionMacro = (OPTION_PRESETS[option] ?? DEFAULT_OPTION).macro;
    const scaleShift = scale.startsWith("Pentatonic") ? -0.05 : 0.05;
    return {
      density: clamp2(base.density + (segmentMacro.density ?? 0) + (optionMacro.density ?? 0), 0.05, 1),
      split: clamp2(base.split + (segmentMacro.split ?? 0) + (optionMacro.split ?? 0), 0, 1),
      sync: clamp2(base.sync + (segmentMacro.sync ?? 0) + (optionMacro.sync ?? 0), 0, 1),
      rhythm: clamp2(base.rhythm + (segmentMacro.rhythm ?? 0) + (optionMacro.rhythm ?? 0) + scaleShift, 0, 1)
    };
  }
  function clamp2(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function chordUnit(value) {
    return Math.round(clamp2(value, 0, 1) * 1000) / 1000;
  }
  function pulseKeywords(type, segment, option, scale) {
    const presets = [
      TYPE_PRESETS[type] ?? DEFAULT_TYPE,
      SEGMENT_PRESETS[segment] ?? DEFAULT_SEGMENT,
      OPTION_PRESETS[option] ?? DEFAULT_OPTION
    ];
    const scaleProfile = PRESETS.scaleProfiles[scale] ?? PRESETS.scaleProfiles["Pentatonic Major"];
    const contextual = presets.flatMap((preset) => preset.pulseKeywords).map((keyword) => scaleProfile.replacements[keyword] ?? keyword);
    return [...new Set([...contextual, ...scaleProfile.pulseKeywords])];
  }
  function pulseConditions(type) {
    const conditions = (TYPE_PRESETS[type] ?? DEFAULT_TYPE).pulseConditions;
    return {
      genres: [...conditions.genres],
      defaultDecade: conditions.defaultDecade
    };
  }
  function chordTones(symbol) {
    const match = symbol.match(/^([A-G])(#|b)?(.*)$/);
    if (!match)
      throw new Error(`Unsupported chord symbol: ${symbol}`);
    const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
    const root = 48 + (NOTE_NAMES.indexOf(match[1]) + accidental + 12) % 12;
    const suffix = match[3];
    const intervals = suffix.startsWith("dim") ? [0, 3, 6] : suffix.startsWith("aug") ? [0, 4, 8] : suffix.startsWith("m") ? [0, 3, 7] : [0, 4, 7];
    return intervals.map((interval) => root + interval);
  }
  function chordsFromProgressionSeed(seed, key) {
    const symbols = romanToChordSymbols(seed.degrees, key, seed.mode);
    const rhythm = seed.harmonicRhythm;
    if (!rhythm || rhythm.length !== symbols.length) {
      throw new Error("Pulse progression seed has no matching harmonic rhythm");
    }
    let start = 0;
    return symbols.map((name, index) => {
      const len = rhythm[index];
      const event = { name, start, len, tones: chordTones(name) };
      start += len;
      return event;
    });
  }
  function chordDirection(type, segment, option) {
    const typePreset = TYPE_PRESETS[type] ?? DEFAULT_TYPE;
    const base = PRESETS.chordDirections.typeDefaults[typePreset.name] ?? PRESETS.chordDirections.typeDefaults.Ballad;
    const segmentModifier = PRESETS.chordDirections.segmentModifiers[segment] ?? {};
    const optionModifier = PRESETS.chordDirections.optionModifiers[option] ?? {};
    const lengthScale = (segmentModifier.chordLengthScale ?? 1) * (optionModifier.chordLengthScale ?? 1);
    return {
      chordLengths: typePreset.chordLengths.map((length) => Math.max(1, Math.round(length * lengthScale))),
      extensionProbability: chordUnit(typePreset.extensionProbability + (segmentModifier.extensionShift ?? 0) + (optionModifier.extensionShift ?? 0)),
      progressionProfile: {
        start: optionModifier.start ?? segmentModifier.start ?? base.start,
        cadence: optionModifier.cadence ?? segmentModifier.cadence ?? base.cadence,
        tension: chordUnit(base.tension + (segmentModifier.tensionShift ?? 0) + (optionModifier.tensionShift ?? 0)),
        repetition: chordUnit(base.repetition + (segmentModifier.repetitionShift ?? 0) + (optionModifier.repetitionShift ?? 0))
      },
      scalePolicy: base.scalePolicy,
      model: base.model,
      candidateCount: Math.min(8, Math.max(1, base.candidateCount + (segmentModifier.candidateCountShift ?? 0) + (optionModifier.candidateCountShift ?? 0))),
      cadencePolicy: optionModifier.cadencePolicyOverride ?? segmentModifier.cadencePolicyOverride ?? base.cadencePolicy
    };
  }
  var ComposerEngine = {
    NOTE_NAMES: [...NOTE_NAMES],
    KEYS: [...KEYS],
    SCALE_LIST: [...SCALE_LABELS],
    TYPES: PRESETS.types.map((preset) => preset.name),
    SEGMENTS: PRESETS.segments.map((preset) => preset.name),
    OPTIONS: PRESETS.options.map((preset) => preset.name),
    PULSE_GENRES: [...PULSE_GENRES],
    PULSE_DECADES: [...PULSE_DECADES],
    PULSE_KEYWORDS: [...PULSE_KEYWORDS],
    ARRAY_CHORD_RUNTIME_PROFILE,
    DRUM_PATTERNS: [...DRUM_PATTERNS],
    DRUM_REC: Object.fromEntries(PRESETS.types.map((preset) => [preset.name, preset.drumRecommendations])),
    rand() {
      return Math.random() * 4294967295 >>> 0;
    },
    clamp(value, min, max) {
      return clamp2(value, min, max);
    },
    genDrums(pattern) {
      return generateDrums(pattern, 8, 16);
    },
    chordDirection(type, segment, option) {
      return chordDirection(type, segment, option);
    },
    chordTypeDefault(type) {
      const typePreset = TYPE_PRESETS[type] ?? DEFAULT_TYPE;
      return PRESETS.chordDirections.typeDefaults[typePreset.name] ?? PRESETS.chordDirections.typeDefaults.Ballad;
    },
    genChords(key, scale, type, segment = DEFAULT_SEGMENT.name, option = DEFAULT_OPTION.name, seed, chordCount) {
      const direction = chordDirection(type, segment, option);
      return generateChords({
        key,
        scale,
        bars: 8,
        seed,
        chordCount,
        ...direction
      });
    },
    chordPool(key, scale) {
      return chordPool(key, scale);
    },
    scaleMidi(key, scale, lo, hi) {
      return scaleMidi(key, scale, lo, hi);
    },
    recommendMacros(type, segment, option, scale) {
      return presetMacros(type, segment, option, scale);
    },
    pulseKeywords(type, segment, option, scale) {
      return pulseKeywords(type, segment, option, scale);
    },
    pulseConditions(type) {
      return pulseConditions(type);
    },
    pulseChordRequest(key, scale, type, segment, option, decade, seed, overrides) {
      const direction = chordDirection(type, segment, option);
      const conditions = pulseConditions(type);
      const explicitCount = overrides?.chordCount;
      const repetitionWindow = Math.min(Math.max(2, explicitCount ? Math.round(explicitCount / 2.5) : 2), 7);
      const repetitionPenalty = 5;
      const baseRepetition = overrides?.repetition ?? direction.progressionProfile.repetition;
      const repetition = explicitCount && explicitCount >= 8 ? Math.min(baseRepetition, 0.35) : baseRepetition;
      return {
        key,
        mode: normalizeScaleName(scale),
        bars: 8,
        tension: overrides?.tension ?? direction.progressionProfile.tension,
        repetition,
        cadence: overrides?.cadence ?? direction.progressionProfile.cadence,
        chordLengths: overrides?.chordLengths ?? direction.chordLengths,
        ...explicitCount ? { chordCount: explicitCount } : {},
        scalePolicy: overrides?.scalePolicy ?? direction.scalePolicy,
        allowImmediateRepeat: overrides?.allowImmediateRepeat ?? false,
        repetitionWindow,
        repetitionPenalty,
        model: overrides?.model ?? direction.model,
        cadencePolicy: overrides?.cadencePolicy ?? direction.cadencePolicy,
        genres: conditions.genres,
        decade,
        seed,
        candidateCount: overrides?.candidateCount ?? direction.candidateCount
      };
    },
    arrayChordRequest(key, scale, type, segment, option, chordCount, seed) {
      if (!ARRAY_CHORD_RUNTIME_PROFILE.chordCounts.includes(chordCount)) {
        throw new Error("Peitho-Array chord count must be 8 or 16");
      }
      const direction = chordDirection(type, segment, option);
      const conditions = pulseConditions(type);
      return {
        key,
        mode: normalizeScaleName(scale),
        bars: 8,
        tension: direction.progressionProfile.tension,
        repetition: direction.progressionProfile.repetition,
        cadence: direction.progressionProfile.cadence,
        chordLengths: direction.chordLengths,
        chordCount,
        genres: conditions.genres,
        decade: conditions.defaultDecade,
        seed,
        model: ARRAY_CHORD_RUNTIME_PROFILE.model,
        candidateCount: ARRAY_CHORD_RUNTIME_PROFILE.candidateCount,
        cadencePolicy: ARRAY_CHORD_RUNTIME_PROFILE.cadencePolicy,
        scalePolicy: ARRAY_CHORD_RUNTIME_PROFILE.scalePolicy,
        allowImmediateRepeat: ARRAY_CHORD_RUNTIME_PROFILE.allowImmediateRepeat
      };
    },
    chordsFromProgressionSeed(seed, key) {
      return chordsFromProgressionSeed(seed, key);
    },
    genMono(seed, options) {
      const segment = SEGMENT_PRESETS[options.segment] ?? DEFAULT_SEGMENT;
      const option = OPTION_PRESETS[options.option] ?? DEFAULT_OPTION;
      return generateMono({
        ...options,
        seed,
        steps: 128,
        stepsPerBar: 16,
        segmentProfile: segment.profile,
        optionProfile: { envelope: option.envelope, length: option.length }
      });
    },
    wave(notes, bins) {
      return waveformBins(notes, bins, 128);
    },
    buildMidi(tempo, tracks) {
      return buildMidi(tempo, tracks);
    }
  };
  window.PeithoComposerEngine = ComposerEngine;
})();
