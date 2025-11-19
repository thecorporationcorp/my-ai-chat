# 🚀 CheatCodez - Quick Start (5 Minutes)

## Get Running Locally RIGHT NOW

### 1. Install Dependencies (1 min)
```bash
npm install
```

### 2. Create Environment File (1 min)
```bash
cp .env.example .env
```

Then edit `.env` and add your API key:

**Option A - Using OpenAI (Recommended):**
```env
OPENAI_API_KEY=sk-proj-your-key-here
```
[Get API key](https://platform.openai.com/api-keys) - Costs ~$0.01 per 100 uses

**Option B - Using Anthropic:**
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```
[Get API key](https://console.anthropic.com/) - Costs ~$0.02 per 100 uses

**Option C - No API Key (Testing Only):**
```env
# Leave both blank - uses fallback (less smart but works)
```

**Add verification codes:**
```env
VALID_CODES=UNLOCK2024,CHEAT9999,GODMODE
```
These are the codes you'll give to paying customers.

### 3. Update Payment Links (2 min)

Open `public/index.html` and replace:

**Line 53:** Replace `YOUR_KOFI_LINK`
- Go to [ko-fi.com](https://ko-fi.com)
- Create account
- Create a product for $4.99
- Copy the link

**Line 56:** Replace `YOUR_PAYPAL_LINK`
- Go to [paypal.me](https://paypal.me)
- Create your link
- Use format: `https://paypal.me/yourusername/4.99`

**Line 63:** Replace `your@email.com` with your actual email

### 4. Run It (1 min)
```bash
npm start
```

Open browser: `http://localhost:3000`

**Test it:**
1. Paste any prompt
2. Click "GET CHEAT CODE"
3. See the optimized version

You get 3 free tries. After that, you'll see the paywall.

---

## Deploy to Internet (10 Minutes)

### Option 1: Vercel (Easiest)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Follow prompts, then:
1. Go to Vercel dashboard
2. Add environment variables:
   - `OPENAI_API_KEY` (your key)
   - `VALID_CODES` (your codes)
3. Redeploy

**Done!** Your site is live.

### Option 2: Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. "New Project" → "Deploy from GitHub"
4. Select your repo
5. Add environment variables
6. Deploy

### Option 3: Heroku

```bash
heroku create cheatcodez
heroku config:set OPENAI_API_KEY=your-key
heroku config:set VALID_CODES=CODE1,CODE2
git push heroku main
```

---

## When Someone Pays You

1. **Check Ko-fi/PayPal email** - See who paid
2. **Pick a verification code** from your `.env` file
3. **Email them the code:**

```
Subject: Your CheatCodez Unlimited Access Code

Thanks for your payment!

Your verification code: UNLOCK2024

To activate:
1. Go to cheatcodez.com
2. Try to use more than 3 cheat codes (you'll see the paywall)
3. Enter your code: UNLOCK2024
4. Click "Activate Unlimited"

You now have unlimited cheat codes forever!

Questions? Reply to this email.

- Your Name
```

4. **Keep track** - Make a spreadsheet:
   - Email
   - Date
   - Code sent
   - Amount paid

---

## Testing the Payment Flow

**Test locally:**

1. Use all 3 free cheat codes
2. You'll see the paywall
3. Enter one of your codes from `.env` (e.g., `UNLOCK2024`)
4. Click "Activate Unlimited"
5. You should see "UNLIMITED CHEAT CODES ACTIVATED"

**Now test it works:**
6. Try generating more cheat codes
7. Should work unlimited times now

---

## Customization

### Change Price

1. Update Ko-fi/PayPal links to new price
2. Update text in `public/index.html` (lines 53-56)

### Change Free Tier

Edit `server.js`, line ~78:
```javascript
if (!usage.isPaid && usage.count >= 3) { // Change 3 to whatever
```

### Change Video Background

Replace video URL in `public/index.html`, line ~18:
```html
<source src="https://your-video-url.mp4" type="video/mp4">
```

Free videos:
- [Mixkit.co](https://mixkit.co/free-stock-video/)
- [Pexels.com](https://www.pexels.com/videos/)

---

## Common Issues

**"Error optimizing prompt"**
- Check your API key is correct in `.env`
- Check you have credits in your OpenAI/Anthropic account

**Paywall shows but I haven't used 3**
- Clear cookies and try again
- Or check `usage.json` and delete your entry

**Verification code doesn't work**
- Check it exactly matches one in `.env`
- Codes are case-sensitive
- Make sure there are no spaces

**Can't copy cheat code**
- Try the manual select (it auto-selects)
- Or just manually select and Ctrl+C

---

## Next Steps

1. **Buy cheatcodez.com** - Point it to your deployment
2. **Promote on:**
   - Reddit (r/ChatGPT, r/ClaudeAI, r/SideProject)
   - Twitter/X
   - Product Hunt
   - Your network
3. **Make money** - Every $4.99 is almost pure profit

---

## Need Help?

1. Check `README.md` for detailed docs
2. Check the code comments
3. Google the error message
4. Or ask ChatGPT/Claude... using a cheat code 😉

---

**Your app is ready. Go make money.**
