// CheatCodez - Frontend JavaScript

// DOM Elements
const userPromptTextarea = document.getElementById('user-prompt');
const optimizeBtn = document.getElementById('optimize-btn');
const outputSection = document.getElementById('output-section');
const optimizedOutput = document.getElementById('optimized-output');
const copyBtn = document.getElementById('copy-btn');
const usageText = document.getElementById('usage-text');
const paywall = document.getElementById('paywall');
const verificationCodeInput = document.getElementById('verification-code');
const verifyBtn = document.getElementById('verify-btn');

// State
let currentUsage = null;

// Initialize
async function init() {
    await updateUsage();
    setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
    optimizeBtn.addEventListener('click', handleOptimize);
    copyBtn.addEventListener('click', handleCopy);
    verifyBtn.addEventListener('click', handleVerification);

    // Allow Enter+Shift to submit
    userPromptTextarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            handleOptimize();
        }
    });
}

// Update usage display
async function updateUsage() {
    try {
        const response = await fetch('/api/usage');
        const data = await response.json();
        currentUsage = data;

        if (data.isPaid) {
            usageText.textContent = '🎮 UNLIMITED CHEAT CODES ACTIVATED';
            usageText.style.color = '#00ff41';
        } else {
            const remaining = data.remaining;
            usageText.textContent = `${remaining} free cheat code${remaining !== 1 ? 's' : ''} remaining`;

            if (remaining === 0) {
                usageText.textContent = 'No free cheat codes remaining';
                usageText.style.color = '#ff0066';
            }
        }
    } catch (error) {
        console.error('Error fetching usage:', error);
        usageText.textContent = 'Error loading usage data';
    }
}

// Handle optimize button click
async function handleOptimize() {
    const prompt = userPromptTextarea.value.trim();

    if (!prompt) {
        alert('Please enter a prompt to optimize!');
        return;
    }

    // Show loading state
    optimizeBtn.disabled = true;
    optimizeBtn.querySelector('.button-text').textContent = 'GENERATING...';
    outputSection.style.display = 'none';
    paywall.style.display = 'none';

    try {
        const response = await fetch('/api/optimize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt })
        });

        if (response.status === 403) {
            // Out of free uses - show paywall
            paywall.style.display = 'block';
            await updateUsage();
        } else if (response.ok) {
            const data = await response.json();

            // Display optimized prompt
            optimizedOutput.textContent = data.optimized;
            outputSection.style.display = 'block';

            // Update usage
            await updateUsage();

            // Scroll to output
            outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            const error = await response.json();
            alert('Error: ' + (error.message || 'Failed to optimize prompt'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    } finally {
        // Reset button
        optimizeBtn.disabled = false;
        optimizeBtn.querySelector('.button-text').textContent = 'GET CHEAT CODE';
    }
}

// Handle copy button click
async function handleCopy() {
    const text = optimizedOutput.textContent;

    try {
        await navigator.clipboard.writeText(text);

        // Show feedback
        const originalText = copyBtn.querySelector('span').textContent;
        copyBtn.querySelector('span').textContent = '✅ Copied!';

        setTimeout(() => {
            copyBtn.querySelector('span').textContent = originalText;
        }, 2000);
    } catch (error) {
        console.error('Copy failed:', error);

        // Fallback: select text
        const range = document.createRange();
        range.selectNode(optimizedOutput);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);

        alert('Text selected! Press Ctrl+C (or Cmd+C) to copy.');
    }
}

// Handle verification code submission
async function handleVerification() {
    const code = verificationCodeInput.value.trim().toUpperCase();

    if (!code) {
        alert('Please enter a verification code');
        return;
    }

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';

    try {
        const response = await fetch('/api/upgrade', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ verificationCode: code })
        });

        if (response.ok) {
            // Success! Hide paywall, update usage
            paywall.style.display = 'none';
            await updateUsage();

            // Show success message
            alert('🎮 SUCCESS! You now have UNLIMITED cheat codes!');

            // Clear input
            verificationCodeInput.value = '';
        } else {
            const error = await response.json();
            alert('Invalid code: ' + (error.error || 'Please check your code and try again'));
        }
    } catch (error) {
        console.error('Verification error:', error);
        alert('Network error. Please try again.');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Activate Unlimited';
    }
}

// Initialize app
init();
