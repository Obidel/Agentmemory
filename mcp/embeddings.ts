import type { Memory } from '../src/types/index.js';

const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;
const MAX_BATCH = 32;

export interface Embedder {
  embed(texts: string[]): Promise<number[][]>;
  readonly model: string;
  readonly dim: number;
}

function parseVector(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return null;
  if (Array.isArray(raw[0])) return null;
  const nums: number[] = [];
  for (const v of raw) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    nums.push(v);
  }
  return nums;
}

export function createHuggingFaceEmbedder(apiKey: string | undefined): Embedder {
  const dim = 384;
  const model = HF_MODEL;
  if (!apiKey) {
    return {
      model, dim,
      async embed(): Promise<number[][]> {
        throw new Error('HUGGINGFACE_API_KEY is not set. Get a free key at https://huggingface.co/settings/tokens and add it to your Vercel env (or .env).');
      },
    };
  }
  return {
    model, dim,
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];
      const out: number[][] = [];
      for (let i = 0; i < texts.length; i += MAX_BATCH) {
        const batch = texts.slice(i, i + MAX_BATCH);
        const res = await fetch(HF_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: batch, options: { wait_for_model: true } }),
        });
        if (!res.ok) {
          const err = await res.text().catch(() => '');
          throw new Error(`HuggingFace embedding failed: ${res.status} ${err.slice(0, 200)}`);
        }
        const json: unknown = await res.json();
        if (!Array.isArray(json)) {
          throw new Error('HuggingFace embedding response is not an array');
        }
        for (const item of json) {
          const vec = parseVector(item);
          if (!vec || vec.length !== dim) {
            throw new Error(`Unexpected embedding shape: expected length ${dim}, got ${vec?.length ?? 'null'}`);
          }
          out.push(vec);
        }
      }
      return out;
    },
  };
}

export function createLocalEmbedder(): Embedder {
  return {
    model: 'hash-20',
    dim: 20,
    async embed(texts: string[]): Promise<number[][]> {
      return texts.map(textToHashVector);
    },
  };
}

function textToHashVector(text: string): number[] {
  const vec = new Array<number>(20).fill(0);
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  for (const t of tokens) {
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    vec[h % 20] += 1;
  }
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map(v => v / norm);
}

export function memoryToText(m: Pick<Memory, 'content' | 'category' | 'tags' | 'project_name'>): string {
  return [
    m.category,
    m.project_name,
    ...(m.tags ?? []),
    m.content,
  ].join(' • ');
}
