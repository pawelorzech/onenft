/**
 * Reverse ENS lookup so owners read as names, not hex. ENS lives on Ethereum
 * L1, so this is the one place the site talks to a chain other than Base.
 * Failures fall back to the address; nothing on the page depends on this.
 */
import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";

const client = createPublicClient({ chain: mainnet, transport: http(process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com", { timeout: 2500 }) });
const cache = new Map<string, { at: number; name: string | null }>();
const TTL_MS = 6 * 3600 * 1000;

export async function ensNames(addresses: Address[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const now = Date.now();
  const todo = [...new Set(addresses.map((a) => a.toLowerCase()))].filter((a) => {
    const c = cache.get(a);
    if (c && now - c.at < TTL_MS) {
      if (c.name) out.set(a, c.name);
      return false;
    }
    return true;
  });
  await Promise.all(
    todo.map(async (a) => {
      let name: string | null = null;
      try {
        name = await client.getEnsName({ address: a as Address });
      } catch {}
      cache.set(a, { at: now, name });
      if (name) out.set(a, name);
    }),
  );
  return out;
}
