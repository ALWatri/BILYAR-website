/**
 * Homepage video gallery config.
 * Add your 9 video sources and optional poster (thumbnail) URLs.
 *
 * How to add videos:
 * 1. Local: Place files in client/public/videos/ and use "/videos/yourfile.mp4"
 * 2. CDN: Use full URLs from Bunny.net, Cloudflare Stream, or your CDN
 *
 * See docs/VIDEOS.md for upload and performance tips.
 */
export interface HomeVideo {
  src: string;
  poster?: string; // Optional thumbnail – improves perceived load speed
  /** Grid span for varied layout: "large" | "tall" | "wide" | "normal" */
  size?: "large" | "tall" | "wide" | "normal";
}

export const HOME_VIDEOS: HomeVideo[] = [
  { src: "/videos/V1.mp4", size: "large" },
  { src: "/videos/V2.mp4", size: "tall" },
  { src: "/videos/V3.mp4", size: "tall" },
  { src: "/videos/V4.mp4", size: "wide" },
  { src: "/videos/V5.mp4", size: "normal" },
  { src: "/videos/V6.mp4", size: "normal" },
  { src: "/videos/V7.mp4", size: "tall" },
  { src: "/videos/V8.mp4", size: "tall" },
  { src: "/videos/V9.mp4", size: "wide" },
];
