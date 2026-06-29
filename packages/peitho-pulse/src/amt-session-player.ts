import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ChordEvent, NoteEvent } from "@peitho/array";

export type AmtSessionPlayerRole = "piano" | "pad";

export type AmtLockedTrack = {
  program: number;
  notes: NoteEvent[];
};

export type AmtSessionPlayerRequest = {
  role: AmtSessionPlayerRole;
  bars: number;
  beatsPerBar: number;
  stepsPerBeat: number;
  tempo: number;
  chords: ChordEvent[];
  lockedTracks?: AmtLockedTrack[];
  topP?: number;
  seed?: number;
};

export type AmtSessionPlayerResult = {
  role: AmtSessionPlayerRole;
  program: number;
  notes: NoteEvent[];
  source: {
    provider: "amt";
    model: string;
    seed: number;
    conditions: {
      topP: number;
      controlEventCount: number;
      experimental: true;
    };
  };
  warnings: string[];
};

type WorkerControl = {
  startSeconds: number;
  durationSeconds: number;
  pitch: number;
  program: number;
};

type AmtWorkerRequest = {
  model: string;
  program: number;
  durationSeconds: number;
  topP: number;
  seed: number;
  controls: WorkerControl[];
};

type AmtWorkerResult = {
  notes: Array<{ startSeconds: number; durationSeconds: number; pitch: number }>;
  device: string;
};

const ROLE_PROGRAMS: Record<AmtSessionPlayerRole, number> = {
  piano: 0,
  pad: 88,
};

const DEFAULT_MODEL = "stanford-crfm/music-medium-800k";

function assertRequest(request: AmtSessionPlayerRequest): void {
  if (!(request.role in ROLE_PROGRAMS)) throw new Error(`Unsupported AMT role: ${request.role}`);
  if (!Number.isInteger(request.bars) || request.bars < 1 || request.bars > 32) {
    throw new Error("bars must be an integer from 1 to 32");
  }
  if (!Number.isFinite(request.beatsPerBar) || request.beatsPerBar <= 0) {
    throw new Error("beatsPerBar must be positive");
  }
  if (!Number.isFinite(request.stepsPerBeat) || request.stepsPerBeat <= 0) {
    throw new Error("stepsPerBeat must be positive");
  }
  if (!Number.isFinite(request.tempo) || request.tempo < 30 || request.tempo > 300) {
    throw new Error("tempo must be between 30 and 300 BPM");
  }
  if (!request.chords.length) throw new Error("AMT Session Player requires locked chords");
}

export function buildAmtWorkerRequest(
  request: AmtSessionPlayerRequest,
  model = DEFAULT_MODEL,
): AmtWorkerRequest {
  assertRequest(request);

  const secondsPerBeat = 60 / request.tempo;
  const secondsPerStep = secondsPerBeat / request.stepsPerBeat;
  const secondsPerHalfBar = secondsPerBeat * request.beatsPerBar / 2;
  const controls: WorkerControl[] = [];

  for (const chord of request.chords) {
    for (const pitch of chord.tones) {
      controls.push({
        startSeconds: chord.start * secondsPerHalfBar,
        durationSeconds: Math.max(0.01, chord.len * secondsPerHalfBar),
        pitch,
        program: 0,
      });
    }
  }

  for (const track of request.lockedTracks ?? []) {
    const program = Math.max(0, Math.min(128, Math.round(track.program)));
    for (const note of track.notes) {
      controls.push({
        startSeconds: note.step * secondsPerStep,
        durationSeconds: Math.max(0.01, note.len * secondsPerStep),
        pitch: note.midi,
        program,
      });
    }
  }

  return {
    model,
    program: ROLE_PROGRAMS[request.role],
    durationSeconds: request.bars * request.beatsPerBar * secondsPerBeat,
    topP: Math.max(0.1, Math.min(1, request.topP ?? 0.95)),
    seed: request.seed ?? 0,
    controls,
  };
}

export type AmtSessionPlayerConfig = {
  pythonPath?: string;
  referencePath?: string;
  model?: string;
  timeoutMs?: number;
};

export class AmtSessionPlayerSpike {
  private readonly pythonPath: string;
  private readonly referencePath: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly workerPath: string;

  constructor(config: AmtSessionPlayerConfig = {}) {
    const root = join(import.meta.dir, "../../..");
    this.pythonPath = config.pythonPath ?? process.env.PEITHO_AMT_PYTHON ?? join(root, ".venv-amt/bin/python");
    this.referencePath = config.referencePath ?? join(root, ".contrib/ai-models/anticipation");
    this.model = config.model ?? process.env.PEITHO_AMT_MODEL ?? DEFAULT_MODEL;
    this.timeoutMs = config.timeoutMs ?? 10 * 60_000;
    this.workerPath = join(import.meta.dir, "../scripts/amt-session-player.py");
  }

  async generate(request: AmtSessionPlayerRequest): Promise<AmtSessionPlayerResult> {
    if (!existsSync(this.pythonPath)) {
      throw new Error(
        `AMT Python runtime not found at ${this.pythonPath}. Create .venv-amt with Python 3.11 and install the AMT spike dependencies.`,
      );
    }
    if (!existsSync(this.referencePath)) {
      throw new Error(`AMT reference source not found at ${this.referencePath}`);
    }

    const workerRequest = buildAmtWorkerRequest(request, this.model);
    const child = Bun.spawn([this.pythonPath, this.workerPath], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        PEITHO_AMT_REFERENCE: this.referencePath,
      },
    });

    child.stdin.write(JSON.stringify(workerRequest));
    child.stdin.end();

    const timeout = setTimeout(() => child.kill(), this.timeoutMs);
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]).finally(() => clearTimeout(timeout));

    if (exitCode !== 0) {
      const detail = stderr.trim().slice(-4000) || `worker exited with code ${exitCode}`;
      throw new Error(`AMT generation failed: ${detail}`);
    }

    let workerResult: AmtWorkerResult;
    try {
      workerResult = JSON.parse(stdout) as AmtWorkerResult;
    } catch {
      throw new Error(`AMT worker returned invalid JSON: ${stdout.slice(0, 500)}`);
    }

    const secondsPerStep = 60 / request.tempo / request.stepsPerBeat;
    const totalSteps = request.bars * request.beatsPerBar * request.stepsPerBeat;
    const notes = workerResult.notes
      .map((note) => ({
        step: Math.max(0, Math.min(totalSteps - 1, Math.round(note.startSeconds / secondsPerStep))),
        len: Math.max(1, Math.round(note.durationSeconds / secondsPerStep)),
        midi: Math.max(0, Math.min(127, Math.round(note.pitch))),
        vel: 90,
      }))
      .filter((note) => note.step < totalSteps)
      .map((note) => ({ ...note, len: Math.min(note.len, totalSteps - note.step) }))
      .sort((a, b) => a.step - b.step || a.midi - b.midi);

    return {
      role: request.role,
      program: workerRequest.program,
      notes,
      source: {
        provider: "amt",
        model: this.model,
        seed: workerRequest.seed,
        conditions: {
          topP: workerRequest.topP,
          controlEventCount: workerRequest.controls.length,
          experimental: true,
        },
      },
      warnings: [
        `experimental Python reference runtime on ${workerResult.device}`,
        "target program is sampler-masked; style and playability controls are not implemented",
      ],
    };
  }
}
