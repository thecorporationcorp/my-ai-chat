// ============================================================================
// CHEATCODEZ VIDEO BACKGROUND SYSTEM
// ============================================================================
// Bulletproof video background with multiple fallbacks
// Easy to swap - just change VIDEO_CONFIG

const VIDEO_CONFIG = {
  // ========================================================================
  // 🎬 CHANGE YOUR VIDEO HERE - THAT'S IT!
  // ========================================================================
  // Just paste your video URL and you're done
  // Works with: Direct MP4, Mixkit, Pexels, Coverr, your own hosted video

  primary: 'https://assets.mixkit.co/videos/preview/mixkit-ancient-lamp-in-the-desert-4390-large.mp4',

  // Optional: Add backup videos (if primary fails)
  fallbacks: [
    // Add more video URLs here as backups
    // 'https://your-backup-video-1.mp4',
    // 'https://your-backup-video-2.mp4',
  ],

  // Video settings
  settings: {
    fadeInDuration: 1000,      // How long video fades in (ms)
    retryAttempts: 3,          // How many times to retry failed videos
    retryDelay: 1000,          // Delay between retries (ms)
    showGradientWhileLoading: true, // Show gradient until video loads
    minPlayDuration: 2000,     // Min time before considering video "loaded" (ms)
  }
};

// ============================================================================
// VIDEO BACKGROUND MANAGER
// ============================================================================

class VideoBackgroundManager {
  constructor(config) {
    this.config = config;
    this.videoElement = document.getElementById('bg-video');
    this.videoContainer = document.getElementById('video-container');
    this.gradientFallback = document.querySelector('.gradient-fallback');
    this.currentVideoIndex = -1;
    this.retryCount = 0;
    this.isLoaded = false;

    this.init();
  }

  init() {
    if (!this.videoElement) {
      console.warn('⚠️ Video element not found - using gradient fallback');
      this.showGradientFallback();
      return;
    }

    // Set up event listeners
    this.setupEventListeners();

    // Start loading primary video
    this.loadNextVideo();

    console.log('🎬 Video background system initialized');
  }

  setupEventListeners() {
    // Video loaded and can play
    this.videoElement.addEventListener('canplay', () => {
      this.handleVideoCanPlay();
    });

    // Video loaded enough to start playing
    this.videoElement.addEventListener('loadeddata', () => {
      console.log('✓ Video data loaded');
    });

    // Video actually started playing
    this.videoElement.addEventListener('playing', () => {
      this.handleVideoPlaying();
    });

    // Video failed to load
    this.videoElement.addEventListener('error', (e) => {
      this.handleVideoError(e);
    });

    // Video stalled
    this.videoElement.addEventListener('stalled', () => {
      console.warn('⚠️ Video stalled, may retry');
    });

    // Ensure video keeps looping smoothly
    this.videoElement.addEventListener('ended', () => {
      this.videoElement.currentTime = 0;
      this.videoElement.play().catch(err => {
        console.warn('⚠️ Video replay failed:', err);
      });
    });
  }

  loadNextVideo() {
    this.currentVideoIndex++;

    // Build list of videos to try (primary + fallbacks)
    const allVideos = [this.config.primary, ...this.config.fallbacks];

    if (this.currentVideoIndex >= allVideos.length) {
      console.error('❌ All videos failed to load - using gradient fallback');
      this.showGradientFallback();
      return;
    }

    const videoUrl = allVideos[this.currentVideoIndex];
    console.log(`🎬 Loading video ${this.currentVideoIndex + 1}/${allVideos.length}:`, videoUrl);

    // Set video source
    this.videoElement.src = videoUrl;
    this.videoElement.load();

    // Attempt to play
    const playPromise = this.videoElement.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('✓ Video playing');
        })
        .catch(err => {
          console.warn('⚠️ Autoplay prevented or failed:', err.message);
          // Some browsers block autoplay - try to recover
          this.handlePlaybackError(err);
        });
    }

    // Fallback timeout - if video doesn't load in 10 seconds, try next
    setTimeout(() => {
      if (!this.isLoaded) {
        console.warn('⚠️ Video load timeout - trying next video');
        this.loadNextVideo();
      }
    }, 10000);
  }

  handleVideoCanPlay() {
    console.log('✓ Video can play');

    // Don't mark as loaded until it's actually been playing smoothly
    setTimeout(() => {
      if (this.videoElement.currentTime > 0 && !this.videoElement.paused) {
        this.markVideoAsLoaded();
      }
    }, this.config.settings.minPlayDuration);
  }

  handleVideoPlaying() {
    if (!this.isLoaded) {
      console.log('✓ Video playing smoothly');
      // Give it a moment to ensure it's stable
      setTimeout(() => {
        if (!this.videoElement.paused && !this.videoElement.ended) {
          this.markVideoAsLoaded();
        }
      }, 500);
    }
  }

  markVideoAsLoaded() {
    if (this.isLoaded) return;

    this.isLoaded = true;
    console.log('✅ Video background loaded successfully');

    // Fade in video, fade out gradient
    this.showVideo();
  }

  showVideo() {
    // Fade in video container
    this.videoContainer.style.opacity = '0';
    this.videoContainer.style.display = 'block';

    // Trigger reflow for animation
    this.videoContainer.offsetHeight;

    // Animate in
    this.videoContainer.style.transition = `opacity ${this.config.settings.fadeInDuration}ms ease-in`;
    this.videoContainer.style.opacity = '1';

    // Fade out gradient
    if (this.gradientFallback) {
      this.gradientFallback.style.transition = `opacity ${this.config.settings.fadeInDuration}ms ease-out`;
      this.gradientFallback.style.opacity = '0';

      // Remove gradient after fade
      setTimeout(() => {
        if (this.isLoaded) {
          this.gradientFallback.style.display = 'none';
        }
      }, this.config.settings.fadeInDuration);
    }
  }

  showGradientFallback() {
    console.log('🎨 Using gradient fallback');

    // Hide video
    if (this.videoContainer) {
      this.videoContainer.style.display = 'none';
    }

    // Show gradient
    if (this.gradientFallback) {
      this.gradientFallback.style.display = 'block';
      this.gradientFallback.style.opacity = '1';
    }
  }

  handleVideoError(e) {
    const error = e.target.error;
    const errorMessages = {
      1: 'ABORTED - Video loading aborted',
      2: 'NETWORK - Network error loading video',
      3: 'DECODE - Video decode error',
      4: 'SRC_NOT_SUPPORTED - Video format not supported'
    };

    const errorMsg = error ? errorMessages[error.code] || `Unknown error (${error.code})` : 'Unknown error';
    console.error(`❌ Video error: ${errorMsg}`);

    // Retry logic
    if (this.retryCount < this.config.settings.retryAttempts) {
      this.retryCount++;
      console.log(`🔄 Retrying (${this.retryCount}/${this.config.settings.retryAttempts})...`);

      setTimeout(() => {
        this.videoElement.load();
        this.videoElement.play().catch(() => {});
      }, this.config.settings.retryDelay);
    } else {
      // All retries failed, try next video
      console.warn('⚠️ Max retries reached - trying next video');
      this.retryCount = 0;
      this.loadNextVideo();
    }
  }

  handlePlaybackError(err) {
    // Browser prevented autoplay - show gradient and wait for user interaction
    console.warn('⚠️ Autoplay blocked by browser');
    this.showGradientFallback();

    // Try to play on any user interaction
    const tryPlay = () => {
      this.videoElement.play()
        .then(() => {
          console.log('✓ Video playing after user interaction');
          document.removeEventListener('click', tryPlay);
          document.removeEventListener('touchstart', tryPlay);
          document.removeEventListener('keydown', tryPlay);
        })
        .catch(() => {});
    };

    document.addEventListener('click', tryPlay, { once: true });
    document.addEventListener('touchstart', tryPlay, { once: true });
    document.addEventListener('keydown', tryPlay, { once: true });
  }

  // Public method to change video on the fly
  changeVideo(url) {
    console.log('🎬 Changing video to:', url);
    this.isLoaded = false;
    this.config.primary = url;
    this.currentVideoIndex = -1;
    this.retryCount = 0;

    // Show gradient during transition
    if (this.config.settings.showGradientWhileLoading) {
      this.showGradientFallback();
    }

    // Load new video
    this.loadNextVideo();
  }
}

// ============================================================================
// INITIALIZE
// ============================================================================

let videoBackground;

function initVideoBackground() {
  try {
    videoBackground = new VideoBackgroundManager(VIDEO_CONFIG);
  } catch (error) {
    console.error('❌ Failed to initialize video background:', error);
    // Fallback to gradient
    const gradient = document.querySelector('.gradient-fallback');
    if (gradient) {
      gradient.style.display = 'block';
      gradient.style.opacity = '1';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVideoBackground);
} else {
  initVideoBackground();
}

// Export for debugging and external control
if (typeof window !== 'undefined') {
  window.VideoBackground = {
    manager: null, // Will be set after init
    changeVideo: (url) => {
      if (videoBackground) {
        videoBackground.changeVideo(url);
      } else {
        console.error('Video background not initialized');
      }
    },
    config: VIDEO_CONFIG
  };

  // Set reference after init
  setTimeout(() => {
    window.VideoBackground.manager = videoBackground;
  }, 100);
}
