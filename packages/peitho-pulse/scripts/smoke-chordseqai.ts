/**
 * Smoke test: verify all 7 ChordSeqAI ONNX models load and run inference
 * under the current runtime (Bun or Node.js).
 *
 * Reports: load time, inference time, output shape, pass/fail per model.
 *
 * Run:
 *   bun packages/peitho-pulse/scripts/smoke-chordseqai.ts
 *   node --input-type=module < packages/peitho-pulse/scripts/smoke-chordseqai.ts
 */

import * as ort from "onnxruntime-node";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MODELS_DIR = join(__dirname, "../models");

// 1,033 chord tokens (0–1032) + 2 special tokens (start=1033, end=1034)
const NUM_TOKENS = 1035;
const START_TOKEN = BigInt(NUM_TOKENS - 2); // 1033

const MODELS = [
  { name: "recurrent_net", conditional: false },
  { name: "transformer_small", conditional: false },
  { name: "transformer_medium", conditional: false },
  { name: "transformer_large", conditional: false },
  { name: "conditional_small", conditional: true },
  { name: "conditional_medium", conditional: true },
  { name: "conditional_large", conditional: true },
];

function makeSequence(): BigInt64Array {
  const data = new BigInt64Array(256).fill(BigInt(0));
  data[0] = START_TOKEN;
  return data;
}

// Neutral style: Rock (index 0) + decade 1980 (index 23)
function makeStyleVector(): Float32Array {
  const style = new Float32Array(28).fill(0);
  style[0] = 1.0;  // Rock
  style[23] = 1.0; // 1980
  return style;
}

async function testModel(name: string, conditional: boolean): Promise<boolean> {
  const modelPath = join(MODELS_DIR, `${name}.onnx`);
  process.stdout.write(`\n${name}\n`);

  const t0 = performance.now();
  let session: ort.InferenceSession;
  try {
    session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ["cpu"],
    });
  } catch (e) {
    console.log(`  LOAD FAILED: ${e}`);
    return false;
  }
  const loadMs = (performance.now() - t0).toFixed(0);
  console.log(`  load: ${loadMs}ms`);
  console.log(`  inputs: ${session.inputNames.join(", ")}`);

  const feeds: Record<string, ort.Tensor> = {
    "input.1": new ort.Tensor("int64", makeSequence(), [1, 256]),
  };
  if (conditional) {
    feeds["onnx::Gemm_1"] = new ort.Tensor("float32", makeStyleVector(), [1, 28]);
  }

  const t1 = performance.now();
  let outputs: ort.InferenceSession.OnnxValueMapType;
  try {
    outputs = await session.run(feeds);
  } catch (e) {
    console.log(`  INFERENCE FAILED: ${e}`);
    return false;
  }
  const inferMs = (performance.now() - t1).toFixed(0);

  const out = Object.values(outputs)[0] as ort.Tensor;
  const shapeOk = out.dims[0] === 1 && out.dims[2] === NUM_TOKENS;
  console.log(`  infer: ${inferMs}ms`);
  console.log(`  output shape: [${out.dims.join(", ")}]`);
  console.log(`  pass: ${shapeOk ? "YES" : "NO — unexpected shape"}`);
  return shapeOk;
}

// ───────────────────────────────────────────────
const runtime =
  typeof Bun !== "undefined" ? `Bun ${Bun.version}` : `Node.js ${process.version}`;

console.log(`ChordSeqAI ONNX smoke test`);
console.log(`Runtime: ${runtime}`);
console.log(`onnxruntime-node: ${ort.env.versions?.node ?? "(version unknown)"}`);
console.log(`Models: ${MODELS_DIR}`);

const results: { name: string; pass: boolean }[] = [];
for (const m of MODELS) {
  const pass = await testModel(m.name, m.conditional);
  results.push({ name: m.name, pass });
}

console.log("\n── Summary ──────────────────────────");
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
}

const allPassed = results.every((r) => r.pass);
console.log(`\n${allPassed ? "All models OK." : "Some models FAILED."}`);
process.exit(allPassed ? 0 : 1);
