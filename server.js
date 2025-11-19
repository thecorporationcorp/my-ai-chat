require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// Simple file-based storage for usage tracking
const USAGE_FILE = path.join(__dirname, 'usage.json');

// Initialize usage file if it doesn't exist
if (!fs.existsSync(USAGE_FILE)) {
  fs.writeFileSync(USAGE_FILE, JSON.stringify({}));
}

// Get or create user session
function getUserSession(req, res) {
  let userId = req.cookies.userId;

  if (!userId) {
    userId = uuidv4();
    res.cookie('userId', userId, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true });
  }

  return userId;
}

// Get user usage data
function getUserUsage(userId) {
  const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
  return data[userId] || { count: 0, isPaid: false };
}

// Update user usage
function updateUserUsage(userId, usage) {
  const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
  data[userId] = usage;
  fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
}

// API endpoint to check usage
app.get('/api/usage', (req, res) => {
  const userId = getUserSession(req, res);
  const usage = getUserUsage(userId);

  res.json({
    remaining: usage.isPaid ? 'unlimited' : Math.max(0, 3 - usage.count),
    isPaid: usage.isPaid,
    total: usage.count
  });
});

// API endpoint to optimize prompt (the main cheat code generator)
app.post('/api/optimize', async (req, res) => {
  const userId = getUserSession(req, res);
  const usage = getUserUsage(userId);
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Check if user has uses remaining
  if (!usage.isPaid && usage.count >= 3) {
    return res.status(403).json({
      error: 'Out of free cheat codes',
      message: 'You\'ve used all 3 free cheat codes. Upgrade for unlimited access!'
    });
  }

  try {
    // Call AI API to optimize the prompt
    const optimizedPrompt = await optimizePromptWithAI(prompt);

    // Increment usage count
    usage.count += 1;
    updateUserUsage(userId, usage);

    res.json({
      original: prompt,
      optimized: optimizedPrompt,
      remaining: usage.isPaid ? 'unlimited' : Math.max(0, 3 - usage.count)
    });
  } catch (error) {
    console.error('Error optimizing prompt:', error);
    res.status(500).json({ error: 'Failed to optimize prompt' });
  }
});

// Upgrade user to paid (manual verification endpoint)
app.post('/api/upgrade', (req, res) => {
  const userId = getUserSession(req, res);
  const { verificationCode } = req.body;

  // Simple verification - you can change this to match your Ko-fi/PayPal codes
  const validCodes = (process.env.VALID_CODES || '').split(',');

  if (validCodes.includes(verificationCode)) {
    const usage = getUserUsage(userId);
    usage.isPaid = true;
    updateUserUsage(userId, usage);

    return res.json({ success: true, message: 'Upgraded to unlimited!' });
  }

  res.status(400).json({ error: 'Invalid verification code' });
});

// ============================================================================
// THE GAME GENIE ENGINE - This is where the magic happens
// ============================================================================

/**
 * CHEAT CODE SYSTEM - Inspired by Game Genie
 *
 * Game Genie intercepted game memory and replaced data with cheat codes.
 * CheatCodez intercepts prompts and injects optimization codes.
 *
 * Each "cheat code" targets a specific weakness in the prompt:
 *
 * CODE 1: TOOLSEEKER - Forces LLM to reveal if tools/products/commands exist
 * CODE 2: SPECIFICITY+ - Transforms vague into specific
 * CODE 3: STEPBYSTEP - Demands step-by-step breakdown
 * CODE 4: EXAMPLES++ - Forces concrete examples
 * CODE 5: EXPERTMODE - Skips beginner explanations
 * CODE 6: SHORTCUT - Reveals the fastest/easiest way
 * CODE 7: EDGECASES - Exposes potential problems
 * CODE 8: CONTEXT_INJECT - Adds critical missing context
 * CODE 9: ASSUMPTION_BREAK - Questions hidden assumptions
 * CODE 10: TRUTHSERUM - "What are you not telling me?"
 * CODE 11: FORMAT_CONTROL - Structures the response
 * CODE 12: DEPTH_DIAL - Controls detail level
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

## EXAMPLES

**Bad:** "how do i fix my code"

**Cheat Code:** "I have code that's not working as expected. Before we debug:
1. First, are there any debugging tools, linters, or extensions I should be using that would catch this automatically?
2. Here's my code: [user needs to paste it]
3. Expected behavior: [describe]
4. Actual behavior: [describe]

Please analyze step-by-step, identify the root cause, explain why it's happening, provide the fixed code with inline comments, and tell me what I should learn to prevent this in the future. If there's a faster way to debug this category of issues, show me that too."

---

**Bad:** "best way to learn python"

**Cheat Code:** "What's the fastest way to become productive in Python for [user's specific use case - web dev/data science/automation]?

Skip beginner resources. I need:
1. The 20% of Python that covers 80% of real-world usage
2. Specific projects to build (with links to good examples)
3. Common mistakes to avoid
4. Tools/IDEs/extensions that speed up development
5. What I should skip learning (at least initially)

Assume I already know programming basics. Give me the shortcut to productivity, not the 'complete' path."

---

**Bad:** "website won't load"

**Cheat Code:** "My website isn't loading. Before troubleshooting:
- Are there any diagnostic tools or commands I should run first to identify the issue category?
- What are the most common causes of website loading failures, ranked by probability?

Context:
- Platform: [hosting platform]
- Domain: [domain]
- Error message: [exact error]
- What changed recently: [list]
- Already tried: [list]

Please provide step-by-step diagnostics, starting with the fastest checks first. For each potential cause, give me the exact command or test to verify it. If this is likely something with a known fix/tool, tell me immediately."

---

**Bad:** "make my app faster"

**Cheat Code:** "I need to optimize my app's performance.

First: What profiling/monitoring tools should I be using to identify bottlenecks? Don't guess - let's measure.

Context:
- Tech stack: [framework/language]
- Specific slowness: [page load/query/etc.]
- Current metrics: [numbers if available]
- Scale: [users/requests]

Then provide:
1. The top 3 most common performance bottlenecks for [this tech stack], ranked by likelihood
2. How to diagnose which one I have (specific tools/commands)
3. Fixes for each, with expected impact
4. The low-hanging fruit - quick wins I can implement in under an hour

Skip theoretical optimization. Give me practical, measurable improvements."

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

// Main AI optimization function - Works with ANY OpenAI-compatible API
async function optimizePromptWithAI(userPrompt) {
  // Determine which API to use
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
    console.log('No API key found, using fallback optimization');
    return generateFallbackOptimization(userPrompt);
  }

  // Check if using Anthropic (different API format)
  if (process.env.ANTHROPIC_API_KEY || apiUrl.includes('anthropic')) {
    return await optimizeWithAnthropic(userPrompt);
  }

  // OpenAI-compatible API (works with OpenAI, Perplexity, Together, etc.)
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: GOD_PROMPT
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('API error:', error);
    return generateFallbackOptimization(userPrompt);
  }
}

// Anthropic-specific API call (different format)
async function optimizeWithAnthropic(userPrompt) {
  try {
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
        messages: [
          {
            role: 'user',
            content: `${GOD_PROMPT}\n\n${userPrompt}`
          }
        ]
      })
    });

    const data = await response.json();
    return data.content[0].text.trim();
  } catch (error) {
    console.error('Anthropic API error:', error);
    return generateFallbackOptimization(userPrompt);
  }
}

// Advanced fallback optimization - No API needed
function generateFallbackOptimization(prompt) {
  console.log('Using rule-based fallback optimization');

  // Analyze the prompt
  const isVague = prompt.length < 50;
  const hasNoContext = !prompt.includes('context') && !prompt.includes('using') && !prompt.includes('with');
  const hasNoGoal = !prompt.includes('want') && !prompt.includes('need') && !prompt.includes('how');
  const isQuestion = prompt.includes('?');

  let optimized = prompt;

  // Build the optimized version using cheat codes
  const enhancements = [];

  // Always add TOOLSEEKER
  enhancements.push("First: Do any tools, products, commands, or libraries exist that solve this directly? If yes, tell me immediately.");

  // Add context request if missing
  if (hasNoContext) {
    enhancements.push("\nProvide context about:\n- Environment (OS, language, framework, etc.)\n- What's been tried already\n- Specific constraints or requirements");
  }

  // Add structure requirements
  enhancements.push("\nStructure your response:");
  enhancements.push("1. Quick answer (if a shortcut/tool exists, say it NOW)");
  enhancements.push("2. Step-by-step breakdown");
  enhancements.push("3. Concrete examples");
  enhancements.push("4. Potential pitfalls or edge cases");
  enhancements.push("5. What I should have asked (if I'm missing something)");

  // Add specificity requirements
  enhancements.push("\nBe extremely specific:");
  enhancements.push("- Include exact commands, not descriptions");
  enhancements.push("- Provide actual URLs/links where relevant");
  enhancements.push("- Give concrete examples, not abstract explanations");

  // Combine
  optimized = `${prompt}\n\n${enhancements.join('\n')}`;

  return optimized;
}

// Start server
app.listen(PORT, () => {
  console.log(`\n🎮 CheatCodez Server Running`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`\nAPI Configuration:`);
  console.log(`- API Key: ${!!(process.env.API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.PERPLEXITY_API_KEY) ? '✅ Configured' : '❌ Missing (using fallback)'}`);
  console.log(`- API URL: ${process.env.API_URL || process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions (default)'}`);
  console.log(`- Model: ${process.env.MODEL_NAME || process.env.OPENAI_MODEL || 'gpt-4o-mini (default)'}`);
  console.log(`\n🔥 CheatCodez Engine: ACTIVE\n`);
});
