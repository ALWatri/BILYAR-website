import { useEffect, useRef } from "react";
import type { HomeVideo } from "@/lib/homeVideos";
import { cn } from "@/lib/utils";

const SIZE_CLASSES: Record<NonNullable<HomeVideo["size"]>, string> = {
  large: "col-span-2 row-span-2",
  tall: "col-span-1 row-span-2",
  wide: "col-span-2 row-span-1",
  normal: "col-span-1 row-span-1",
};

interface HomeVideoGridProps {
  videos: HomeVideo[];
}

export function HomeVideoGrid({ videos }: HomeVideoGridProps) {
  return (
    <section className="w-full bg-black">
      <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-[auto] gap-1 md:gap-2 grid-auto-flow-dense auto-rows-[minmax(120px,180px)] md:auto-rows-[minmax(180px,280px)]">
        {videos.map((v, i) => (
          <VideoTile key={i} video={v} index={i} />
        ))}
      </div>
    </section>
  );
}

function VideoTile({ video, index }: { video: HomeVideo; index: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set src on mount so video loads immediately (avoids black tiles from lazy-src)
  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && video.src) {
      videoEl.src = video.src;
    }
  }, [video.src]);

  // Only play when in viewport; pause when scrolled away
  useEffect(() => {
    const container = containerRef.current;
    const videoEl = videoRef.current;
    if (!container || !videoEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [e] = entries;
        if (!e?.isIntersecting) {
          videoEl.pause();
          return;
        }
        videoEl.play().catch(() => {});
      },
      { rootMargin: "50px", threshold: 0.1 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const sizeClass = SIZE_CLASSES[video.size ?? "normal"];

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-primary/10 min-h-[120px] md:min-h-[180px]",
        sizeClass
      )}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
        loop
        preload="metadata"
        poster={video.poster}
        aria-hidden
        onError={() => console.warn(`Home video ${index + 1} failed to load: ${video.src}`)}
      />
    </div>
  );
}
