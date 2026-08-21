import { describe, it, expect, beforeEach } from "vitest";
import {
  appendImageCacheVersion,
  buildImageTransformQueryString,
  createFireimg,
  effectiveCacheVersion,
  snapUp,
  configureFireimg,
  getDefaultFireimg,
} from "./fireimg";

describe("buildImageTransformQueryString", () => {
  it("matches getUrl query portion for width + default quality", () => {
    expect(buildImageTransformQueryString("Evermont_Header.jpeg", { width: 80 })).toBe(
      "width=80&quality=high",
    );
  });
});

describe("createFireimg", () => {
  const fireimg = createFireimg({ project: "my-project" });

  it("throws when project is empty", () => {
    expect(() => createFireimg({ project: "" })).toThrow("`project` is required");
  });

  describe("getUrl", () => {
    it("builds a URL with default quality and inferred format in query params", () => {
      expect(fireimg.getUrl("photo.jpg")).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg?quality=high",
      );
    });

    it("strips leading slashes from image key", () => {
      expect(fireimg.getUrl("/photo.jpg")).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg?quality=high",
      );
    });

    it("keeps folder prefixes in the image key for query-parameter URLs", () => {
      expect(fireimg.getUrl("my-folder/mountain.jpg", { width: 800 })).toBe(
        "https://i.fireimg.com/my-project/images/my-folder/mountain.jpg?width=800&quality=high",
      );
    });

    it("builds NeedApp-style nested keys as query-parameter URLs", () => {
      expect(fireimg.getUrl("feed_items/43/uuid.jpg", { width: 800, fmt: "webp" })).toBe(
        "https://i.fireimg.com/my-project/images/feed_items/43/uuid.jpg?width=800&quality=high&format=webp",
      );
    });

    it("adds width and height query parameters", () => {
      expect(fireimg.getUrl("photo.jpg", { width: 300, height: 200 })).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg?width=300&height=200&quality=high",
      );
    });

    it("uses canonical query parameter names", () => {
      expect(fireimg.getUrl("photo.jpg", { quality: "high", fmt: "webp" })).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg?quality=high&format=webp",
      );
    });

    it("adds quality query parameter", () => {
      const url = fireimg.getUrl("photo.jpg", { quality: "high" });
      expect(url).toContain("quality=high");
    });

    it("omits width and height for format and quality only (uses source dimensions on the server)", () => {
      const url = fireimg.getUrl("photo.jpg", { quality: "high", fmt: "webp" });
      expect(url).not.toContain("width=");
      expect(url).not.toContain("height=");
      expect(url).toContain("quality=high");
      expect(url).toContain("format=webp");
    });

    it("supports numeric quality and fmt params", () => {
      expect(fireimg.getUrl("photo.jpg", { quality: "82", fmt: "avif" })).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg?quality=82&format=avif",
      );
    });

    it("adds fit and pos tokens when both width and height are set", () => {
      expect(
        fireimg.getUrl("photo.jpg", {
          width: 100,
          height: 100,
          fit: "cover",
          pos: "top",
        }),
      ).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg?width=100&height=100&quality=high&fit=cover&position=top",
      );
    });

    it("adds fill token for fit contain when set", () => {
      expect(
        fireimg.getUrl("photo.jpg", {
          width: 100,
          height: 100,
          fit: "contain",
          fill: "transparent",
        }),
      ).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg?width=100&height=100&quality=high&fit=contain&fill=transparent",
      );
    });

    it("omits fit and pos unless both width and height are set", () => {
      const url = fireimg.getUrl("photo.jpg", {
        quality: "high",
        fmt: "auto",
        fit: "cover",
        pos: "center",
      });
      expect(url).not.toContain("fit=");
      expect(url).not.toContain("position=");
    });

    it("omits fit and pos when only width is set", () => {
      const url = fireimg.getUrl("photo.jpg", {
        width: 400,
        fit: "cover",
        pos: "center",
      });
      expect(url).toContain("width=400");
      expect(url).not.toContain("fit=");
      expect(url).not.toContain("position=");
    });

    it("clamps dimensions to MAX_DIMENSION (4000)", () => {
      const url = fireimg.getUrl("photo.jpg", { width: 9999 });
      expect(url).toContain("width=4000");
    });

    it("clamps dimensions to minimum of 1", () => {
      const url = fireimg.getUrl("photo.jpg", { width: -5 });
      expect(url).not.toContain("width=");
    });

    it("rounds fractional widths", () => {
      const url = fireimg.getUrl("photo.jpg", { width: 300.7 });
      expect(url).toContain("width=301");
    });

    it("appends version when cacheVersion is set", () => {
      expect(fireimg.getUrl("photo.jpg", { cacheVersion: 2 })).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg?quality=high&version=2",
      );
    });

    it("uses a custom base URL", () => {
      const custom = createFireimg({ project: "test", baseUrl: "https://cdn.example.com" });
      expect(custom.getUrl("img.png")).toBe(
        "https://cdn.example.com/test/images/img.png?quality=high",
      );
    });

    it("strips trailing slashes from custom base URL", () => {
      const custom = createFireimg({ project: "test", baseUrl: "https://cdn.example.com///" });
      expect(custom.getUrl("img.png")).toBe(
        "https://cdn.example.com/test/images/img.png?quality=high",
      );
    });
  });

  describe("getQueryUrl", () => {
    it("matches getUrl output", () => {
      const options = { width: 300, height: 200, quality: "82" as const, fmt: "webp" as const };
      expect(fireimg.getQueryUrl("photo.jpg", options)).toBe(fireimg.getUrl("photo.jpg", options));
    });

    it("puts transforms in the query string after the image key", () => {
      expect(fireimg.getQueryUrl("photo.jpg", { width: 300, height: 200 })).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg?width=300&height=200&quality=high",
      );
    });

    it("includes fit and position for cover when width and height are set", () => {
      expect(
        fireimg.getQueryUrl("photo.jpg", {
          width: 100,
          height: 100,
          fit: "cover",
          pos: "top",
        }),
      ).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg?width=100&height=100&quality=high&fit=cover&position=top",
      );
    });

    it("always includes quality and format and strips leading slashes from image key", () => {
      expect(fireimg.getQueryUrl("/photo.jpg")).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg?quality=high",
      );
    });
  });

  describe("getRawUrl", () => {
    it("builds the CDN URL for the unmodified object under raw-images/", () => {
      expect(fireimg.getRawUrl("photo.jpg")).toBe(
        "https://i.fireimg.com/raw-images/my-project/photo.jpg",
      );
    });

    it("strips leading slashes from image key", () => {
      expect(fireimg.getRawUrl("/photo.jpg")).toBe(
        "https://i.fireimg.com/raw-images/my-project/photo.jpg",
      );
    });
  });

  describe("getSnappedUrl", () => {
    it("snaps width up to nearest 100 by default", () => {
      const url = fireimg.getSnappedUrl("photo.jpg", 237);
      expect(url).toContain("width=300");
    });

    it("snaps width up to custom step", () => {
      const url = fireimg.getSnappedUrl("photo.jpg", 237, { snapStep: 50 });
      expect(url).toContain("width=250");
    });

    it("keeps exact multiples unchanged", () => {
      const url = fireimg.getSnappedUrl("photo.jpg", 400);
      expect(url).toContain("width=400");
    });

    it("includes other image options alongside snapped width", () => {
      const url = fireimg.getSnappedUrl("photo.jpg", 237, { quality: "82", fmt: "webp" });
      expect(url).toContain("width=300");
      expect(url).toContain("quality=82");
      expect(url).toContain("format=webp");
    });

    it("clamps snapped width to MAX_DIMENSION", () => {
      const url = fireimg.getSnappedUrl("photo.jpg", 5000, { snapStep: 1000 });
      expect(url).toContain("width=4000");
    });
  });

  describe("getSrcSet", () => {
    it("generates a srcset string with default params", () => {
      const srcset = fireimg.getSrcSet("photo.jpg");
      const entries = srcset.split(", ");
      expect(entries.length).toBe(20);
      expect(entries[0]).toContain("width=100");
      expect(entries[0]).toMatch(/100w$/);
      expect(entries[entries.length - 1]).toContain("width=2000");
      expect(entries[entries.length - 1]).toMatch(/2000w$/);
    });

    it("respects custom snapStep, minWidth, maxWidth", () => {
      const srcset = fireimg.getSrcSet("photo.jpg", {
        snapStep: 200,
        minWidth: 200,
        maxWidth: 600,
      });
      const entries = srcset.split(", ");
      expect(entries.length).toBe(3);
      expect(entries[0]).toContain("width=200");
      expect(entries[1]).toContain("width=400");
      expect(entries[2]).toContain("width=600");
    });

    it("includes image options in each srcset entry", () => {
      const srcset = fireimg.getSrcSet("photo.jpg", {
        quality: "low",
        fmt: "auto",
        snapStep: 500,
        minWidth: 500,
        maxWidth: 1000,
      });
      const entries = srcset.split(", ");
      for (const entry of entries) {
        expect(entry).toContain("quality=low");
        expect(entry).not.toContain("format=");
      }
    });
  });
});

describe("configureFireimg / getDefaultFireimg", () => {
  beforeEach(() => {
    configureFireimg({ project: "default-proj" });
  });

  it("returns an instance using the configured project", () => {
    const instance = getDefaultFireimg();
    expect(instance.getUrl("img.jpg")).toBe(
      "https://i.fireimg.com/default-proj/images/img.jpg?quality=high",
    );
  });

  it("caches the instance across calls", () => {
    const a = getDefaultFireimg();
    const b = getDefaultFireimg();
    expect(a).toBe(b);
  });

  it("resets the cached instance when reconfigured", () => {
    const a = getDefaultFireimg();
    configureFireimg({ project: "new-proj" });
    const b = getDefaultFireimg();
    expect(a).not.toBe(b);
    expect(b.getUrl("img.jpg")).toBe(
      "https://i.fireimg.com/new-proj/images/img.jpg?quality=high",
    );
  });

  it("respects a custom baseUrl in the config", () => {
    configureFireimg({ project: "p", baseUrl: "https://cdn.test.com" });
    expect(getDefaultFireimg().getUrl("img.jpg")).toBe(
      "https://cdn.test.com/p/images/img.jpg?quality=high",
    );
  });
});

describe("appendImageCacheVersion / effectiveCacheVersion", () => {
  it("defaults missing version to 1", () => {
    expect(effectiveCacheVersion()).toBe(1);
    expect(effectiveCacheVersion(0)).toBe(1);
    expect(appendImageCacheVersion("https://cdn/x/y/z.jpg")).toBe("https://cdn/x/y/z.jpg?version=1");
  });

  it("appends to URLs that already have a query string", () => {
    expect(appendImageCacheVersion("https://cdn/p/images/a.jpg?width=1", 3)).toBe(
      "https://cdn/p/images/a.jpg?width=1&version=3",
    );
  });
});

describe("snapUp", () => {
  it("rounds up to nearest step", () => {
    expect(snapUp(237, 100)).toBe(300);
    expect(snapUp(301, 100)).toBe(400);
    expect(snapUp(100, 100)).toBe(100);
  });

  it("handles step of 0 by returning the value unchanged", () => {
    expect(snapUp(237, 0)).toBe(237);
  });

  it("handles step of 1", () => {
    expect(snapUp(237, 1)).toBe(237);
  });
});
