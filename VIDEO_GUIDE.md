# 🎬 CheatCodez Video Background Guide

**Make it yours in 30 seconds.**

---

## 🚀 Quick Start - Change Your Video

### Option 1: The Easiest Way (Recommended)

1. Open `public/video-background.js`
2. Find line 15-16:
   ```javascript
   primary: 'https://assets.mixkit.co/videos/preview/mixkit-ancient-lamp-in-the-desert-4390-large.mp4',
   ```
3. Replace the URL with your video
4. **Done!**

### Option 2: Change Video While App is Running

Open browser console and type:
```javascript
VideoBackground.changeVideo('https://your-new-video.mp4');
```

Video swaps instantly with smooth transition.

---

## 📹 Where to Get Free Videos

### Best Sources (8-second loops perfect for backgrounds)

**1. Mixkit (Recommended)**
- URL: https://mixkit.co/free-stock-video/
- Search for: "abstract", "space", "technology", "neon", "genie", "desert"
- Download: Right-click video → Copy video address
- Paste into `primary` in video-background.js

**2. Pexels**
- URL: https://www.pexels.com/videos/
- Free, no attribution required
- Download or get direct video URL

**3. Coverr**
- URL: https://coverr.co/
- Curated free videos
- Great for backgrounds

**4. Pixabay**
- URL: https://pixabay.com/videos/
- Free videos
- No sign-up needed

**5. Create Your Own with Gemini**
- Use Google Gemini to generate video
- Download MP4
- Host it somewhere or use local file

---

## 🎨 Perfect Video Characteristics

For the best CheatCodez aesthetic:

**Length:** 6-10 seconds (loops smoothly)
**Resolution:** 1920x1080 minimum (HD)
**Style:** Dark, moody, abstract, tech, retro gaming
**Motion:** Subtle, not distracting
**File Size:** <10MB (faster loading)

**Good Examples:**
- Slow-moving abstract shapes
- Subtle particle effects
- Genie lamp with smoke
- Retro computer graphics
- Space/stars slowly moving
- Neon lights pulsing
- Rain/matrix code falling

**Avoid:**
- Bright/flashy videos
- Fast motion (distracting)
- Too much detail
- Large file sizes (>20MB)

---

## 🛠️ Advanced Configuration

### Add Backup Videos

Open `public/video-background.js`, around line 19:

```javascript
fallbacks: [
  'https://backup-video-1.mp4',
  'https://backup-video-2.mp4',
],
```

If primary video fails, system automatically tries backups.

### Adjust Fade-In Speed

Line 26:
```javascript
fadeInDuration: 1000, // Milliseconds (1000 = 1 second)
```

**Faster:** Set to 500 (half second)
**Slower:** Set to 2000 (2 seconds)
**Instant:** Set to 0 (no fade)

### Change Retry Behavior

Lines 27-28:
```javascript
retryAttempts: 3,    // How many times to retry
retryDelay: 1000,    // Wait 1 second between retries
```

### Change Video Opacity

Open `public/style.css`, line 72:
```css
.bg-video {
    opacity: 0.4; /* 0.0 = invisible, 1.0 = fully visible */
}
```

**Dimmer:** 0.2 (barely visible)
**Default:** 0.4 (balanced)
**Brighter:** 0.6 (more visible)

---

## 💾 Using Local Video Files

### If You Download a Video

1. Put video file in `public/` folder
   ```
   public/
   ├── my-video.mp4  ← Your video here
   ├── app.js
   ├── index.html
   └── ...
   ```

2. Update video-background.js:
   ```javascript
   primary: '/my-video.mp4',  // Note the leading slash!
   ```

3. **Done!** Video loads from local file.

**Pros:** Fast, no external dependencies
**Cons:** Increases repo size, slower git operations

---

## 🎭 Fallback System (Bulletproof)

The system has **3 layers of fallback:**

### Layer 1: Primary Video
Your main video loads first.

### Layer 2: Backup Videos
If primary fails, tries backup videos in order.

### Layer 3: Animated Gradient
If ALL videos fail, shows beautiful animated gradient.
**You always get a good-looking background.**

### Test Fallback System

```javascript
// In browser console
VideoBackground.changeVideo('https://fake-url-that-will-fail.mp4');
```

Watch it gracefully fall back to gradient. **Bulletproof.**

---

## 🔧 Customizing the Gradient Fallback

Open `public/style.css`, line 37:

```css
.gradient-fallback {
    background: linear-gradient(135deg,
        rgba(10, 0, 20, 1) 0%,   /* Dark purple */
        rgba(30, 0, 50, 1) 25%,  /* Purple */
        rgba(0, 20, 40, 1) 50%,  /* Dark blue */
        rgba(20, 0, 30, 1) 75%,  /* Purple */
        rgba(10, 0, 20, 1) 100%  /* Dark purple */
    );
}
```

**Change colors:**
- Use rgba(R, G, B, opacity)
- Use an online gradient generator
- Copy/paste new gradient

**Gradient Generators:**
- https://cssgradient.io/
- https://www.colorzilla.com/gradient-editor/

---

## 🎮 Real-World Examples

### Retro Gaming Theme
```javascript
primary: 'https://assets.mixkit.co/videos/preview/mixkit-glitch-distortion-abstract-background-30.mp4',
```

### Space Theme
```javascript
primary: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610.mp4',
```

### Matrix/Code Theme
```javascript
primary: 'https://assets.mixkit.co/videos/preview/mixkit-digital-data-18.mp4',
```

### Neon/Cyberpunk Theme
```javascript
primary: 'https://assets.mixkit.co/videos/preview/mixkit-neon-tunnel-926.mp4',
```

### Abstract/Minimal Theme
```javascript
primary: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-smoke-clouds-1500.mp4',
```

---

## 🧪 Testing Your Video

### Quick Test Checklist

1. **Does it load?**
   - Open site, check console for errors
   - Should see: `✅ Video background loaded successfully`

2. **Does it loop smoothly?**
   - Watch for 20 seconds
   - No jumps or pauses?

3. **Is text readable?**
   - Can you read all text clearly?
   - Adjust video opacity if needed

4. **Performance good?**
   - Site loads fast?
   - No lag scrolling?
   - If slow, use smaller video file

5. **Mobile works?**
   - Test on phone
   - Video should load or show gradient

### Debug Console Commands

```javascript
// Check video status
VideoBackground.manager

// Current config
VideoBackground.config

// Force gradient fallback
VideoBackground.manager.showGradientFallback()

// Check if video loaded
VideoBackground.manager.isLoaded
```

---

## 📊 Performance Tips

### If Video Loads Slowly

1. **Use smaller video file** (<5MB ideal)
2. **Use lower resolution** (1280x720 instead of 1920x1080)
3. **Compress video:**
   - Use HandBrake (free)
   - Or online: https://www.videosmaller.com/

### If Site Feels Laggy

1. **Reduce video opacity** (CSS, line 72)
   ```css
   opacity: 0.2; /* Dimmer = faster */
   ```

2. **Use gradient only** (disable video)
   ```javascript
   primary: '', // Empty = gradient only
   ```

3. **Optimize video codec**
   - H.264 is most compatible
   - Avoid VP9 or AV1

---

## 🎨 Matching Video to Brand

### Dark/Mysterious (Current)
- Genie lamp, smoke, dark magic
- Colors: purple, dark blue, black

### Tech/Futuristic
- Code, circuits, holograms
- Colors: cyan, green, blue

### Retro Gaming
- Glitch effects, pixel art, VHS
- Colors: neon pink, cyan, yellow

### Professional/Clean
- Subtle geometric patterns
- Colors: navy, gray, white

### Fun/Playful
- Particles, confetti, bubbles
- Colors: bright, varied

**Match your video to your vibe.**

---

## 🚨 Troubleshooting

### "Video won't load"

**Check:**
1. URL is correct (try opening in browser)
2. Video is publicly accessible
3. CORS allows embedding (some sites block this)
4. File size isn't huge (>50MB = slow)

**Fix:** Use fallback videos or gradient

---

### "Video loads but looks bad"

**Check:**
1. Resolution too low? (use 1080p minimum)
2. Compression artifacts? (get higher quality)
3. Wrong aspect ratio? (use 16:9)

**Fix:** Get better source video

---

### "Site is slow with video"

**Check:**
1. File size (should be <10MB)
2. Your internet speed
3. Browser (Chrome/Firefox work best)

**Fix:** Compress video or use gradient

---

### "Gradient shows instead of video"

This is **normal and correct** behavior:
- Shows immediately for fast load
- Fades to video when ready
- If video fails, gradient stays (good!)

If video NEVER loads:
- Check console for errors
- Test video URL in browser
- Check fallback videos

---

## 💡 Pro Tips

### 1. Test Multiple Videos
Create a test page with different videos, pick your favorite:
```html
<!-- test.html -->
<button onclick="VideoBackground.changeVideo('video1.mp4')">Video 1</button>
<button onclick="VideoBackground.changeVideo('video2.mp4')">Video 2</button>
<button onclick="VideoBackground.changeVideo('video3.mp4')">Video 3</button>
```

### 2. Match Video to Time of Day
```javascript
const hour = new Date().getHours();
const videoUrl = hour < 12
  ? 'morning-video.mp4'
  : 'evening-video.mp4';
VideoBackground.changeVideo(videoUrl);
```

### 3. Let Users Choose
Add a settings menu:
```javascript
const videos = {
  space: 'space.mp4',
  tech: 'tech.mp4',
  retro: 'retro.mp4'
};
// User picks theme
VideoBackground.changeVideo(videos[userChoice]);
```

### 4. Seasonal Themes
```javascript
const month = new Date().getMonth();
const winterVideo = month < 3 || month > 10;
// Different video for winter
```

---

## 📝 Summary

**To change video:** Edit line 15 in `public/video-background.js`
**To test:** Open site, check console
**If it breaks:** Gradient fallback saves you
**To customize:** Read this guide

**It's bulletproof. It's buttery. It's yours.**

---

**Your LLM has been holding out on you. We're just giving you the cheat codes.**

*And now your background is unforgettable.* ✨
