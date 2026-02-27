# Homepage Video Gallery

The homepage shows 9 autoplaying videos in a masonry-style grid with varied sizes. Configure videos in `client/src/lib/homeVideos.ts`.

---

## 1. How to Upload Videos

### Option A: Local files (simplest)

1. **Create the folder** (if it doesn’t exist):
   ```
   client/public/videos/
   ```

2. **Add your 9 videos** (e.g. `video-1.mp4` … `video-9.mp4`)

3. **Update** `client/src/lib/homeVideos.ts`:
   ```ts
   { src: "/videos/video-1.mp4", size: "large" },
   { src: "/videos/video-2.mp4", size: "tall" },
   // ...
   ```

**Pros:** Simple, no extra services  
**Cons:** Larger Git repo and deploy size (keep each video small, e.g. &lt; 3MB)

---

### Option B: CDN (recommended for fast loading)

1. **Host videos** on a CDN:
   - [Bunny.net Stream](https://bunny.net/stream/) – simple, cheap
   - [Cloudflare Stream](https://www.cloudflare.com/products/cloudflare-stream/)
   - [Mux](https://www.mux.com/)

2. **Copy the direct MP4 URLs** into `homeVideos.ts`:
   ```ts
   { src: "https://your-cdn.com/video1.mp4", size: "large" },
   ```

**Pros:** Fast delivery, smaller deploys  
**Cons:** Extra setup and possible cost

---

### Option C: YouTube / Vimeo (unlisted)

- Use unlisted links and iframe embeds  
- Requires different markup (embed component instead of `<video>`), so not supported by the current grid setup.

---

## 2. How to Keep Loading Fast

### Built‑in optimizations

- **Lazy loading:** Videos load only when they enter (or near) the viewport  
- **Autoplay when visible:** Videos play when in view, pause when scrolled away  
- **`preload="none"`:** No buffering until the video is needed  
- **Poster images:** Optional thumbnails show while the video loads  

### What you should do

1. **Compress videos**
   - Resolution: 720p is usually enough
   - Format: MP4 (H.264)
   - Bitrate: 1–2 Mbps
   - Tools: [HandBrake](https://handbrake.fr/), [FFmpeg](https://ffmpeg.org/)

2. **Add poster images (optional)**
   ```ts
   { src: "/videos/video-1.mp4", poster: "/videos/posters/video-1.jpg", size: "large" },
   ```

3. **Keep duration short**
   - 10–30 seconds per clip is usually enough

4. **Prefer CDN**
   - For local files, aim for ~1–2 MB per video so the deploy stays small
