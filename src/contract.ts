/**
 * Odczyt stanu z kontraktu OneNFT. Gdy CONTRACT_ADDRESS nie jest ustawione,
 * strona działa w trybie bramki 1 (sam renderer, bez łańcucha).
 */
import { createPublicClient, http, parseAbi, type Address } from "viem";
import { base, baseSepolia } from "viem/chains";

export const CONTRACT = (process.env.CONTRACT_ADDRESS ?? "") as Address | "";
export const CHAIN_ID = Number(process.env.CHAIN_ID ?? (CONTRACT ? 84532 : 0));
export const chain = CHAIN_ID === 8453 ? base : baseSepolia;

export const ABI = parseAbi([
  "function currentDay() view returns (uint256)",
  "function startEpoch() view returns (uint256)",
  "function author() view returns (address)",
  "function renderer() view returns (address)",
  "function rendererLocked() view returns (bool)",
  "function secondsLeft() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function isAuthorDay(uint256 day) pure returns (bool)",
  "function claim() returns (uint256)",
]);

export type ChainState = {
  address: Address;
  chainId: number;
  day: number;
  startEpoch: bigint;
  author: Address;
  rendererLocked: boolean;
  secondsLeft: number;
  /** doba → właściciel; brak wpisu = doba jeszcze niczyja (dziś) albo dziura (wcześniej). */
  owners: Map<number, Address>;
};

let cache: { at: number; state: ChainState } | null = null;
const TTL_MS = 12_000;

const client = CONTRACT
  ? createPublicClient({ chain, transport: http(process.env.BASE_RPC_URL) })
  : null;

export function contractEnabled(): boolean {
  return Boolean(client && CONTRACT);
}

export async function chainState(): Promise<ChainState | null> {
  if (!client || !CONTRACT) return null;
  if (cache && Date.now() - cache.at < TTL_MS) return cache.state;
  const c = { address: CONTRACT, abi: ABI } as const;
  const [dayBn, startEpoch, author, rendererLocked, secondsLeftBn] = await client.multicall({
    contracts: [
      { ...c, functionName: "currentDay" },
      { ...c, functionName: "startEpoch" },
      { ...c, functionName: "author" },
      { ...c, functionName: "rendererLocked" },
      { ...c, functionName: "secondsLeft" },
    ],
    allowFailure: false,
  });
  const day = Number(dayBn);
  const owners = new Map<number, Address>();
  if (day > 0) {
    const ids = Array.from({ length: day }, (_, i) => BigInt(i + 1));
    const res = await client.multicall({
      contracts: ids.map((id) => ({ ...c, functionName: "ownerOf" as const, args: [id] as const })),
      allowFailure: true,
    });
    res.forEach((r, i) => {
      if (r.status === "success") owners.set(i + 1, r.result as Address);
    });
  }
  const state: ChainState = { address: CONTRACT, chainId: CHAIN_ID, day, startEpoch, author, rendererLocked, secondsLeft: Number(secondsLeftBn), owners };
  cache = { at: Date.now(), state };
  return state;
}
