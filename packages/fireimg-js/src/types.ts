export type Quality = "low" | "medium" | "high" | `${number}`;

export type Format = "auto" | "webp" | "avif" | "jpg" | "png";

export type Fit = "fill" | "cover" | "contain";

export type Position = "center" | "top" | "bottom" | "left" | "right";

export interface FireimgConfig {
  project: string;
  baseUrl?: string;
}

export interface ImageOptions {
  /** Output width in pixels. Omit both width and height to use the raw image dimensions (still applies fmt/quality). */
  width?: number;
  /** Output height in pixels. Omit both width and height to use the raw image dimensions. */
  height?: number;
  quality?: Quality;
  /** Output format. `auto` uses `Accept` (AVIF → WebP → JPEG, or AVIF → WebP → PNG for PNG/GIF) with extension-based fallback when `Accept` is empty. */
  fmt?: Format;
  /** Applied only when both `width` and `height` are set (omitted from the URL otherwise). */
  fit?: Fit;
  /** Applied only when both `width` and `height` are set (omitted from the URL otherwise). */
  pos?: Position;
  /**
   * Letterbox fill for `fit: "contain"`. Use `transparent` for alpha-capable output formats; use a hex color (`#RRGGBB` or `#RGB`) for solid color (e.g. for JPEG).
   */
  fill?: string;
}

export interface SnapOptions extends ImageOptions {
  /** Snap the width to the nearest multiple of this value (e.g. 100) */
  snapStep?: number;
}
