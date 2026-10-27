import assert from "node:assert/strict";
import * as ort from "onnxruntime-web/wasm";
import { EMBEDDED_ONNX_MODEL_BASE64 } from "../src/ai/model.ts";
import { validateModelScores } from "../src/ai/inference.ts";

ort.env.wasm.numThreads = 1;
const modelBytes = Buffer.from(EMBEDDED_ONNX_MODEL_BASE64, "base64");
const session = await ort.InferenceSession.create(modelBytes, { executionProviders: ["wasm"] });
assert.ok(session.inputNames.includes("features"));
assert.ok(session.outputNames.includes("probabilities"));

for (const values of [
  [.9, .1, .05, .1, .5, .8, .5],
  [.5, .9, .2, .5, .75, .6, .7],
  [.65, .3, .85, .35, .9, .5, .7],
]) {
  const feeds = { features: new ort.Tensor("float32", Float32Array.from(values), [1,7]) };
  const result = await session.run(feeds);
  const probabilities = Array.from(result.probabilities.data);
  assert.deepEqual(validateModelScores(probabilities), probabilities);
  assert.equal(probabilities.length, 3);
  assert.ok(probabilities.every(x => Number.isFinite(x) && x >= 0 && x <= 1));
  assert.ok(Math.abs(probabilities.reduce((a,b) => a + b,0) - 1) < 0.001);
}
for (const invalid of [
  [], [1, 0], [1, 0, 0, 0], [NaN, 0, 1], [Infinity, 0, 0],
  [-0.1, 0.5, 0.6], [0.8, 0.8, -0.6], [0.5, 0.5, 0.5],
]) assert.throws(() => validateModelScores(invalid));
assert.throws(() => validateModelScores(undefined));
console.log("MATCHWORK ONNX RUNTIME SMOKE: PASS — valid outputs, invalid-score rejection");
