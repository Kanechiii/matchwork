import { EMBEDDED_ONNX_MODEL_BASE64 } from "./model";
import { STATE_LABELS, type MatchStateLabel, type WindowFeatures } from "./features";

export interface MatchPrediction {
  label: MatchStateLabel;
  probabilities: [number, number, number];
  confidence: number;
  backend: "onnxruntime-web";
}

interface OutputTensor { data: Float32Array | number[] }
interface Session {
  run(feeds: Record<string, unknown>): Promise<Record<string, OutputTensor>>;
}
interface OrtApi {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => unknown;
  InferenceSession: {
    create(data: Uint8Array, options: { executionProviders: string[] }): Promise<Session>;
  };
}

const VERSION = "1.23.2";
const CDN_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${VERSION}/dist/`;
let cached: Promise<{ session: Session; ort: OrtApi }> | null = null;

function decodeModel(): Uint8Array {
  const binary = atob(EMBEDDED_ONNX_MODEL_BASE64);
  return Uint8Array.from(binary, (value) => value.charCodeAt(0));
}

/**
 * Loads Microsoft's real ONNX Runtime Web WASM inference backend.
 * Dependency is version-pinned; the UI explicitly reports failures, rather
 * than passing a rule-based result off as an AI prediction.
 */
export function loadMatchModel(): Promise<{ session: Session; ort: OrtApi }> {
  if (!cached) {
    cached = (async () => {
      // Vite preserves this runtime ESM import instead of resolving a Node package.
      const url = `${CDN_BASE}ort.min.mjs`;
      const ort = (await import(/* @vite-ignore */ url)) as OrtApi;
      ort.env.wasm.wasmPaths = CDN_BASE;
      ort.env.wasm.numThreads = 1;
      const session = await ort.InferenceSession.create(decodeModel(), {
        executionProviders: ["wasm"],
      });
      return { session, ort };
    })().catch((error: unknown) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}

export async function predictMatchState(features: WindowFeatures): Promise<MatchPrediction> {
  if (features.values.length !== 7 ||
      features.values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    throw new Error("Invalid match features");
  }
  const { session, ort } = await loadMatchModel();
  const input = new ort.Tensor("float32", Float32Array.from(features.values), [1, 7]);
  const output = await session.run({ features: input });
  const data = output.probabilities?.data;
  if (!data || data.length !== 3) throw new Error("Unexpected ONNX model output");
  const probabilities = Array.from(data) as [number, number, number];
  const sum = probabilities.reduce((a, b) => a + b, 0);
  if (probabilities.some((n) => !Number.isFinite(n) || n < 0) || Math.abs(sum - 1) > 0.01) {
    throw new Error("Invalid ONNX probabilities");
  }
  const best = probabilities.indexOf(Math.max(...probabilities));
  return {
    label: STATE_LABELS[best],
    probabilities,
    confidence: probabilities[best],
    backend: "onnxruntime-web",
  };
}
