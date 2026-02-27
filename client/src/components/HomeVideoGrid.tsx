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
        {videos.map((v, i) =>
          v.type === "image" ? (
            <ImageTile key={i} video={v} />
          ) : (
            <VideoTile key={i} video={v} />
          )
        )}
      </div>
    </section>
  );
}

function ImageTile({ video }: { video: HomeVideo }) {
  const sizeClass = SIZE_CLASSES[video.size ?? "normal"];
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-primary min-h-[120px] md:min-h-[180px] flex items-center justify-center p-4",
        sizeClass
      )}
    >
      <img
        src={video.src}
        alt="BILYAR"
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}

function VideoTile({ video }: { video: HomeVideo }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedRef = useRef(false);

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
        // When in view: load src if not yet loaded, then play
        if (!loadedRef.current) {
          loadedRef.current = true;
          videoEl.src = video.src;
          videoEl.load();
        }
        videoEl.play().catch(() => {});
      },
      { rootMargin: "50px", threshold: 0.1 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [video.src]);

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
        preload="none"
        poster={video.poster}
        aria-hidden
      />
    </div>
  );
}
