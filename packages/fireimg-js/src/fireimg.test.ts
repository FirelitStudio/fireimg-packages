import { describe, it, expect, beforeEach } from "vitest";
import { createFireimg, snapUp, configureFireimg, getDefaultFireimg } from "./fireimg";

describe("createFireimg", () => {
  const fireimg = createFireimg({ project: "my-project" });

  it("throws when project is empty", () => {
    expect(() => createFireimg({ project: "" })).toThrow("`project` is required");
  });

  describe("getUrl", () => {
    it("builds a basic URL with no options", () => {
      expect(fireimg.getUrl("photo.jpg")).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg",
      );
    });

    it("strips leading slashes from image key", () => {
      expect(fireimg.getUrl("/photo.jpg")).toBe(
        "https://i.fireimg.com/my-project/images/photo.jpg",
      );
    });

    it("adds width and height query params", () => {
      const url = fireimg.getUrl("photo.jpg", { width: 300, height: 200 });
      expect(url).toContain("width=300");
      expect(url).toContain("height=200");
    });

    it("adds quality param", () => {
      const url = fireimg.getUrl("photo.jpg", { quality: "high" });
      expect(url).toContain("quality=high");
    });

    it("supports numeric quality and fmt params", () => {
      const url = fireimg.getUrl("photo.jpg", { quality: "82", fmt: "avif" });
      expect(url).toContain("quality=82");
      expect(url).toContain("fmt=avif");
    });

    it("adds fit and pos params", () => {
      const url = fireimg.getUrl("photo.jpg", {
        width: 100,
        height: 100,
        fit: "cover",
        pos: "top",
      });
      expect(url).toContain("fit=cover");
      expect(url).toContain("pos=top");
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

    it("uses a custom base URL", () => {
      const custom = createFireimg({ project: "test", baseUrl: "https://cdn.example.com" });
      expect(custom.getUrl("img.png")).toBe(
        "https://cdn.example.com/test/images/img.png",
      );
    });

    it("strips trailing slashes from custom base URL", () => {
      const custom = createFireimg({ project: "test", baseUrl: "https://cdn.example.com///" });
      expect(custom.getUrl("img.png")).toBe(
        "https://cdn.example.com/test/images/img.png",
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
      expect(url).toContain("fmt=webp");
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
        expect(entry).toContain("fmt=auto");
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
      "https://i.fireimg.com/default-proj/images/img.jpg",
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
      "https://i.fireimg.com/new-proj/images/img.jpg",
    );
  });

  it("respects a custom baseUrl in the config", () => {
    configureFireimg({ project: "p", baseUrl: "https://cdn.test.com" });
    expect(getDefaultFireimg().getUrl("img.jpg")).toBe(
      "https://cdn.test.com/p/images/img.jpg",
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
