import { cn } from "@/utils/cn";

type ThumbImageProps = {
  src: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
};

/**
 * List/thumbnail image: lazy-loads offscreen and decodes off the main thread
 * so long product/source tables stay scrollable.
 */
export function ThumbImage({
  src,
  alt = "",
  className,
  width,
  height,
}: ThumbImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn("size-full", className)}
    />
  );
}
