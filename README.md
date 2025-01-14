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
