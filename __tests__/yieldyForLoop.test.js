import { describe, it, expect, vi, beforeEach } from "vitest";
import yieldyForLoop from "../src/index.js";

/**
 * Helper to mock performance.now()
 * Allows us to 'advance' time in a controlled way.
 */
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
    return 0; // ID placeholder
  });
}

function setupMockSetTimeout() {
  // Immediately invokes the callback
  return vi.spyOn(global, "setTimeout").mockImplementation((cb, ms) => {
    cb();
    return 0; // Return a dummy timeout ID
  });
}

function setupMockSchedulerYield() {
  if (typeof global.scheduler === "undefined") {
    global.scheduler = {};
  }
  // If there's no 'yield' function, define one
  global.scheduler.yield = () => Promise.resolve();

  // Now spy on it
  return vi.spyOn(global.scheduler, "yield");
}

describe("yieldyForLoop", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Default to 'document.hidden = false'
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
    // Mark document as hidden
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });

    const setTimeoutSpy = setupMockSetTimeout();

    const items = [1, 2];
    const processFn = vi.fn();

    await yieldyForLoop(items, processFn, { hiddenThreshold: 0 });

    expect(processFn).toHaveBeenCalledTimes(2);
    // If each item triggered at least one yield, setTimeout might be called
    // but it depends on timing thresholds. Because items are only two, it might yield once or not.
    // For demonstration, just check that setTimeout was used at all:
    expect(setTimeoutSpy).toHaveBeenCalled();
  });

  it("works with a large array (smoke test)", async () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const processFn = vi.fn();

    await yieldyForLoop(items, processFn);

    // Ensure it processes all items
    expect(processFn).toHaveBeenCalledTimes(1000);
  });

  it("respects the fps option by yielding when time exceeds threshold", async () => {
    const { advanceBy } = setupMockPerformanceNow();
    setupMockRequestAnimationFrame();
  
    // Provide a global scheduler so it doesn't crash
    global.scheduler = { yield: () => Promise.resolve() };
    const schedulerYieldSpy = vi.spyOn(global.scheduler, "yield");
  
    // A bunch of items in one big array
    const items = Array.from({ length: 50 }, (_, i) => i);
  
    // We'll increment time after each item is processed,
    // and do a bigger jump every 10 items to exceed the threshold (1000 ms).
    let count = 0;
    const processFn = vi.fn().mockImplementation(() => {
      count++;
      // Advance a little each item (simulate minimal real time)
      advanceBy(5);
  
      // Every 10 items, jump 1100 ms, ensuring we cross the 1000 ms threshold
      if (count % 10 === 0) {
        advanceBy(1100);
      }
    });
  
    // fps=1 => threshold is ~1000 ms
    await yieldyForLoop(items, processFn, { fps: 1 });
  
    // Should have processed all items
    expect(processFn).toHaveBeenCalledTimes(50);
  
    // Because we artificially crossed 1000 ms multiple times, it should have yielded
    expect(schedulerYieldSpy).toHaveBeenCalled();
  });
  
  it("only yields when needed, and still processes everything in a timely manner", async () => {
    // This test demonstrates mocking performance to ensure we only yield
    // if time has passed the threshold.

    const mockPerf = setupMockPerformanceNow();
    // Start at t=1000ms
    const rafSpy = setupMockRequestAnimationFrame();
    const setTimeoutSpy = setupMockSetTimeout();

    const items = [1, 2, 3, 4, 5];
    const processFn = vi.fn();

    // fps = 30 => threshold ~ 33ms
    await yieldyForLoop(items, processFn, { fps: 30 });

    // Because we never advanced time, the code sees the same "now" each iteration,
    // so it might never think it's time to yield (depending on the logic).
    // But it will still process all items.
    expect(processFn).toHaveBeenCalledTimes(5);

    // Possibly no yields triggered if time never advanced
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

    // The first item might be processed normally
    expect(errorFn).toHaveBeenCalledTimes(2);
  });
});
