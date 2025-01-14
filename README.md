# yieldy-for
A tiny utility for iterating over large arrays (or any iterable) in a non-blocking, “yieldy” way, inspired by the article “Breaking up with long tasks, or how I learned to group loops and wield the yield” (PerfPlanet 2024). It helps avoid freezing the main thread by periodically yielding control back to the browser.
