import React, { useRef, useState, useEffect, useMemo } from "react";
import type { ImageOptions, Quality, Format, Fit, Position } from "@fireimg/js";
import { getDefaultFireimg, createFireimg } from "@fireimg/js";

export interface FireImgProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> {
  /** The image key (path) within the project */
  imageKey: string;
  /** Override the default configured project */
  project?: string;
  quality?: Quality;
  fmt?: Format;
  fit?: Fit;
  pos?: Position;
  /** Fixed width — if set, disables responsive snapping */
  width?: number;
  /** Fixed height */
  height?: number;
  /**
   * Snap the width to the nearest multiple of this value based on the
   * container's available width. Set to 0 to disable snapping.
   * @default 100
   */
  snapStep?: number;
  /** Minimum width for srcset generation @default 100 */
  minWidth?: number;
  /** Maximum width for srcset generation @default 2000 */
  maxWidth?: number;
}

export const FireImg = React.forwardRef<HTMLImageElement, FireImgProps>(function FireImg(
  {
    imageKey,
    project,
    quality,
    fmt,
    fit,
    pos,
    width,
    height,
    snapStep = 100,
    minWidth = 100,
    maxWidth = 2000,
    sizes,
    ...rest
  },
  forwardedRef,
) {
  const fireimg = useMemo(
    () => (project ? createFireimg({ project }) : getDefaultFireimg()),
    [project],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  const imageOptions: ImageOptions = useMemo(
    () => ({
      ...(quality && { quality }),
      ...(fmt && { fmt }),
      ...(fit && { fit }),
      ...(pos && { pos }),
      ...(height && { height }),
    }),
    [quality, fmt, fit, pos, height],
  );

  const hasFixedWidth = width != null && width > 0;

  useEffect(() => {
    if (hasFixedWidth || !containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [hasFixedWidth]);

  const src = useMemo(() => {
    if (hasFixedWidth) {
      return fireimg.getUrl(imageKey, { ...imageOptions, width });
    }
    if (containerWidth != null && containerWidth > 0 && snapStep > 0) {
      return fireimg.getSnappedUrl(imageKey, containerWidth, { ...imageOptions, snapStep });
    }
    return fireimg.getUrl(imageKey, imageOptions);
  }, [fireimg, imageKey, imageOptions, width, containerWidth, snapStep, hasFixedWidth]);

  const srcSet = useMemo(() => {
    if (hasFixedWidth) return undefined;
    return fireimg.getSrcSet(imageKey, { ...imageOptions, snapStep, minWidth, maxWidth });
  }, [fireimg, imageKey, imageOptions, snapStep, minWidth, maxWidth, hasFixedWidth]);

  const img = (
    <img
      ref={forwardedRef}
      src={src}
      srcSet={srcSet}
      sizes={sizes ?? (srcSet ? "100vw" : undefined)}
      {...rest}
    />
  );

  if (hasFixedWidth) return img;

  return <div ref={containerRef} style={{ width: "100%" }}>{img}</div>;
});
