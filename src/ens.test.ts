import { expect, test } from "bun:test";
import { safeName } from "./ens.ts";

test("a plain ENS name passes", () => {
  expect(safeName("pawelorzech.eth")).toBe("pawelorzech.eth");
  expect(safeName("sub.name-1.eth")).toBe("sub.name-1.eth");
});

test("a reverse record with markup or odd characters falls back to the address", () => {
  for (const bad of ["<script>alert(1)</script>.eth", 'a"b.eth', "x&y.eth", "a b.eth", "a/b.eth", "</title><script>.eth", "Pawel.eth", "🦄.eth", "under_score.eth", "noeth", "", null, undefined]) {
    expect(safeName(bad)).toBeNull();
  }
});

test("an absurdly long name is dropped", () => {
  expect(safeName("a".repeat(300) + ".eth")).toBeNull();
});
