import { useMemo } from "react";
import type { ImageOptions } from "@fireimg/js";
import { getDefaultFireimg, createFireimg } from "@fireimg/js";

/**
 * Hook that returns a fireimg URL for the given image key and options.
 * Pass `project` to override the globally configured project.
 */
export function useFireimgUrl(imageKey: string, options: ImageOptions = {}, project?: string): string {
  const fireimg = useMemo(
    () => (project ? createFireimg({ project }) : getDefaultFireimg()),
    [project],
  );
  return useMemo(
    () => fireimg.getUrl(imageKey, options),
    [fireimg, imageKey, options.width, options.height, options.quality, options.fmt, options.fit, options.pos],
  );
}
