/**
 * Numer bloku Base i wyprowadzona z niego doba.
 *
 * Źródłem prawdy jest publiczny RPC. Gdy nie odpowiada, blok jest szacowany
 * z ostatniej znanej pary (blok, czas) przy 2 s/blok, żeby strona nigdy nie
 * pokazywała pustki ani nie zamarzała na wczorajszej dobie.
 */
import { EPOCH_BLOCKS, epochOf } from "./knot.ts";

export const RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
export const BLOCK_SECONDS = 2;

/** Epoka, w której projekt wystartował — to jest doba 1. */
export let START_EPOCH = BigInt(process.env.START_EPOCH ?? "1178");
/** Gdy działa kontrakt, jego startEpoch jest prawdą; serwer ustawia to raz na starcie. */
export function setStartEpoch(e: bigint): void {
  START_EPOCH = e;
}

/** Ostatnia zaobserwowana para (blok, unix s). Startowo: kotwica z dnia wdrożenia. */
let anchor = { block: 50_886_859n, at: 1_788_563_065 };
let lastFetch = 0;
const TTL_MS = 20_000;

export async function fetchBlockNumber(): Promise<bigint> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }),
    signal: AbortSignal.timeout(4000),
  });
  const json = (await res.json()) as { result?: string };
  if (!json.result) throw new Error("RPC bez result");
  return BigInt(json.result);
}

export function estimateBlock(now = Date.now() / 1000): bigint {
  const elapsed = Math.max(0, Math.floor(now - anchor.at));
  return anchor.block + BigInt(Math.floor(elapsed / BLOCK_SECONDS));
}

/** Aktualny blok z cache TTL 20 s; przy błędzie RPC — estymacja. */
export async function currentBlock(): Promise<{ block: bigint; estimated: boolean }> {
  const now = Date.now();
  if (now - lastFetch < TTL_MS) return { block: estimateBlock(), estimated: false };
  try {
    const block = await fetchBlockNumber();
    anchor = { block, at: now / 1000 };
    lastFetch = now;
    return { block, estimated: false };
  } catch {
    return { block: estimateBlock(), estimated: true };
  }
}

export type Day = {
  /** Numer doby liczony od 1 (doba 1 = START_EPOCH). */
  n: number;
  epoch: bigint;
  /** Pierwszy blok tej doby. */
  firstBlock: bigint;
};

export function dayOfEpoch(epoch: bigint): Day | null {
  if (epoch < START_EPOCH) return null;
  return { n: Number(epoch - START_EPOCH) + 1, epoch, firstBlock: epoch * EPOCH_BLOCKS };
}

export function dayOfBlock(block: bigint): Day | null {
  return dayOfEpoch(epochOf(block));
}

export function dayByNumber(n: number): Day | null {
  if (!Number.isInteger(n) || n < 1) return null;
  return dayOfEpoch(START_EPOCH + BigInt(n - 1));
}

/** Sekundy do pierwszego bloku doby 1; 0, gdy już trwa. */
export function secondsToStart(block: bigint): number {
  const first = START_EPOCH * EPOCH_BLOCKS;
  return block >= first ? 0 : Number(first - block) * BLOCK_SECONDS;
}

/** Sekundy do końca doby, w której jest `block`. */
export function secondsLeft(block: bigint): number {
  const next = (epochOf(block) + 1n) * EPOCH_BLOCKS;
  return Number(next - block) * BLOCK_SECONDS;
}
