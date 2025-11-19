require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MAX_PROMPT_LENGTH: 10000, // 10k chars max
  FREE_TIER_LIMIT: 3,
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_FREE: 10, // 10 requests per minute for free users
  RATE_LIMIT_PAID: 100, // 100 requests per minute for paid users
  REQUEST_TIMEOUT: 30000, // 30 seconds
  USAGE_FILE: path.join(__dirname, 'usage.json'),
};

// ============================================================================
// IN-MEMORY STORAGE (Serverless-compatible)
// ============================================================================

class UsageStore {
  constructor() {
    this.data = new Map(); // In-memory storage
    this.rateLimits = new Map(); // Rate limiting
    this.requestLocks = new Map(); // Prevent race conditions
    this.loadFromFile(); // Try to load persisted data
  }

  // Load data from file (if exists and writable)
  async loadFromFile() {
    try {
      if (fsSync.existsSync(CONFIG.USAGE_FILE)) {
        const fileData = await fs.readFile(CONFIG.USAGE_FILE, 'utf-8');
        const parsed = JSON.parse(fileData);
        this.data = new Map(Object.entries(parsed));
        console.log(`✓ Loaded ${this.data.size} user records from file`);
      }
    } catch (error) {
      console.log('⚠ Could not load usage file (this is OK on serverless):', error.message);
    }
  }

  // Save data to file (if writable)
  async saveToFile() {
    try {
      const obj = Object.fromEntries(this.data);
      await fs.writeFile(CONFIG.USAGE_FILE, JSON.stringify(obj, null, 2));
    } catch (error) {
      // Silently fail on serverless (expected)
      if (!IS_PRODUCTION) {
        console.log('⚠ Could not save usage file:', error.message);
      }
    }
  }

  // Get user usage (atomic)
  getUsage(userId) {
    return this.data.get(userId) || { count: 0, isPaid: false, createdAt: Date.now() };
  }

  // Update user usage (atomic, no race conditions)
  async updateUsage(userId, updates) {
    // Atomic update
    const current = this.getUsage(userId);
    const updated = { ...current, ...updates, updatedAt: Date.now() };
    this.data.set(userId, updated);

    // Persist to file (fire-and-forget)
    this.saveToFile().catch(() => {});

    return updated;
  }

  // Check rate limit
  checkRateLimit(userId, isPaid) {
    const key = `ratelimit:${userId}`;
    const now = Date.now();
    const limit = isPaid ? CONFIG.RATE_LIMIT_PAID : CONFIG.RATE_LIMIT_FREE;

    // Get existing rate limit data
    let rateData = this.rateLimits.get(key) || { count: 0, resetAt: now + CONFIG.RATE_LIMIT_WINDOW };

    // Reset if window expired
    if (now > rateData.resetAt) {
      rateData = { count: 0, resetAt: now + CONFIG.RATE_LIMIT_WINDOW };
    }

    // Increment
    rateData.count++;
    this.rateLimits.set(key, rateData);

    // Check if exceeded
    if (rateData.count > limit) {
      const resetIn = Math.ceil((rateData.resetAt - now) / 1000);
      return {
        allowed: false,
        resetIn,
        limit
      };
    }

    return {
      allowed: true,
      remaining: limit - rateData.count,
      resetAt: rateData.resetAt
    };
  }

  // Cleanup old entries (prevent memory leak)
  cleanup() {
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    // Cleanup old users (free tier, inactive)
    for (const [userId, data] of this.data.entries()) {
      if (!data.isPaid && data.updatedAt && (now - data.updatedAt > maxAge)) {
        this.data.delete(userId);
      }
    }

    // Cleanup old rate limit entries
    for (const [key, data] of this.rateLimits.entries()) {
      if (now > data.resetAt + CONFIG.RATE_LIMIT_WINDOW) {
        this.rateLimits.delete(key);
      }
    }

    console.log(`🧹 Cleanup: ${this.data.size} users, ${this.rateLimits.size} rate limit entries`);
  }
}

const store = new UsageStore();

// Cleanup every hour
setInterval(() => store.cleanup(), 60 * 60 * 1000);

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS - Restrictive in production
const corsOptions = IS_PRODUCTION
  ? {
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false,
      credentials: true
    }
  : {}; // Wide open in dev

app.use(cors(corsOptions));
app.use(express.json({ limit: '50kb' })); // Limit payload size
app.use(cookieParser());
app.use(express.static('public'));

// Request timeout
app.use((req, res, next) => {
  req.setTimeout(CONFIG.REQUEST_TIMEOUT);
  res.setTimeout(CONFIG.REQUEST_TIMEOUT);
  next();
});

// Security headers
app.use((req, res, next) => {
  // Content Security Policy - Prevents XSS attacks
  res.setHeader(
    'Content-Security-Policy',
    IS_PRODUCTION
      ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.openai.com https://api.anthropic.com https://api.perplexity.ai https://api.together.xyz https://openrouter.ai; media-src 'self' https://assets.mixkit.co https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
      : "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src *; media-src *;" // Permissive in dev
  );

  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // HSTS in production
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
});

// ============================================================================
// UTILITIES
// ============================================================================

// Get or create user session
function getUserSession(req, res) {
  let userId = req.cookies.userId;

  if (!userId) {
    userId = uuidv4();
    res.cookie('userId', userId, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'strict' // CSRF protection
    });
  }

  return userId;
}

// Input validation
function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt is required' };
  }

  const trimmed = prompt.trim();

  if (!trimmed) {
    return { valid: false, error: 'Prompt cannot be empty' };
  }

  if (trimmed.length > CONFIG.MAX_PROMPT_LENGTH) {
    return {
      valid: false,
      error: `Prompt too long. Maximum ${CONFIG.MAX_PROMPT_LENGTH} characters (you sent ${trimmed.length})`
    };
  }

  return { valid: true, prompt: trimmed };
}

// Error handler
function handleError(res, error, message = 'Internal server error') {
  console.error('Error:', error);

  const response = { error: message };

  // Include details in development
  if (!IS_PRODUCTION) {
    response.details = error.message;
    response.stack = error.stack;
  }

  res.status(500).json(response);
}

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    storage: store.data.size,
    uptime: process.uptime()
  });
});

// Get usage
app.get('/api/usage', (req, res) => {
  try {
    const userId = getUserSession(req, res);
    const usage = store.getUsage(userId);

    res.json({
      remaining: usage.isPaid ? 'unlimited' : Math.max(0, CONFIG.FREE_TIER_LIMIT - usage.count),
      isPaid: usage.isPaid,
      total: usage.count
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch usage');
  }
});

// Optimize prompt (main endpoint)
app.post('/api/optimize', async (req, res) => {
  try {
    const userId = getUserSession(req, res);
    const usage = store.getUsage(userId);

    // Input validation
    const validation = validatePrompt(req.body.prompt);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Rate limiting
    const rateLimit = store.checkRateLimit(userId, usage.isPaid);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${rateLimit.resetIn} seconds.`,
        retryAfter: rateLimit.resetIn
      });
    }

    // Check free tier limit
    if (!usage.isPaid && usage.count >= CONFIG.FREE_TIER_LIMIT) {
      return res.status(403).json({
        error: 'Out of free cheat codes',
        message: 'You\'ve used all 3 free cheat codes. Upgrade for unlimited access!'
      });
    }

    // Call AI optimizer
    const optimizedPrompt = await optimizePromptWithAI(validation.prompt);

    // Update usage count (atomic)
    const newUsage = await store.updateUsage(userId, {
      count: usage.count + 1
    });

    // Return result
    res.json({
      original: validation.prompt,
      optimized: optimizedPrompt,
      remaining: newUsage.isPaid ? 'unlimited' : Math.max(0, CONFIG.FREE_TIER_LIMIT - newUsage.count)
    });
  } catch (error) {
    handleError(res, error, 'Failed to optimize prompt');
  }
});

// ============================================================================
// PROJECT-BASED ENDPOINT (Uses OpenAI Project System)
// ============================================================================

/**
 * /api/generate - OpenAI Project Integration
 *
 * This endpoint uses the OpenAI Responses API with Projects.
 * System prompts live in the OpenAI Project files, NOT in this code.
 *
 * SETUP:
 * 1. Create an OpenAI Project at https://platform.openai.com/projects
 * 2. Upload your system prompt file (e.g., system.md) to the project
 * 3. Copy the Project ID (e.g., proj_abc123...)
 * 4. Add it to your .env file: OPENAI_PROJECT_ID=proj_abc123...
 * 5. Restart server - everything will work instantly
 */
app.post('/api/generate', async (req, res) => {
  try {
    const userId = getUserSession(req, res);
    const usage = store.getUsage(userId);

    // Input validation
    const validation = validatePrompt(req.body.prompt);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Rate limiting
    const rateLimit = store.checkRateLimit(userId, usage.isPaid);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${rateLimit.resetIn} seconds.`,
        retryAfter: rateLimit.resetIn
      });
    }

    // Check free tier limit
    if (!usage.isPaid && usage.count >= CONFIG.FREE_TIER_LIMIT) {
      return res.status(403).json({
        error: 'Out of free cheat codes',
        message: 'You\'ve used all 3 free cheat codes. Upgrade for unlimited access!'
      });
    }

    // PLACEHOLDER: Insert your OpenAI Project ID here
    const projectId = process.env.OPENAI_PROJECT_ID || 'YOUR_PROJECT_ID_HERE';

    if (projectId === 'YOUR_PROJECT_ID_HERE') {
      console.warn('⚠️  OPENAI_PROJECT_ID not configured');
      return res.status(500).json({
        error: 'Project not configured',
        message: 'OpenAI Project ID is missing. Add OPENAI_PROJECT_ID to your .env file.',
        docs: 'https://platform.openai.com/docs/api-reference/project'
      });
    }

    // Call OpenAI with Project (system prompt lives in project files)
    const optimizedPrompt = await generateWithProject({
      prompt: validation.prompt,
      projectId: projectId
    });

    // Update usage count (atomic)
    const newUsage = await store.updateUsage(userId, {
      count: usage.count + 1
    });

    // Return result
    res.json({
      original: validation.prompt,
      optimized: optimizedPrompt,
      remaining: newUsage.isPaid ? 'unlimited' : Math.max(0, CONFIG.FREE_TIER_LIMIT - newUsage.count)
    });
  } catch (error) {
    handleError(res, error, 'Failed to generate response');
  }
});

// Upgrade to paid
app.post('/api/upgrade', async (req, res) => {
  try {
    const userId = getUserSession(req, res);
    const { verificationCode } = req.body;

    if (!verificationCode || typeof verificationCode !== 'string') {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    // Check code
    const validCodes = (process.env.VALID_CODES || '').split(',').map(c => c.trim());

    if (validCodes.includes(verificationCode.trim().toUpperCase())) {
      await store.updateUsage(userId, { isPaid: true });

      return res.json({
        success: true,
        message: 'Upgraded to unlimited!'
      });
    }

    res.status(400).json({ error: 'Invalid verification code' });
  } catch (error) {
    handleError(res, error, 'Failed to upgrade');
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// ============================================================================
// THE GAME GENIE ENGINE
// ============================================================================

/**
 * CHEAT CODE SYSTEM - Full documentation in CHEATCODES.md
 *
 * 12 cheat codes that transform weak prompts into optimized prompts:
 * 1. TOOLSEEKER - Forces LLM to reveal if tools/products exist
 * 2. SPECIFICITY+ - Transforms vague into specific
 * 3. STEPBYSTEP - Demands step-by-step breakdown
 * 4. EXAMPLES++ - Forces concrete examples
 * 5. EXPERTMODE - Skips beginner explanations
 * 6. SHORTCUT - Reveals the fastest way
 * 7. EDGECASES - Exposes potential problems
 * 8. CONTEXT_INJECT - Adds critical missing context
 * 9. ASSUMPTION_BREAK - Questions hidden assumptions
 * 10. TRUTHSERUM - "What are you not telling me?"
 * 11. FORMAT_CONTROL - Structures the response
 * 12. DEPTH_DIAL - Controls detail level
 */

const GOD_PROMPT = `You are the CHEAT CODE GENERATOR - like Game Genie for LLMs.

Your mission: Transform weak prompts into OPTIMIZED prompts that force LLMs to give REAL answers.

## THE PROBLEM YOU'RE SOLVING

LLMs WITHHOLD information. Not maliciously - they just need to be asked the RIGHT way. People waste:
- Hours when the answer takes 2 minutes
- Days when a tool exists they don't know about
- Months when the LLM knew the shortcut all along

Example: User spends 3 months reconfiguring a keyboard when the LLM could have said "buy this $20 adapter" on day 1.

Your job: Make sure that NEVER happens.

## YOUR PROCESS

Analyze the user's prompt for these deficiencies:

1. **VAGUE** - Not specific enough
2. **NO CONTEXT** - Missing critical information
3. **NO GOAL** - Unclear what they want to achieve
4. **NO EXAMPLES** - Doesn't ask for concrete examples
5. **NO TOOLS** - Doesn't ask if easier tools exist
6. **NO SHORTCUT** - Doesn't ask for the fast way
7. **NO DEPTH** - Doesn't specify how detailed
8. **NO EDGE CASES** - Doesn't ask what could go wrong
9. **NO STRUCTURE** - Doesn't format the response
10. **BEGINNER ASSUMED** - LLM will assume they're a beginner
11. **HIDDEN ASSUMPTIONS** - User doesn't know what they don't know
12. **NO ESCAPE HATCH** - Doesn't ask "what should I have asked instead"

## CHEAT CODES TO INJECT

Based on the deficiencies, inject these magic phrases:

**TOOLSEEKER:**
"First, tell me if any tools, products, libraries, or commands exist that solve this directly. Don't make me build from scratch if a solution already exists."

**SHORTCUT:**
"What's the fastest/easiest way to do this? Don't give me the 'proper' way if there's a shortcut that works."

**EXPERTMODE:**
"Assume I'm experienced. Skip the basics. Give me the advanced answer."

**SPECIFICITY+:**
"Be extremely specific. Include exact commands, file names, version numbers, URLs where relevant."

**STEPBYSTEP:**
"Break this down step-by-step. Number each step clearly."

**EXAMPLES++:**
"Provide concrete examples. Show, don't just tell."

**EDGECASES:**
"What could go wrong? What edge cases should I know about?"

**CONTEXT_INJECT:**
Add critical context like:
- What's the end goal?
- What's been tried already?
- What's the environment? (OS, language, framework, etc.)
- What are the constraints?

**TRUTHSERUM:**
"If there's something I should have asked but didn't, tell me what it is."

**FORMAT_CONTROL:**
"Format your response as: [numbered list/code blocks/table/etc.]"

**ASSUMPTION_BREAK:**
"Don't assume [X]. I actually need [Y]."

## YOUR OUTPUT

Return ONLY the optimized prompt. No explanations. No meta-commentary. Just the cheat code.

## CRITICAL RULES

1. **Always inject TOOLSEEKER** - "Does a tool exist?" is the most important question
2. **Always inject TRUTHSERUM** - "What should I have asked?" catches blind spots
3. **Always inject SHORTCUT** - People want fast answers, not perfect answers
4. **Add structure** - Numbered lists, clear sections
5. **Add measurements** - "How long will this take?", "What's the expected result?"
6. **Force specificity** - Replace vague with concrete
7. **Contextualize** - Add the missing information the LLM needs
8. **Be aggressive** - Don't be polite, be effective

## YOUR MISSION

Stop people from wasting time. Give them the cheat code that unlocks the real answer.

Now optimize this prompt:`;

// Main AI optimization function
async function optimizePromptWithAI(userPrompt) {
  const apiKey = process.env.API_KEY ||
                 process.env.OPENAI_API_KEY ||
                 process.env.ANTHROPIC_API_KEY ||
                 process.env.PERPLEXITY_API_KEY;

  const apiUrl = process.env.API_URL ||
                 process.env.OPENAI_API_URL ||
                 'https://api.openai.com/v1/chat/completions';

  const modelName = process.env.MODEL_NAME ||
                    process.env.OPENAI_MODEL ||
                    'gpt-4o-mini';

  if (!apiKey) {
    console.log('⚠ No API key found, using fallback optimization');
    return generateFallbackOptimization(userPrompt);
  }

  // Check if using Anthropic (different API format)
  if (process.env.ANTHROPIC_API_KEY || apiUrl.includes('anthropic')) {
    return await optimizeWithAnthropic(userPrompt);
  }

  // OpenAI-compatible API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: GOD_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('API error:', error.message);
    return generateFallbackOptimization(userPrompt);
  }
}

// Anthropic-specific API call
async function optimizeWithAnthropic(userPrompt) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{ role: 'user', content: `${GOD_PROMPT}\n\n${userPrompt}` }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const data = await response.json();
    return data.content[0].text.trim();
  } catch (error) {
    console.error('Anthropic API error:', error.message);
    return generateFallbackOptimization(userPrompt);
  }
}

// ============================================================================
// PROJECT-BASED AI GENERATION (No system prompt in code!)
// ============================================================================

/**
 * Generate response using OpenAI Project
 *
 * The system prompt lives in the OpenAI Project files (e.g., system.md),
 * NOT in this code. This keeps prompts version-controlled in OpenAI's system.
 *
 * IMPORTANT:
 * - No system prompt needed here
 * - Upload GOD_PROMPT to your project as system.md
 * - OpenAI automatically uses it
 *
 * @param {Object} options - Generation options
 * @param {string} options.prompt - User's prompt
 * @param {string} options.projectId - OpenAI Project ID (e.g., proj_abc123...)
 * @returns {Promise<string>} - Generated response
 */
async function generateWithProject({ prompt, projectId }) {
  const apiKey = process.env.OPENAI_API_KEY ||
                 process.env.API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured. Add it to your .env file.');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    // OpenAI API call with Project ID
    // System prompt comes from project files, NOT from this code
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        // CRITICAL: This tells OpenAI to use your project's system prompt
        'OpenAI-Project': projectId
      },
      body: JSON.stringify({
        model: model,
        messages: [
          // NO system message here - it comes from the project files
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Project API error:', errorText);

      // Better error messages
      if (response.status === 401) {
        throw new Error('Invalid API key. Check your OPENAI_API_KEY in .env');
      }
      if (response.status === 404) {
        throw new Error(`Project not found: ${projectId}. Check your OPENAI_PROJECT_ID in .env`);
      }
      if (response.status === 403) {
        throw new Error(`Access denied to project: ${projectId}. Verify project permissions.`);
      }

      throw new Error(`OpenAI API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response structure from OpenAI API');
    }

    return data.choices[0].message.content.trim();
  } catch (error) {
    // Log the error but don't expose API keys
    console.error('Generate with project failed:', error.message);

    // Re-throw with sanitized message
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. The AI took too long to respond.');
    }

    throw error;
  }
}

// Advanced fallback optimization
function generateFallbackOptimization(prompt) {
  console.log('Using rule-based fallback optimization');

  const enhancements = [
    "First: Do any tools, products, commands, or libraries exist that solve this directly? If yes, tell me immediately.",
    "\nStructure your response:",
    "1. Quick answer (if a shortcut/tool exists, say it NOW)",
    "2. Step-by-step breakdown",
    "3. Concrete examples",
    "4. Potential pitfalls or edge cases",
    "5. What I should have asked (if I'm missing something)",
    "\nBe extremely specific:",
    "- Include exact commands, not descriptions",
    "- Provide actual URLs/links where relevant",
    "- Give concrete examples, not abstract explanations"
  ];

  return `${prompt}\n\n${enhancements.join('\n')}`;
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(PORT, () => {
  console.log(`\n🎮 CheatCodez Server Running`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`\nAPI Configuration:`);
  console.log(`- API Key: ${!!(process.env.API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.PERPLEXITY_API_KEY) ? '✅ Configured' : '❌ Missing (using fallback)'}`);
  console.log(`- Storage: ${store.data.size} users in memory`);
  console.log(`\n🔥 CheatCodez Engine: ACTIVE\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  await store.saveToFile();
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  await store.saveToFile();
  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });
});
