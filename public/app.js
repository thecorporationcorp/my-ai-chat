// CheatCodez - Frontend JavaScript (Production-Hardened)

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_PROMPT_LENGTH: 10000,
  DEBOUNCE_MS: 500
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  currentUsage: null,
  isProcessing: false,
  lastRequestId: null
};

// ============================================================================
// DOM ELEMENTS (with null checks)
// ============================================================================

function getRequiredElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Required element not found: ${id}`);
    throw new Error(`DOM element missing: ${id}`);
  }
  return element;
}

let DOM;
try {
  DOM = {
    userPromptTextarea: getRequiredElement('user-prompt'),
    optimizeBtn: getRequiredElement('optimize-btn'),
    outputSection: getRequiredElement('output-section'),
    optimizedOutput: getRequiredElement('optimized-output'),
    copyBtn: getRequiredElement('copy-btn'),
    usageText: getRequiredElement('usage-text'),
    paywall: getRequiredElement('paywall'),
    verificationCodeInput: getRequiredElement('verification-code'),
    verifyBtn: getRequiredElement('verify-btn')
  };
} catch (error) {
  console.error('Failed to initialize DOM:', error);
  alert('Page failed to load properly. Please refresh the page.');
  throw error;
}

// ============================================================================
// UTILITIES
// ============================================================================

// Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = CONFIG.REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
  try {
    await updateUsage();
    setupEventListeners();
    setupValidation();

    // Load draft (infinite budget feature)
    loadDraft();

    // Performance mark
    performance.mark('app-init-end');
    performance.measure('app-init', 'app-init-start', 'app-init-end');

    console.log('✓ CheatCodez initialized (production-perfect)');
  } catch (error) {
    console.error('Initialization error:', error);
    alert('Failed to initialize app. Please refresh the page.');
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Optimize button
  DOM.optimizeBtn.addEventListener('click', handleOptimize);

  // Copy button
  DOM.copyBtn.addEventListener('click', handleCopy);

  // Verify button
  DOM.verifyBtn.addEventListener('click', handleVerification);

  // Keyboard shortcuts
  DOM.userPromptTextarea.addEventListener('keydown', (e) => {
    // Shift+Enter to submit
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleOptimize();
    }

    // Cmd/Ctrl+Enter to submit
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleOptimize();
    }
  });

  // Verification code - Enter to submit
  DOM.verificationCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerification();
    }
  });

  // Auto-uppercase verification codes
  DOM.verificationCodeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
  });
}

// ============================================================================
// VALIDATION
// ============================================================================

function setupValidation() {
  // Real-time character count
  DOM.userPromptTextarea.addEventListener('input', debounce(() => {
    const length = DOM.userPromptTextarea.value.length;
    if (length > CONFIG.MAX_PROMPT_LENGTH) {
      DOM.userPromptTextarea.value = DOM.userPromptTextarea.value.slice(0, CONFIG.MAX_PROMPT_LENGTH);
      showError(`Maximum ${CONFIG.MAX_PROMPT_LENGTH} characters allowed`);
    }
  }, CONFIG.DEBOUNCE_MS));
}

// ============================================================================
// API CALLS
// ============================================================================

// Update usage display
async function updateUsage() {
  try {
    const response = await fetchWithTimeout('/api/usage');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.currentUsage = data;

    if (data.isPaid) {
      DOM.usageText.textContent = '🎮 UNLIMITED CHEAT CODES ACTIVATED';
      DOM.usageText.style.color = '#00ff41';
    } else {
      const remaining = data.remaining;
      DOM.usageText.textContent = `${remaining} free cheat code${remaining !== 1 ? 's' : ''} remaining`;

      if (remaining === 0) {
        DOM.usageText.textContent = 'No free cheat codes remaining';
        DOM.usageText.style.color = '#ff0066';
      }
    }
  } catch (error) {
    console.error('Error fetching usage:', error);
    DOM.usageText.textContent = 'Error loading usage data';
    DOM.usageText.style.color = '#ff6600';
  }
}

// Handle optimize button click
async function handleOptimize() {
  // Prevent double-submit
  if (state.isProcessing) {
    console.log('Request already in progress');
    return;
  }

  const prompt = DOM.userPromptTextarea.value.trim();

  // Validation
  if (!prompt) {
    showError('Please enter a prompt to optimize!');
    DOM.userPromptTextarea.focus();
    return;
  }

  if (prompt.length > CONFIG.MAX_PROMPT_LENGTH) {
    showError(`Prompt too long. Maximum ${CONFIG.MAX_PROMPT_LENGTH} characters.`);
    return;
  }

  // Generate request ID (for idempotency)
  const requestId = `${Date.now()}-${Math.random()}`;
  state.lastRequestId = requestId;

  // Set processing state
  state.isProcessing = true;
  setLoadingState(true);

  // Haptic feedback
  triggerHaptic('medium');

  try {
    const response = await fetchWithTimeout('/api/optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    // Check if this request is still current
    if (state.lastRequestId !== requestId) {
      console.log('Request superseded');
      return;
    }

    if (response.status === 403) {
      // Out of free uses - show paywall
      DOM.paywall.style.display = 'block';
      DOM.outputSection.style.display = 'none';
      await updateUsage();
      scrollTo(DOM.paywall);
    } else if (response.status === 429) {
      // Rate limited
      const data = await response.json();
      showError(data.message || 'Rate limit exceeded. Please wait and try again.');
    } else if (response.status === 400) {
      // Validation error
      const data = await response.json();
      showError(data.error || 'Invalid input');
    } else if (response.ok) {
      // Success!
      const data = await response.json();

      // Display optimized prompt
      DOM.optimizedOutput.textContent = data.optimized;
      DOM.outputSection.style.display = 'block';
      DOM.paywall.style.display = 'none';

      // Update usage
      await updateUsage();

      // Scroll to output
      scrollTo(DOM.outputSection);

      // Analytics/tracking (if needed)
      console.log('✓ Cheat code generated');
    } else {
      // Other errors
      const data = await response.json().catch(() => ({}));
      showError(data.error || data.message || 'Failed to optimize prompt. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);

    if (error.message.includes('timed out')) {
      showError('Request timed out. The server might be busy. Please try again.');
    } else if (error.message.includes('Failed to fetch')) {
      showError('Network error. Please check your connection and try again.');
    } else {
      showError(error.message || 'An error occurred. Please try again.');
    }
  } finally {
    // Reset processing state
    state.isProcessing = false;
    setLoadingState(false);
  }
}

// Handle copy button click
async function handleCopy() {
  const text = DOM.optimizedOutput.textContent;

  if (!text) {
    showError('Nothing to copy');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);

    // Haptic feedback on mobile
    triggerHaptic('success');

    // Show feedback with ripple animation
    const originalText = DOM.copyBtn.querySelector('span').textContent;
    DOM.copyBtn.querySelector('span').textContent = '✅ Copied!';
    DOM.copyBtn.classList.add('copied');

    setTimeout(() => {
      DOM.copyBtn.querySelector('span').textContent = originalText;
      DOM.copyBtn.classList.remove('copied');
    }, 2000);
  } catch (error) {
    console.error('Copy failed:', error);

    // Fallback: select text
    try {
      const range = document.createRange();
      range.selectNode(DOM.optimizedOutput);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);

      if (window.toast) {
        window.toast.info('Text selected! Press Ctrl+C (or Cmd+C) to copy.');
      }
    } catch (selectError) {
      showError('Could not copy. Please select and copy manually.');
    }
  }
}

// Handle verification code submission
async function handleVerification() {
  const code = DOM.verificationCodeInput.value.trim().toUpperCase();

  if (!code) {
    showError('Please enter a verification code');
    DOM.verificationCodeInput.focus();
    return;
  }

  // Set loading state
  DOM.verifyBtn.disabled = true;
  const originalText = DOM.verifyBtn.textContent;
  DOM.verifyBtn.textContent = 'Verifying...';

  try {
    const response = await fetchWithTimeout('/api/upgrade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ verificationCode: code })
    });

    if (response.ok) {
      // Success!
      DOM.paywall.style.display = 'none';
      await updateUsage();

      // Show success message
      showSuccess('🎮 SUCCESS! You now have UNLIMITED cheat codes!');

      // Clear input
      DOM.verificationCodeInput.value = '';

      // Scroll to top
      scrollTo(DOM.userPromptTextarea);
    } else {
      const data = await response.json().catch(() => ({}));
      showError(data.error || 'Invalid code. Please check and try again.');
      DOM.verificationCodeInput.select();
    }
  } catch (error) {
    console.error('Verification error:', error);

    if (error.message.includes('timed out')) {
      showError('Request timed out. Please try again.');
    } else {
      showError('Network error. Please try again.');
    }
  } finally {
    DOM.verifyBtn.disabled = false;
    DOM.verifyBtn.textContent = originalText;
  }
}

// ============================================================================
// UI HELPERS
// ============================================================================

function setLoadingState(isLoading) {
  DOM.optimizeBtn.disabled = isLoading;

  const buttonText = DOM.optimizeBtn.querySelector('.button-text');
  if (buttonText) {
    buttonText.textContent = isLoading ? 'GENERATING...' : 'GET CHEAT CODE';
  }

  if (isLoading) {
    DOM.optimizeBtn.classList.add('loading');
  } else {
    DOM.optimizeBtn.classList.remove('loading');
  }
}

function showError(message, type = 'error') {
  if (window.toast) {
    window.toast.error(message);
  } else {
    alert(message); // Fallback
  }
  console.error(message);
}

function showSuccess(message) {
  if (window.toast) {
    window.toast.success(message);
  } else {
    alert(message); // Fallback
  }
  console.log(message);
}

function scrollTo(element) {
  if (element && element.scrollIntoView) {
    setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
}

// ============================================================================
// INFINITE BUDGET FEATURES - $400B level polish
// ============================================================================

// 1. AUTO-SAVE DRAFT to localStorage (never lose work)
function saveDraft() {
  const draft = DOM.userPromptTextarea.value;
  if (draft) {
    localStorage.setItem('cheatcodez_draft', draft);
    localStorage.setItem('cheatcodez_draft_timestamp', Date.now());
  } else {
    localStorage.removeItem('cheatcodez_draft');
    localStorage.removeItem('cheatcodez_draft_timestamp');
  }
}

function loadDraft() {
  const draft = localStorage.getItem('cheatcodez_draft');
  const timestamp = localStorage.getItem('cheatcodez_draft_timestamp');

  if (draft && timestamp) {
    const age = Date.now() - parseInt(timestamp);
    const ONE_DAY = 24 * 60 * 60 * 1000;

    // Only restore drafts < 24 hours old
    if (age < ONE_DAY) {
      DOM.userPromptTextarea.value = draft;
      console.log('✓ Draft restored');
    } else {
      localStorage.removeItem('cheatcodez_draft');
      localStorage.removeItem('cheatcodez_draft_timestamp');
    }
  }
}

// Auto-save on input (debounced)
DOM.userPromptTextarea.addEventListener('input', debounce(saveDraft, 1000));

// 2. HAPTIC FEEDBACK (mobile vibration)
function triggerHaptic(type = 'light') {
  if (!navigator.vibrate) return;

  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [10, 20, 10],
    error: [20, 10, 20, 10, 20]
  };

  navigator.vibrate(patterns[type] || patterns.light);
}

// 3. KEYBOARD SHORTCUTS
const shortcuts = {
  '?': showKeyboardShortcuts,
  'Escape': hideKeyboardShortcuts,
};

function showKeyboardShortcuts() {
  let overlay = document.querySelector('.keyboard-shortcuts');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'keyboard-shortcuts';
    overlay.innerHTML = `
      <h2>⌨️ Keyboard Shortcuts</h2>
      <div class="shortcut-list">
        <div class="shortcut-item">
          <span class="shortcut-key">?</span>
          <span class="shortcut-description">Show shortcuts</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-key">Shift + Enter</span>
          <span class="shortcut-description">Optimize prompt</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-key">Ctrl/Cmd + Enter</span>
          <span class="shortcut-description">Optimize prompt</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut-key">Escape</span>
          <span class="shortcut-description">Close dialog</span>
        </div>
      </div>
      <button class="shortcuts-close" onclick="this.parentElement.classList.remove('show')">
        Close
      </button>
    `;
    document.body.appendChild(overlay);
  }

  overlay.classList.add('show');
}

function hideKeyboardShortcuts() {
  const overlay = document.querySelector('.keyboard-shortcuts');
  if (overlay) {
    overlay.classList.remove('show');
  }
}

// Global keyboard listener
document.addEventListener('keydown', (e) => {
  // Ignore if typing in input
  if (e.target.matches('input, textarea')) {
    if (e.key === 'Escape') {
      hideKeyboardShortcuts();
    }
    return;
  }

  if (shortcuts[e.key]) {
    e.preventDefault();
    shortcuts[e.key]();
  }
});

// 4. OFFLINE DETECTION
let offlineIndicator;

function showOfflineIndicator() {
  if (!offlineIndicator) {
    offlineIndicator = document.createElement('div');
    offlineIndicator.className = 'offline-indicator';
    offlineIndicator.textContent = '⚠️ No internet connection';
    document.body.appendChild(offlineIndicator);
  }
  offlineIndicator.classList.add('show');
}

function hideOfflineIndicator() {
  if (offlineIndicator) {
    offlineIndicator.classList.remove('show');
  }
}

window.addEventListener('online', () => {
  hideOfflineIndicator();
  if (window.toast) {
    window.toast.success('Back online!');
  }
});

window.addEventListener('offline', () => {
  showOfflineIndicator();
  if (window.toast) {
    window.toast.error('Lost internet connection');
  }
});

// 5. PWA INSTALL PROMPT
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show custom install prompt after 30 seconds
  setTimeout(showInstallPrompt, 30000);
});

function showInstallPrompt() {
  if (!deferredPrompt) return;

  const prompt = document.createElement('div');
  prompt.className = 'install-prompt';
  prompt.innerHTML = `
    <strong>📱 Install CheatCodez</strong>
    <p>Get faster access with our mobile app!</p>
    <button class="install-yes">Install</button>
    <button class="install-no">Not now</button>
  `;

  const yesBtn = prompt.querySelector('.install-yes');
  const noBtn = prompt.querySelector('.install-no');

  yesBtn.addEventListener('click', async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install: ${outcome}`);
    deferredPrompt = null;
    prompt.remove();
  });

  noBtn.addEventListener('click', () => {
    prompt.remove();
    deferredPrompt = null;
  });

  document.body.appendChild(prompt);
  prompt.classList.add('show');
}

// 6. PERFORMANCE MONITORING (hooks for analytics)
const performance = {
  startTime: Date.now(),

  mark(name) {
    if (window.performance && window.performance.mark) {
      window.performance.mark(name);
    }
  },

  measure(name, startMark, endMark) {
    if (window.performance && window.performance.measure) {
      try {
        window.performance.measure(name, startMark, endMark);
      } catch (e) {
        // Marks might not exist
      }
    }
  },

  // Track Core Web Vitals
  trackWebVitals() {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {}

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            console.log('FID:', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {}
    }
  }
};

// Start performance tracking
performance.mark('app-init-start');
performance.trackWebVitals();

// 7. ERROR RECOVERY with exponential backoff
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      return response;
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.message.includes('HTTP 4')) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000;
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// 8. LOADING SKELETON for usage indicator
function setUsageLoading(isLoading) {
  const usageElement = document.getElementById('usage');
  if (isLoading) {
    usageElement.classList.add('loading');
  } else {
    usageElement.classList.remove('loading');
  }
}

// Update usage to use skeleton
const originalUpdateUsage = updateUsage;
async function updateUsage() {
  setUsageLoading(true);
  try {
    await originalUpdateUsage();
  } finally {
    setUsageLoading(false);
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);

  // Track error (hook for analytics)
  performance.mark('error-occurred');
});

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);

  // Track error (hook for analytics)
  performance.mark('promise-rejection');
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for debugging (if needed)
if (typeof window !== 'undefined') {
  window.CheatCodez = {
    state,
    updateUsage,
    version: '2.0.0-hardened'
  };
}
