function isIterable(obj) {
  return obj != null && typeof obj[Symbol.iterator] === 'function';
}

/**
 * An async utility function that processes items in a non-blocking way,
 * yielding periodically to keep the UI responsive.
 *
 * @param {Array} items - The array of items to process
 * @param {Function} processFn - The function to call for each item
 * @param {Object} [options] - Optional config
 * @param {number} [options.fps=30] - The target frames per second
 * @param {number} [options.hiddenThreshold=500] - Yield threshold (ms) when the document is hidden
 */
export default async function yieldyForLoop(
  items,
  processFn,
  { fps = 30, hiddenThreshold = 500 } = {}
) {
  if (!isIterable(items)) {
    throw new TypeError("items must be iterable");
  }
  if (typeof processFn !== "function") {
    throw new TypeError("processFn must be a function");
  }

  const BATCH_DURATION = 1000 / fps; // e.g. 33ms for ~30 FPS
  let timeOfLastYield = performance.now();

  function shouldYield() {
    const now = performance.now();
    // If document is hidden, wait longer before yielding (hiddenThreshold ms)
    const threshold = document.hidden ? hiddenThreshold : BATCH_DURATION;
    if (now - timeOfLastYield > threshold) {
      timeOfLastYield = now;
      return true;
    }
    return false;
  }

  for (const item of items) {
    if (shouldYield()) {
      if (document.hidden) {
        // If the document is hidden, just do a quick setTimeout
        await new Promise((resolve) => setTimeout(resolve, 1));
        timeOfLastYield = performance.now();
      } else {
        // If visible, use a small race between a timeout & requestAnimationFrame
        await Promise.race([
          new Promise((resolve) => setTimeout(resolve, 100)),
          new Promise(requestAnimationFrame),
        ]);
        timeOfLastYield = performance.now();

        // If the Scheduler API is available, yield
        if (
          typeof scheduler !== "undefined" &&
          typeof scheduler.yield === "function"
        ) {
          await scheduler.yield();
        }
      }
    }

    // Process the item
    processFn(item);
  }
}
