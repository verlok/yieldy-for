import { describe, it, expect, vi } from "vitest";
import yieldyForLoop from "../src/index.js";

describe("yieldyForLoop", () => {
  it("processes all items", async () => {
    const items = [1, 2, 3];
    const processFn = vi.fn();

    await yieldyForLoop(items, processFn);

    expect(processFn).toHaveBeenCalledTimes(3);
    expect(processFn).toHaveBeenNthCalledWith(1, 1);
    expect(processFn).toHaveBeenNthCalledWith(2, 2);
    expect(processFn).toHaveBeenNthCalledWith(3, 3);
  });
});
