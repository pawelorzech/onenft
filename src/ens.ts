/**
 * ENS both ways so owners read as names, not hex, and /name.eth finds a wallet.
 * ENS lives on Ethereum L1, so this is the one place the site talks to a chain
 * other than Base. Failures fall back to the address; nothing depends on this.
 */
import { createPublicClient, http, isAddress, type Address } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

const client = createPublicClient({ chain: mainnet, transport: http(process.env.ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com", { timeout: 2500 }) });
const cache = new Map<string, { at: number; name: string | null }>();
const forward = new Map<string, { at: number; address: Address | null }>();
const TTL_MS = 6 * 3600 * 1000;
/** Both caches are keyed by whatever the network or a visitor hands in, so they are capped. */
const MAX_ENTRIES = 5000;

/**
 * A reverse record is a string the wallet's owner chose, and the universal
 * resolver checks only that it resolves back; it does not check the characters.
 * Names go into HTML and into paths, so only a name that is already in its
 * ENSIP-15 normal form and made of plain label characters gets through.
 * Anything else falls back to the address.
 */
export function safeName(name: string | null | undefined): string | null {
  if (!name || name.length > 255) return null;
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.eth$/.test(name)) return null;
  try {
    return normalize(name) === name ? name : null;
  } catch {
    return null;
  }
}

function trim<V>(m: Map<string, V>): void {
  if (m.size > MAX_ENTRIES) m.clear();
}

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
        name = safeName(await client.getEnsName({ address: a as Address }));
      } catch {}
      trim(cache);
      cache.set(a, { at: now, name });
      if (name) out.set(a, name);
    }),
  );
  return out;
}

/** An address as typed, or the address behind an ENS name; null if neither. */
export async function resolveHolder(input: string): Promise<Address | null> {
  if (isAddress(input)) return input;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i.test(input)) return null;
  const key = input.toLowerCase();
  const hit = forward.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.address;
  let address: Address | null = null;
  try {
    address = await client.getEnsAddress({ name: normalize(key) });
  } catch {}
  trim(forward);
  forward.set(key, { at: Date.now(), address });
  return address;
}
