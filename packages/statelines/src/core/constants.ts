/** Every figure is drawn into the same 5:4 frame, centred on the world origin. */
export const VIEWBOX = "-140 -139 280 224";

/** The order `play` walks through. */
export const PLAY_SEQUENCE = ["idle", "loading", "success", "idle", "loading", "error", "empty"] as const;

export const PLAY_INTERVAL_MS = 2600;
