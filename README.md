# Yieldy For Loop

A tiny utility to process large loops in a non-blocking way by yielding periodically, ensuring your UI stays responsive even under heavy iteration.

Inspired by [“Breaking up with long tasks, or how I learned to group loops and wield the yield” (PerfPlanet 2024)](https://calendar.perfplanet.com/2024/breaking-up-with-long-tasks-or-how-i-learned-to-group-loops-and-wield-the-yield/).

## Features

- Periodically yields to the browser to keep your app’s UI smooth.
- Automatically adjusts yield threshold if the document is hidden.
- Leverages `requestAnimationFrame` and a small timeout race.
- Optionally calls `scheduler.yield()` when available.
- Works with any iterable (not just arrays).

## Installation

```bash
npm install yieldy-for-loop
```

## Usage

```js
import yieldyForLoop from "yieldy-for-loop";

const items = Array.from({ length: 100000 }, (_, i) => i);

function processItem(item) {
  // Your heavy computation
  console.log("Processing item:", item);
}

(async function main() {
  console.log("Starting yieldy loop...");

  await yieldyForLoop(items, processItem, {
    fps: 30,            // optional, default is 30
    hiddenThreshold: 500 // optional, default is 500
  });

  console.log("Done processing!");
})();
```

## API

```ts
yieldyForLoop<T>(
  items: Iterable<T>, 
  processFn: (item: T) => void, 
  options?: {
    fps?: number;              // default 30
    hiddenThreshold?: number;  // default 500 ms
  }
): Promise<void>;
```

**Parameters:**

- **items**: An iterable collection of items you want to process.  
- **processFn**: A function that processes each item in the collection.  
- **options**:  
  - `fps` (number): Target frames per second; used to calculate how long each batch can run before yielding.  
  - `hiddenThreshold` (number): Yield threshold (in ms) if the document is hidden.  

## How It Works

1. **Time Slice:** It calculates a `BATCH_DURATION` from the desired FPS (e.g., 30 FPS = 33 ms).  
2. **Yield Check:** Before each item, it checks if the time since the last yield exceeds the threshold (based on whether the document is visible or hidden).  
3. **Yielding:**
   - If the document is hidden, it does a quick `setTimeout` to yield.  
   - If the document is visible, it waits for either a 100 ms timeout or the next animation frame, then optionally uses the [Scheduler API](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler) (`scheduler.yield()`) if available.  
4. **Process the Item:** Only after yielding (if needed), it calls your `processFn`.  

## Why Use It?

When you have long-running loops—like processing large arrays or performing expensive computations on each iteration—the main thread can get blocked, causing the UI to freeze. By periodically yielding control to the browser, you let the UI stay responsive, handle user interactions, and remain smooth.

## Inspiration

- [“Breaking up with long tasks, or how I learned to group loops and wield the yield” (PerfPlanet 2024)](https://calendar.perfplanet.com/2024/breaking-up-with-long-tasks-or-how-i-learned-to-group-loops-and-wield-the-yield/)  
- The need to maintain a smooth ~30FPS rendering while processing large sets of data.

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or pull request on GitHub.

## License

[MIT](./LICENSE)
