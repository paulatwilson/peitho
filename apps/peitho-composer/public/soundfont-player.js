(function (global) {
  const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  function midiToKey(midi) {
    return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
  }

  function keyToMidi(key) {
    const m = key.match(/^([A-Gb]+)(-?\d+)$/);
    if (!m) return -1;
    const ni = NOTE_NAMES.indexOf(m[1]);
    return ni < 0 ? -1 : (parseInt(m[2]) + 1) * 12 + ni;
  }

  // UI instrument label → soundfont filename stem
  const INSTR_MAP = {
    'Acoustic Piano':         'acoustic_grand_piano',
    'Electric Piano 1':       'electric_piano_1',
    'Vibraphone':             'vibraphone',
    'String Ensemble':        'string_ensemble_1',
    'Choir Aahs':             'choir_aahs',
    'Pad: Warm':              'pad_2_warm',
    'Violin':                 'violin',
    'Guitar (Nylon)':         'acoustic_guitar_nylon',
    'Flute':                  'flute',
    'Oboe':                   'oboe',
    'Synth Lead':             'lead_1_square',
    'Saw Wave':               'lead_2_sawtooth',
    'Acoustic Bass':          'acoustic_bass',
    'Electric Bass (Finger)': 'electric_bass_finger',
    'Electric Bass (Pick)':   'electric_bass_pick',
    'Slap Bass':              'slap_bass_1',
    'Synth Bass':             'synth_bass_1',
    // All drum kits use synth_drum
    'Acoustic':               'synth_drum',
    'Electronic':             'synth_drum',
    'Brushes':                'synth_drum',
  };

  // stem → { noteKey: AudioBuffer }
  const _buffers = {};
  // stem → Promise<map>
  const _loading = {};

  function _stemFor(label) {
    return INSTR_MAP[label] || null;
  }

  function _loadScript(stem) {
    if (_loading[stem]) return _loading[stem];
    _loading[stem] = new Promise(function (resolve, reject) {
      if (global.MIDI && global.MIDI.Soundfont && global.MIDI.Soundfont[stem]) {
        return resolve(global.MIDI.Soundfont[stem]);
      }
      const s = document.createElement('script');
      s.src = '/soundfonts/MusyngKite/' + stem + '-mp3.js';
      s.onload = function () {
        resolve(global.MIDI && global.MIDI.Soundfont && global.MIDI.Soundfont[stem]);
      };
      s.onerror = function () { reject(new Error('Failed to load soundfont: ' + stem)); };
      document.head.appendChild(s);
    });
    return _loading[stem];
  }

  function _decodeAll(ctx, stem, sfData) {
    if (_buffers[stem]) return Promise.resolve(_buffers[stem]);
    const map = {};
    const promises = Object.keys(sfData).map(function (key) {
      const uri = sfData[key];
      const b64 = uri.split(',')[1];
      const bin = atob(b64);
      const ab = new ArrayBuffer(bin.length);
      const ua = new Uint8Array(ab);
      for (let i = 0; i < bin.length; i++) ua[i] = bin.charCodeAt(i);
      return ctx.decodeAudioData(ab).then(function (buf) {
        map[key] = buf;
      }).catch(function () {});
    });
    return Promise.all(promises).then(function () {
      _buffers[stem] = map;
      return map;
    });
  }

  function _findNearest(map, midiNote) {
    const exact = midiToKey(midiNote);
    if (map[exact]) return { key: exact, detune: 0 };
    let bestKey = null, bestDist = 999;
    for (const k in map) {
      const km = keyToMidi(k);
      if (km < 0) continue;
      const dist = Math.abs(km - midiNote);
      if (dist < bestDist) { bestDist = dist; bestKey = k; }
    }
    return bestKey ? { key: bestKey, detune: midiNote - keyToMidi(bestKey) } : null;
  }

  global.SoundfontPlayer = {
    load: function (ctx, label) {
      const stem = _stemFor(label);
      if (!stem) return Promise.resolve(null);
      return _loadScript(stem).then(function (sfData) {
        if (!sfData) return null;
        return _decodeAll(ctx, stem, sfData);
      });
    },

    play: function (ctx, master, label, midiNote, startTime, durSec, velocity) {
      const stem = _stemFor(label);
      if (!stem) return null;
      const map = _buffers[stem];
      if (!map) return null;

      const found = _findNearest(map, midiNote);
      if (!found) return null;

      const src = ctx.createBufferSource();
      src.buffer = map[found.key];
      if (found.detune !== 0) src.playbackRate.value = Math.pow(2, found.detune / 12);

      const gain = Math.max(0.0001, (velocity == null ? 90 : velocity) / 127) * 0.82;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, startTime);
      g.gain.linearRampToValueAtTime(gain, startTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.max(0.12, durSec));
      src.connect(g);
      g.connect(master);
      src.start(startTime);
      src.stop(startTime + Math.max(0.12, durSec) + 0.05);
      return src;
    },

    isLoaded: function (label) {
      const stem = _stemFor(label);
      return stem ? !!_buffers[stem] : false;
    },

    stemFor: _stemFor,
  };
})(window);
