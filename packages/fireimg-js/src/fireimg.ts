import type { FireimgConfig, ImageOptions, SnapOptions } from "./types";

const DEFAULT_BASE_URL = "https://i.fireimg.com";
const MAX_DIMENSION = 4000;

let _defaultConfig: FireimgConfig | null = null;
let _defaultInstance: ReturnType<typeof createFireimg> | null = null;

function resolveEnv(name: string): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    return typeof g.process !== "undefined" ? g.process.env?.[name] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Set the default configuration used by `getDefaultFireimg()` and the React
 * `<FireImg>` component.  Call once at application startup.
 */
export function configureFireimg(config: FireimgConfig): void {
  _defaultConfig = config;
  _defaultInstance = null;
}

/**
 * Return (and lazily create) the default Fireimg instance.
 * Uses the config set by `configureFireimg()`, falling back to the
 * `FIREIMG_PROJECT` / `FIREIMG_BASE_URL` environment variables.
 */
export function getDefaultFireimg(): ReturnType<typeof createFireimg> {
  if (_defaultInstance) return _defaultInstance;

  const project =
    _defaultConfig?.project ?? resolveEnv("FIREIMG_PROJECT") ?? "";
  const baseUrl =
    _defaultConfig?.baseUrl ?? resolveEnv("FIREIMG_BASE_URL");

  _defaultInstance = createFireimg({ project, ...(baseUrl && { baseUrl }) });
  return _defaultInstance;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Round a number up to the nearest multiple of `step`.
 * E.g. snapUp(237, 100) => 300
 */
export function snapUp(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.ceil(value / step) * step;
}

export function createFireimg(config: FireimgConfig) {
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const project = config.project;

  if (!project) {
    throw new Error("@fireimg/js: `project` is required");
  }

  /**
   * Build the full CDN URL for an image with the given options.
   */
  function getUrl(imageKey: string, options: ImageOptions = {}): string {
    const key = imageKey.replace(/^\/+/, "");
    const params = new URLSearchParams();

    if (options.width != null && options.width > 0) {
      params.set("width", String(clamp(Math.round(options.width), 1, MAX_DIMENSION)));
    }
    if (options.height != null && options.height > 0) {
      params.set("height", String(clamp(Math.round(options.height), 1, MAX_DIMENSION)));
    }
    if (options.quality) {
      params.set("quality", options.quality);
    }
    if (options.fmt) {
      params.set("fmt", options.fmt);
    }
    if (options.fit) {
      params.set("fit", options.fit);
    }
    if (options.pos) {
      params.set("pos", options.pos);
    }

    const qs = params.toString();
    return `${baseUrl}/${project}/images/${key}${qs ? `?${qs}` : ""}`;
  }

  /**
   * Build a URL after snapping width to the nearest `snapStep` (rounding up).
   * Useful for creating a finite set of cached sizes based on available screen space.
   */
  function getSnappedUrl(imageKey: string, availableWidth: number, options: SnapOptions = {}): string {
    const { snapStep = 100, ...imageOptions } = options;
    const snappedWidth = clamp(snapUp(availableWidth, snapStep), 1, MAX_DIMENSION);
    return getUrl(imageKey, { ...imageOptions, width: snappedWidth });
  }

  /**
   * Build a srcset string with multiple snapped widths for responsive images.
   * Generates entries from `minWidth` to `maxWidth` at `snapStep` intervals.
   */
  function getSrcSet(
    imageKey: string,
    options: ImageOptions & { snapStep?: number; minWidth?: number; maxWidth?: number } = {},
  ): string {
    const { snapStep = 100, minWidth = 100, maxWidth = 2000, ...imageOptions } = options;
    const entries: string[] = [];

    for (let w = minWidth; w <= maxWidth; w += snapStep) {
      const clamped = clamp(w, 1, MAX_DIMENSION);
      const url = getUrl(imageKey, { ...imageOptions, width: clamped });
      entries.push(`${url} ${clamped}w`);
    }

    return entries.join(", ");
  }

  return { getUrl, getSnappedUrl, getSrcSet };
}
