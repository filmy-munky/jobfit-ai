/**
 * Local sentence embeddings via @xenova/transformers.
 *
 * The model is lazy-loaded and cached globally so we pay the cold-start cost once
 * per process. Use `embedBatch` for efficiency when you have multiple inputs.
 */
import { env, pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

// Cache models under the project so repeated dev runs don't re-download.
env.cacheDir = "./.cache";
env.allowLocalModels = true;

let _pipe: FeatureExtractionPipeline | null = null;
let _loading: Promise<FeatureExtractionPipeline> | null = null;

async function getPipe(): Promise<FeatureExtractionPipeline> {
  if (_pipe) return _pipe;
  if (!_loading) {
    _loading = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2") as Promise<FeatureExtractionPipeline>;
  }
  _pipe = await _loading;
  return _pipe;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const pipe = await getPipe();
  const output = await pipe(texts, { pooling: "mean", normalize: true });
  // output.data is a Float32Array of shape [batch * dim]; reshape it.
  const dim = output.dims[output.dims.length - 1];
  const batch = texts.length;
  const flat = Array.from(output.data as Float32Array);
  const vectors: number[][] = [];
  for (let i = 0; i < batch; i++) {
    vectors.push(flat.slice(i * dim, (i + 1) * dim));
  }
  return vectors;
}

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
