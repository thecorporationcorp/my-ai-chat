# 🎮 CheatCodez

**Cheat codes for AI conversations.** Stop wasting time - get the shortcuts your LLM is hiding from you.

## What is CheatCodez?

CheatCodez is like **Game Genie for AI**. Just like Game Genie intercepted game memory and modified it with cheat codes, CheatCodez intercepts your prompts and injects optimization codes that unlock better answers.

Paste any prompt, question, or entire conversation and get back the **optimized version** - what you *should have asked* to get real answers.

### The 12 Cheat Codes

1. **TOOLSEEKER** - Reveals if tools/products exist
2. **SPECIFICITY+** - Transforms vague into specific
3. **STEPBYSTEP** - Forces numbered breakdowns
4. **EXAMPLES++** - Demands concrete examples
5. **EXPERTMODE** - Skips beginner explanations
6. **SHORTCUT** - Reveals the fastest way
7. **EDGECASES** - Exposes potential problems
8. **CONTEXT_INJECT** - Adds missing context
9. **ASSUMPTION_BREAK** - Challenges hidden assumptions
10. **TRUTHSERUM** - "What should I have asked?"
11. **FORMAT_CONTROL** - Structures responses
12. **DEPTH_DIAL** - Controls detail level

**[Read full cheat code documentation →](CHEATCODES.md)**

### The Problem

LLMs know the answers. They just need to be asked the right way. People waste hours, days, even months because they didn't know the "cheat code" - the specific way to prompt that unlocks the real answer.

### The Solution

CheatCodez takes your prompt and returns the optimized version. Copy it, paste it into ChatGPT/Claude, and get the answer you should have gotten the first time.

## Features

- ✨ **Instant prompt optimization** - Paste anything, get the cheat code
- 🎯 **3 free cheat codes** - Try before you buy
- 💰 **Unlimited tier** - Pay once, optimize forever
- 🔒 **Privacy-focused** - No accounts, just cookies
- ⚡ **Fast & simple** - One text box, one button

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla - no frameworks)
- **Backend:** Node.js + Express
- **AI:** Works with ANY OpenAI-compatible API:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude)
  - Perplexity (research-focused)
  - Together AI (cheap & fast)
  - OpenRouter (multi-model access)
  - Any custom OpenAI-compatible endpoint
- **Database:** Simple JSON file storage (no setup needed)
- **Payments:** Ko-fi / PayPal (manual verification codes)

## Installation & Setup

### Prerequisites

- Node.js 18+ installed
- **Optional:** An API key from any of these:
  - OpenAI (recommended for quality)
  - Anthropic (Claude)
  - Perplexity ($3 credit works!)
  - Together AI (very cheap)
  - OpenRouter
  - Or use NO API key (fallback mode for testing)
- Ko-fi and/or PayPal account for payments

### Quick Start

1. **Clone and install:**
```bash
git clone <your-repo-url>
cd my-ai-chat
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add your API key (choose ONE):

```env
# OPTION 1: OpenAI (best quality)
OPENAI_API_KEY=sk-proj-your-key

# OPTION 2: Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your-key

# OPTION 3: Perplexity (good with $3 credit!)
PERPLEXITY_API_KEY=pplx-your-key
API_URL=https://api.perplexity.ai/chat/completions
MODEL_NAME=llama-3.1-sonar-large-128k-online

# OPTION 4: Together AI (cheap)
API_KEY=your-together-key
API_URL=https://api.together.xyz/v1/chat/completions
MODEL_NAME=meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo

# OPTION 5: OpenRouter (multi-model)
API_KEY=sk-or-your-key
API_URL=https://openrouter.ai/api/v1/chat/completions
MODEL_NAME=anthropic/claude-3.5-sonnet

# OPTION 6: No API key (uses fallback - works but less smart)

# Verification codes for paid users
VALID_CODES=CODE123,CODE456,CODE789
```

See `.env.example` for all options.

3. **Update payment links:**

Open `public/index.html` and replace these placeholders:
- `YOUR_KOFI_LINK` - Your Ko-fi payment link
- `YOUR_PAYPAL_LINK` - Your PayPal.me link or payment link
- `your@email.com` - Your contact email

4. **Run the app:**
```bash
npm start
```

Visit `http://localhost:3000`

## How It Works

### For Users

1. Visit the site
2. Paste a prompt, question, or conversation
3. Click "GET CHEAT CODE"
4. Get the optimized version
5. Copy and paste into ChatGPT/Claude

**Free tier:** 3 cheat codes
**Paid tier:** Unlimited for $4.99

### For You (The Owner)

1. User pays via Ko-fi or PayPal
2. You manually send them a verification code from `.env`
3. They enter the code on the site
4. They get unlimited access forever

**Verification codes are in your `.env` file:**
```env
VALID_CODES=CODE123,CODE456,CODE789
```

Create unique codes for each customer. Example codes:
- `UNLOCK2024`
- `CHEAT9876`
- `UNLIMITED99`

## Deployment

### Deploy to Vercel (Easiest)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Add environment variables in Vercel dashboard:
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
   - `VALID_CODES`

### Deploy to Railway

1. Sign up at [railway.app](https://railway.app)
2. Create new project from GitHub
3. Add environment variables
4. Deploy

### Deploy to Heroku

1. Install Heroku CLI
2. Create app:
```bash
heroku create cheatcodez
```

3. Add environment variables:
```bash
heroku config:set OPENAI_API_KEY=your_key
heroku config:set VALID_CODES=CODE1,CODE2,CODE3
```

4. Deploy:
```bash
git push heroku main
```

### Deploy to DigitalOcean / AWS / Your VPS

1. SSH into server
2. Clone repo
3. Install Node.js
4. Create `.env` file with your keys
5. Install PM2:
```bash
npm install -g pm2
```

6. Start app:
```bash
pm2 start server.js --name cheatcodez
pm2 save
pm2 startup
```

7. Set up nginx reverse proxy (optional but recommended)

## Configuration

### Pricing

Default: $4.99 for unlimited access

To change pricing, update:
1. `public/index.html` - Payment button text
2. Your Ko-fi/PayPal links to reflect new price

### Free Tier Limits

Default: 3 free cheat codes

To change, edit `server.js`:
```javascript
if (!usage.isPaid && usage.count >= 3) { // Change 3 to your desired limit
```

### AI Model

**Using OpenAI (default):**
- Model: `gpt-4o-mini` (fast and cheap)
- Cost: ~$0.01 per 100 cheat codes

**Using Anthropic:**
- Model: `claude-3-5-sonnet-20241022`
- Cost: ~$0.02 per 100 cheat codes

**No API Key (Fallback):**
- Uses rule-based optimization
- Free but less intelligent
- Good for testing

## Managing Payments

### Ko-fi Setup

1. Create account at [ko-fi.com](https://ko-fi.com)
2. Set up a "Digital Product" for $4.99
3. In the product description, say: "You will receive a verification code via email"
4. When someone pays, Ko-fi sends you an email
5. Send them a unique code from your `.env` file

### PayPal Setup

1. Create a PayPal.me link or use PayPal payment buttons
2. Price it at $4.99
3. When someone pays, send them a verification code manually

### Automation (Advanced)

You can automate code delivery using:
- Ko-fi webhooks
- PayPal IPN (Instant Payment Notification)
- Stripe (if you want to switch from Ko-fi/PayPal)

## Customization

### Change Video Background

Replace the video URL in `public/index.html`:
```html
<source src="YOUR_VIDEO_URL.mp4" type="video/mp4">
```

Free video sources:
- [Mixkit](https://mixkit.co/free-stock-video/)
- [Pexels](https://www.pexels.com/videos/)
- [Coverr](https://coverr.co/)

### Change Colors

Edit `public/style.css`:
```css
/* Primary color (currently green #00ff41) */
--primary-color: #00ff41;

/* Accent color (currently cyan #00ffff) */
--accent-color: #00ffff;
```

### Change Prompt Optimizer Logic

Edit the system prompt in `server.js` (around line 100):
```javascript
content: `You are the Cheat Code Generator...`
```

## FAQ

### How much does it cost to run?

**Free tier:**
- Hosting: Free (Vercel, Railway free tier)
- API costs: ~$0.01 per 100 cheat codes (OpenAI)

**Paid users:**
- If you charge $4.99 and use OpenAI API, each user can generate 40,000+ cheat codes before you break even
- In practice, most users will generate 10-100 total, so profit margin is very high

### What if I don't have an API key?

The app works without an API key using fallback optimization (rule-based). It's not as good but it works for testing.

### How do I track revenue?

Keep a spreadsheet:
- Date
- Payment email
- Amount
- Code sent
- Code activated (check `usage.json`)

### Can I sell on other platforms?

Yes! You can sell on:
- Gumroad
- Etsy (digital download)
- Your own Stripe checkout
- Any platform that lets you deliver codes

## Security Notes

- Verification codes are stored in `.env` - keep this file secure
- Usage data is stored in `usage.json` - back this up regularly
- Cookies are httpOnly for security
- No passwords or sensitive data stored

## Support

**Issues?** Open an issue on GitHub

**Questions?** Email: your@email.com

## License

MIT - Do whatever you want with this

---

## Quick Checklist Before Launch

- [ ] Add your OpenAI or Anthropic API key to `.env`
- [ ] Update Ko-fi/PayPal links in `public/index.html`
- [ ] Update contact email in `public/index.html`
- [ ] Create verification codes in `.env`
- [ ] Test payment flow end-to-end
- [ ] Deploy to hosting platform
- [ ] Buy domain (cheatcodez.com) and point to your deployment
- [ ] Test live site
- [ ] Start promoting!

---

**Built for hustlers who are tired of LLMs wasting their time.**

Your LLM has been holding out on you. We're just giving you the cheat codes.
