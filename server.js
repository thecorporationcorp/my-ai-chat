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

// Main AI optimization function
async function optimizePromptWithAI(userPrompt) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback to rule-based optimization if no API key
    return generateFallbackOptimization(userPrompt);
  }

  // Use OpenAI API if available
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are the Cheat Code Generator. Your job is to take any user prompt or conversation and return ONLY the optimized version - what they SHOULD have asked to get the best answer from an LLM.

Rules:
- Return ONLY the optimized prompt, nothing else
- Make it more specific and detailed
- Add context that helps the LLM understand intent
- Include phrases that trigger better responses like "step by step", "be specific", "give examples"
- Reveal the "cheat codes" - the secret ways to ask that get real answers
- Don't explain what you did, just return the better prompt

Example:
User: "how do i fix my code"
You: "I'm debugging code that isn't working as expected. Please analyze this code step by step, identify the specific issue, explain why it's happening, and provide the corrected code with comments explaining what changed and why. If there are multiple potential issues, list them all."

Be direct. Be specific. Give them the cheat code.`
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI API error:', error);
      return generateFallbackOptimization(userPrompt);
    }
  }

  // Use Anthropic API if available
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: `You are the Cheat Code Generator. Take this prompt and return ONLY the optimized version - what they SHOULD have asked:\n\n${userPrompt}`
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

  return generateFallbackOptimization(userPrompt);
}

// Fallback optimization using rules (no API needed)
function generateFallbackOptimization(prompt) {
  const improvements = [];

  // Add specificity
  if (prompt.length < 50) {
    improvements.push('Be more specific about your goal');
  }

  // Add structure
  const optimized = `${prompt}

Please provide:
1. A step-by-step explanation
2. Specific examples
3. Potential edge cases or issues to watch for
4. Best practices or recommendations

Be detailed and thorough in your response.`;

  return optimized;
}

// Start server
app.listen(PORT, () => {
  console.log(`CheatCodez server running on http://localhost:${PORT}`);
  console.log(`API Key configured: ${!!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)}`);
});
