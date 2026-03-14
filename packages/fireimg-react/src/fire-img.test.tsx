import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { configureFireimg } from "@fireimg/js";
import { FireImg } from "./fire-img";
import { useFireimgUrl } from "./use-fireimg-url";

const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  configureFireimg({ project: "my-project" });
  vi.stubGlobal(
    "ResizeObserver",
    vi.fn(() => ({
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: vi.fn(),
    })),
  );
});

afterEach(() => {
  cleanup();
});

describe("FireImg", () => {
  it("renders an img with correct src when width is fixed", () => {
    render(
      <FireImg imageKey="hero.jpg" width={500} quality="high" alt="hero" />,
    );

    const img = screen.getByRole("img", { name: "hero" });
    expect(img).toHaveAttribute(
      "src",
      "https://i.fireimg.com/my-project/images/hero.jpg?width=500&quality=high",
    );
    expect(img).not.toHaveAttribute("srcset");
  });

  it("passes fmt and numeric quality through to generated URLs", () => {
    render(
      <FireImg imageKey="hero.jpg" width={500} quality="82" fmt="avif" alt="hero" />,
    );

    const img = screen.getByRole("img", { name: "hero" });
    expect(img).toHaveAttribute(
      "src",
      "https://i.fireimg.com/my-project/images/hero.jpg?width=500&quality=82&fmt=avif",
    );
  });

  it("generates a srcset when no fixed width is given", () => {
    render(
      <FireImg imageKey="hero.jpg" quality="medium" alt="hero" />,
    );

    const img = screen.getByRole("img", { name: "hero" });
    const srcset = img.getAttribute("srcset")!;
    expect(srcset).toContain("width=100");
    expect(srcset).toContain("100w");
    expect(srcset).toContain("width=2000");
    expect(srcset).toContain("2000w");
  });

  it("passes through additional img attributes", () => {
    render(
      <FireImg imageKey="hero.jpg" width={400} alt="hero" className="my-class" loading="lazy" />,
    );

    const img = screen.getByRole("img", { name: "hero" });
    expect(img).toHaveClass("my-class");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("uses the project prop to override the configured project", () => {
    render(
      <FireImg imageKey="hero.jpg" project="other-project" width={500} alt="hero" />,
    );

    const img = screen.getByRole("img", { name: "hero" });
    expect(img).toHaveAttribute(
      "src",
      "https://i.fireimg.com/other-project/images/hero.jpg?width=500",
    );
  });

  it("throws when no project is configured and no project prop is given", () => {
    configureFireimg({ project: "" });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(<FireImg imageKey="hero.jpg" alt="hero" />),
    ).toThrow("`project` is required");
    consoleSpy.mockRestore();
  });
});

describe("useFireimgUrl", () => {
  function TestComponent({ imageKey, width, project }: { imageKey: string; width?: number; project?: string }) {
    const url = useFireimgUrl(imageKey, { width }, project);
    return <span data-testid="url">{url}</span>;
  }

  it("returns a URL using the configured project", () => {
    render(
      <TestComponent imageKey="photo.png" width={300} />,
    );

    expect(screen.getByTestId("url").textContent).toBe(
      "https://i.fireimg.com/my-project/images/photo.png?width=300",
    );
  });

  it("returns a URL using a project override", () => {
    render(
      <TestComponent imageKey="photo.png" width={300} project="alt-project" />,
    );

    expect(screen.getByTestId("url").textContent).toBe(
      "https://i.fireimg.com/alt-project/images/photo.png?width=300",
    );
  });
});
