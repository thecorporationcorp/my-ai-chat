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
    console.log('✓ CheatCodez initialized');
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

    // Show feedback
    const originalText = DOM.copyBtn.querySelector('span').textContent;
    DOM.copyBtn.querySelector('span').textContent = '✅ Copied!';
    DOM.copyBtn.classList.add('success');

    setTimeout(() => {
      DOM.copyBtn.querySelector('span').textContent = originalText;
      DOM.copyBtn.classList.remove('success');
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
// ERROR HANDLING
// ============================================================================

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
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
