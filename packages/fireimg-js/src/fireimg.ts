import type { FireimgConfig, ImageOptions, SnapOptions } from "./types";

const DEFAULT_BASE_URL = "https://i.fireimg.com";
const MAX_DIMENSION = 4000;

/** Recommended token order for path-based variant segments. */
const PATH_PARAM_ORDER = ["width", "height", "quality", "fmt", "fit", "pos", "fill"] as const;

let _defaultConfig: FireimgConfig | null = null;
let _defaultInstance: ReturnType<typeof createFireimg> | null = null;

function resolveEnv(name: string): string | undefined {
  try {
    const proc = (
      globalThis as { process?: { env?: Record<string, string | undefined> } }
    ).process;
    return proc?.env?.[name];
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
 * Infer default output format from file extension (aligned with server negotiateAutoFormat
 * when fmt is auto or omitted).
 */
export function inferFmtFromImageKey(imageKey: string): "jpg" | "png" | "webp" | "avif" {
  const lower = imageKey.toLowerCase();
  if (lower.endsWith(".avif")) return "avif";
  if (lower.endsWith(".webp")) return "webp";
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".gif")) return "png";
  return "jpg";
}

/** Normalize quality to a token/query value (numeric string or low/medium/high). */
function normalizeQualityForPath(q: string): string {
  const s = q.trim().toLowerCase();
  if (s === "low" || s === "medium" || s === "high") return s;
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= 100) return String(n);
  return s;
}

/** Match CDN/server: `transparent` or 6 hex digits (optional `#`, 3-digit expands). */
function normalizeFillForPath(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (t === "transparent") return "transparent";
  let h = raw.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) {
    return "";
  }
  return h.toLowerCase();
}

function encodePathToken(key: (typeof PATH_PARAM_ORDER)[number], value: string): string {
  switch (key) {
    case "width":
      return `w_${value}`;
    case "height":
      return `h_${value}`;
    case "quality":
      return `q_${value}`;
    case "fmt":
      return `fmt_${value}`;
    case "fit":
      return `fit_${value}`;
    case "pos":
      return `pos_${value}`;
    case "fill":
      return `fill_${value}`;
    default:
      return `${key}_${value}`;
  }
}

type ResolvedImageVariant = {
  width?: string;
  height?: string;
  quality: string;
  fmt?: string;
  fit?: string;
  pos?: string;
  fill?: string;
};

/** Resolve width/height/quality/fmt/fit/pos/fill consistently for all URL builders. */
function resolveVariantFields(imageKey: string, options: ImageOptions): ResolvedImageVariant {
  const width =
    options.width != null && options.width > 0
      ? String(clamp(Math.round(options.width), 1, MAX_DIMENSION))
      : undefined;
  const height =
    options.height != null && options.height > 0
      ? String(clamp(Math.round(options.height), 1, MAX_DIMENSION))
      : undefined;

  const qRaw = options.quality?.trim() ? options.quality : "high";
  const quality = normalizeQualityForPath(qRaw);

  let fmt: string | undefined;
  if (options.fmt && options.fmt !== "auto") {
    fmt = options.fmt;
  }

  const hasWidth = options.width != null && options.width > 0;
  const hasHeight = options.height != null && options.height > 0;

  let fit: string | undefined;
  let pos: string | undefined;
  let fill: string | undefined;

  if (hasWidth && hasHeight) {
    if (options.fit) {
      fit = options.fit;
      if (options.fit === "cover") {
        pos = options.pos ?? "center";
      }
      if (options.fit === "contain" && options.fill) {
        const f = normalizeFillForPath(options.fill);
        if (f) {
          fill = f;
        }
      }
    }
  }

  return { width, height, quality, fmt, fit, pos, fill };
}

function buildQueryString(imageKey: string, options: ImageOptions): string {
  const r = resolveVariantFields(imageKey, options);
  const sp = new URLSearchParams();
  if (r.width) sp.set("width", r.width);
  if (r.height) sp.set("height", r.height);
  sp.set("quality", r.quality);
  if (r.fmt) sp.set("format", r.fmt);
  if (r.fit) sp.set("fit", r.fit);
  if (r.pos) sp.set("position", r.pos);
  if (r.fill) sp.set("fill", r.fill);
  return sp.toString();
}

/**
 * Build the comma-separated variant segment (e.g. w_400,h_300,q_high,fmt_webp).
 * Omits width/height when not set; always includes quality and fmt so CDN keys match cached objects.
 */
export function buildVariantSegment(imageKey: string, options: ImageOptions): string {
  const r = resolveVariantFields(imageKey, options);
  const params: Partial<Record<(typeof PATH_PARAM_ORDER)[number], string>> = {};
  if (r.width) params.width = r.width;
  if (r.height) params.height = r.height;
  params.quality = r.quality;
  params.fmt = r.fmt;
  if (r.fit) params.fit = r.fit;
  if (r.pos) params.pos = r.pos;
  if (r.fill) params.fill = r.fill;

  const parts: string[] = [];
  for (const k of PATH_PARAM_ORDER) {
    const v = params[k];
    if (v != null && v !== "") {
      parts.push(encodePathToken(k, v));
    }
  }
  return parts.join(",");
}

export function createFireimg(config: FireimgConfig) {
  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const project = config.project;

  if (!project) {
    throw new Error("@fireimg/js: `project` is required");
  }

  /**
   * Build the full CDN URL for an image with the given options as query parameters.
   *
   * For **SVG** sources, the optimizer ignores transform query parameters (`width`, `height`,
   * `quality`, `fmt`, `fit`, `pos`, `fill`) and serves the original file. You can still use FireImg URLs
   * for consistency with raster assets; control display size with CSS or `<img width>` / `<img height>`.
   */
  /**
   * Unmodified bytes at `raw-images/{project}/{imageKey}` — served via CDN without
   * optimizer transforms (contrast with `/{project}/images/...`, which may serve cached output).
   */
  function getRawUrl(imageKey: string): string {
    const key = imageKey.replace(/^\/+/, "");
    return `${baseUrl}/raw-images/${project}/${key}`;
  }

  function getUrl(imageKey: string, options: ImageOptions = {}): string {
    return getQueryUrl(imageKey, options);
  }

  /**
   * @deprecated Use `getUrl()`; it now returns the same query-parameter URL format.
   */
  function getQueryUrl(imageKey: string, options: ImageOptions = {}): string {
    const key = imageKey.replace(/^\/+/, "");
    const qs = buildQueryString(key, options);
    return `${baseUrl}/${project}/images/${key}?${qs}`;
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

  return { getUrl, getQueryUrl, getRawUrl, getSnappedUrl, getSrcSet };
}

/**
 * Round a number up to the nearest multiple of `step`.
 * E.g. snapUp(237, 100) => 300
 */
export function snapUp(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.ceil(value / step) * step;
}
