#!/usr/bin/env python3
"""One-request AMT research worker. Reference source remains read-only."""

import json
import os
import sys


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


reference = os.environ.get("PEITHO_AMT_REFERENCE")
if not reference:
    fail("PEITHO_AMT_REFERENCE is not set")

sys.path.insert(0, reference)

try:
    import torch
    from transformers import AutoModelForCausalLM
    from anticipation import ops
    from anticipation.config import DELTA, MAX_DUR, MAX_NOTE, MAX_PITCH, TIME_RESOLUTION
    from anticipation.sample import generate
    import anticipation.sample as sample_module
    from anticipation.vocab import CONTROL_OFFSET, DUR_OFFSET, NOTE_OFFSET, REST, TIME_OFFSET
except Exception as error:
    fail(f"AMT dependencies unavailable: {error}")


request = json.load(sys.stdin)
program = int(request["program"])
if program < 0 or program > 128:
    fail("program must be between 0 and 128")

seed = int(request.get("seed", 0))
torch.manual_seed(seed)

device = "mps" if torch.backends.mps.is_available() else "cpu"
model = AutoModelForCausalLM.from_pretrained(request["model"])
model.to(device)
model.eval()


def target_program_logits(logits, _full_history):
    """Restrict generated note tokens to the requested General MIDI program."""
    allowed_start = NOTE_OFFSET + program * MAX_PITCH
    allowed_end = allowed_start + MAX_PITCH
    logits[NOTE_OFFSET:allowed_start] = -float("inf")
    logits[allowed_end:NOTE_OFFSET + MAX_NOTE] = -float("inf")
    logits[REST] = -float("inf")
    return logits


sample_module.instr_logits = target_program_logits

lead_seconds = float(DELTA)
controls = []
for event in request["controls"]:
    start = int(round((float(event["startSeconds"]) + lead_seconds) * TIME_RESOLUTION))
    duration = max(1, min(MAX_DUR - 1, int(round(float(event["durationSeconds"]) * TIME_RESOLUTION))))
    pitch = max(0, min(127, int(event["pitch"])))
    control_program = max(0, min(128, int(event["program"])))
    controls.extend([
        CONTROL_OFFSET + TIME_OFFSET + start,
        CONTROL_OFFSET + DUR_OFFSET + duration,
        CONTROL_OFFSET + NOTE_OFFSET + control_program * MAX_PITCH + pitch,
    ])

events = generate(
    model,
    start_time=lead_seconds,
    end_time=lead_seconds + float(request["durationSeconds"]),
    inputs=[],
    controls=controls,
    top_p=float(request["topP"]),
)

notes = []
for time_token, duration_token, note_token in zip(events[0::3], events[1::3], events[2::3]):
    if note_token < NOTE_OFFSET:
        continue
    encoded_note = note_token - NOTE_OFFSET
    event_program = encoded_note // MAX_PITCH
    if event_program != program:
        continue
    start_seconds = (time_token - TIME_OFFSET) / TIME_RESOLUTION - lead_seconds
    if start_seconds < 0 or start_seconds >= float(request["durationSeconds"]):
        continue
    notes.append({
        "startSeconds": start_seconds,
        "durationSeconds": max(0.01, (duration_token - DUR_OFFSET) / TIME_RESOLUTION),
        "pitch": encoded_note % MAX_PITCH,
    })

print(json.dumps({"notes": notes, "device": device}, separators=(",", ":")))
