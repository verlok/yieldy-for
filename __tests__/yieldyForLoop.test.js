import { describe, it, expect, vi, beforeEach } from "vitest";
import yieldyForLoop from "../src/index.js";

function setupMockPerformanceNow(startTime = 1000) {
  let currentTime = startTime;
  const spy = vi
    .spyOn(performance, "now")
    .mockImplementation(() => currentTime);
  return {
    advanceBy: (ms) => {
      currentTime += ms;
    },
    restore: () => {
      spy.mockRestore();
    },
  };
}

function setupMockRequestAnimationFrame() {
  return vi.spyOn(global, "requestAnimationFrame").mockImplementation((cb) => {
    cb(performance.now());
    return 0;
  });
}

function setupMockSetTimeout() {
  return vi.spyOn(global, "setTimeout").mockImplementation((cb, ms) => {
    cb();
    return 0;
  });
}

function setupMockSchedulerYield() {
  if (typeof global.scheduler === "undefined") {
    global.scheduler = {};
  }
  global.scheduler.yield = () => Promise.resolve();
  return vi.spyOn(global.scheduler, "yield");
}

describe("yieldyForLoop", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
  });

  it("processes all items (basic test)", async () => {
    const items = [1, 2, 3];
    const processFn = vi.fn();

    await yieldyForLoop(items, processFn);

    expect(processFn).toHaveBeenCalledTimes(3);
    expect(processFn).toHaveBeenNthCalledWith(1, 1);
    expect(processFn).toHaveBeenNthCalledWith(2, 2);
    expect(processFn).toHaveBeenNthCalledWith(3, 3);
  });

  it("handles an empty array without errors", async () => {
    const items = [];
    const processFn = vi.fn();

    await yieldyForLoop(items, processFn);

    expect(processFn).not.toHaveBeenCalled();
  });

  it("yields when document is hidden (checking setTimeout usage)", async () => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });

    const setTimeoutSpy = setupMockSetTimeout();

    const items = [1, 2];
    const processFn = vi.fn();

    await yieldyForLoop(items, processFn, { hiddenThreshold: 0 });

    expect(processFn).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it("works with a large array (smoke test)", async () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const processFn = vi.fn();

    await yieldyForLoop(items, processFn);

    expect(processFn).toHaveBeenCalledTimes(1000);
  });

  it("respects the fps option by yielding when time exceeds threshold", async () => {
    const { advanceBy } = setupMockPerformanceNow();
    setupMockRequestAnimationFrame();
    global.scheduler = { yield: () => Promise.resolve() };
    const schedulerYieldSpy = vi.spyOn(global.scheduler, "yield");
    const items = Array.from({ length: 50 }, (_, i) => i);
    let count = 0;
    const processFn = vi.fn().mockImplementation(() => {
      count++;
      advanceBy(5);
      if (count % 10 === 0) {
        advanceBy(1100);
      }
    });
    await yieldyForLoop(items, processFn, { fps: 1 });
    expect(processFn).toHaveBeenCalledTimes(50);
    expect(schedulerYieldSpy).toHaveBeenCalled();
  });

  it("only yields when needed, and still processes everything in a timely manner", async () => {
    const mockPerf = setupMockPerformanceNow();
    const rafSpy = setupMockRequestAnimationFrame();
    const setTimeoutSpy = setupMockSetTimeout();
    const items = [1, 2, 3, 4, 5];
    const processFn = vi.fn();
    await yieldyForLoop(items, processFn, { fps: 30 });
    expect(processFn).toHaveBeenCalledTimes(5);
    expect(rafSpy).not.toHaveBeenCalled();
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    mockPerf.restore();
  });

  it("handles thrown errors from processFn gracefully (test error handling)", async () => {
    const items = [1, 2];
    const errorFn = vi.fn().mockImplementation((item) => {
      if (item === 2) throw new Error("Test error");
    });

    await expect(yieldyForLoop(items, errorFn)).rejects.toThrow("Test error");
    expect(errorFn).toHaveBeenCalledTimes(2);
  });
});
