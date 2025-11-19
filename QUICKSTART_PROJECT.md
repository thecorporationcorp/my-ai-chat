# ⚡ OpenAI Project - 5-Minute Setup

**Status:** Everything is ready. Just plug in your Project ID.

---

## 🎯 What You Need

1. OpenAI API Key (you probably have this)
2. OpenAI Project ID (create one in 2 minutes)

---

## 🚀 Setup Steps

### Step 1: Create Project (2 minutes)

1. Go to: https://platform.openai.com/projects
2. Click **"New Project"**
3. Name: `CheatCodez`
4. Click **"Create"**
5. **COPY THE PROJECT ID** (looks like `proj_abc123xyz789`)

---

### Step 2: Upload System Prompt (1 minute)

1. In your project, click **"Files"**
2. Click **"Upload File"**
3. Upload the `system.md` file from this repo
4. Done!

**Or manually:**
1. Click **"New File"**
2. Name: `system.md`
3. Paste contents from `system.md` in this repo
4. Save

---

### Step 3: Configure Environment (30 seconds)

Edit `.env`:

```bash
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_PROJECT_ID=proj_your-project-id-here  # ← ADD THIS LINE
```

**CRITICAL:** Replace `proj_your-project-id-here` with your actual Project ID from Step 1.

---

### Step 4: Test (30 seconds)

```bash
npm start
```

Look for this in the console:

```
✓ Project ID: proj_abc123xyz789 (configured)
```

Test it:

```bash
curl -X POST http://localhost:3000/api/generate \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "how do i resize images"}'
```

Should return optimized prompt with cheat codes!

---

## 📄 Files in This Repo

| File | Purpose | Action Required |
|------|---------|-----------------|
| `system.md` | Your GOD_PROMPT template | Upload to OpenAI Project |
| `.env.example` | Environment template | Copy to `.env` and fill in |
| `OPENAI_PROJECT_SETUP.md` | Full documentation | Read if you get stuck |
| `server.js` | Backend (already configured) | No changes needed |

---

## 🔧 If Something Breaks

### "Project not configured"

You forgot Step 3. Add `OPENAI_PROJECT_ID` to your `.env`:

```bash
echo "OPENAI_PROJECT_ID=proj_your-actual-id" >> .env
```

### "Invalid API key"

Get a new key: https://platform.openai.com/api-keys

### "Project not found"

Check your Project ID. Go to https://platform.openai.com/projects and copy it again.

---

## 🎯 What Happens Next

Once configured:

1. **User submits prompt** → Frontend calls `/api/generate`
2. **Server validates** → Rate limiting, usage tracking
3. **Calls OpenAI** → With Project ID header
4. **OpenAI loads** → Your `system.md` from the project
5. **Returns optimized prompt** → With all cheat codes injected

**Key benefit:** Update `system.md` in OpenAI → Changes apply instantly → No code deployment needed

---

## 📊 Quick Comparison

| Feature | /api/optimize (old) | /api/generate (new) |
|---------|---------------------|---------------------|
| System prompt location | In `server.js` code | In OpenAI Project files |
| Update prompt | Redeploy code | Edit file in OpenAI |
| Version control | Git only | OpenAI + Git |
| Setup time | 0 min (works out of box) | 5 min (one-time) |
| Recommended | Testing/development | Production |

**Both endpoints work!** You can use `/api/optimize` to test, then switch to `/api/generate` for production.

---

## 🚀 Production Checklist

- [ ] Project created on OpenAI
- [ ] `system.md` uploaded to project
- [ ] Project ID in `.env`
- [ ] Tested with curl/Postman
- [ ] Works on localhost
- [ ] Frontend calls `/api/generate`
- [ ] Deployed with env vars set

---

**That's it! 5 minutes and you're production-ready with OpenAI Projects.** 🎮✨

**Questions?** Read `OPENAI_PROJECT_SETUP.md` for the full guide.
