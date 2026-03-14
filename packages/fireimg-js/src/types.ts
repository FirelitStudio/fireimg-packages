export type Quality = "low" | "medium" | "high" | `${number}`;

export type Format = "auto" | "webp" | "avif" | "jpg" | "png";

export type Fit = "fill" | "cover" | "contain";

export type Position = "center" | "top" | "bottom" | "left" | "right";

export interface FireimgConfig {
  project: string;
  baseUrl?: string;
}

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: Quality;
  fmt?: Format;
  fit?: Fit;
  pos?: Position;
}

export interface SnapOptions extends ImageOptions {
  /** Snap the width to the nearest multiple of this value (e.g. 100) */
  snapStep?: number;
}
