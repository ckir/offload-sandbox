import assert from "node:assert/strict";
import { test } from "node:test";
import { sum } from "../src/sum.mjs";

// The oracle. CI runs `node --test`; its exit status is the green/red signal the
// github-offload skill watches. To stage a FIXABLE red, break src/sum.mjs (e.g.
// `return a + b + 1`) — the auto-fix loop must restore it so this passes.
test("sum adds two numbers", () => {
  assert.equal(sum(2, 2), 4);
  assert.equal(sum(-1, 1), 0);
});
