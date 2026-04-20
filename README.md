# LinkedIn Post Generator — Setup Guide

Every Monday, Claude finds a trending topic in your niche, writes a LinkedIn post, finds a matching photo, and sends everything to your Telegram. You review and post it yourself.

---

## Files

```
post.js                               ← the bot script
.github/workflows/weekly-draft.yml   ← the scheduler
README.md                             ← this guide
```

---

## Get your Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. **API Keys** → **Create Key** → copy it

---

## Get a free Pexels API key (for images)

1. Sign up free at [pexels.com/api](https://www.pexels.com/api/)
2. Your key is shown instantly in the dashboard — copy it

Skip this step if you don't want images. The bot will just send text.

---

## Create a Telegram bot and get your Chat ID

### 4a. Create the bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name (e.g. "My LinkedIn Bot") and a username (e.g. `mylinkedinbot`)
4. BotFather will give you a token like `123456789:ABCdef...` — copy it

### Get your personal Chat ID

1. Search for **@userinfobot** in Telegram and send `/start`
2. It replies with your Chat ID — a number like `987654321` — copy it

### Start a conversation with your bot

Go to `https://t.me/YOUR_BOT_USERNAME` and press **Start**.  
(The bot can only message you after you initiate the chat.)

---

## Add secrets to GitHub

**Settings → Secrets and variables → Actions → New repository secret**

| Secret name          | Value                 |
| -------------------- | --------------------- |
| `ANTHROPIC_API_KEY`  | Your Claude API key   |
| `PEXELS_API_KEY`     | Your Pexels API key   |
| `TELEGRAM_BOT_TOKEN` | Token from BotFather  |
| `TELEGRAM_CHAT_ID`   | Your personal Chat ID |

---

## Customise your post style

Edit the `env:` block in `.github/workflows/weekly-draft.yml`:

```yaml
NICHE: "Frontend Development"
TONE: "thought leader sharing an opinion"
FORMAT: "hook + insight with a CTA"
```

**NICHE options:** Frontend Development, Backend Development, DevOps & Cloud, AI & ML Engineering, Mobile Development, Full-Stack

**TONE options:** thought leader sharing an opinion, educator breaking down a concept simply, storyteller sharing a personal dev experience, hot take slightly controversial but fair

**FORMAT options:** hook + insight with a CTA, short punchy post (3–5 lines), numbered list

---

## Test it

1. **Actions** tab → **LinkedIn Draft Bot** → **Run workflow**
2. Watch the logs — a successful run ends with `🎉 Draft sent to Telegram`
3. Check your Telegram — you'll receive:
   - The post draft with a preview photo
   - A separate message with the direct image URL to attach on LinkedIn

---

## What you receive on Telegram

```
📅 Your LinkedIn draft — Monday, 21 April

Trend: React 19's compiler changes how we think about re-renders

[post text here...]

#React #Frontend #WebDev #JavaScript #ReactJS

Copy the post above and paste it into LinkedIn. Happy posting!
```

Plus a second message:

```
🖼 Image to attach on LinkedIn:
https://images.pexels.com/photos/...
```

Open LinkedIn → New post → paste the text → attach the image from the URL → post.

---

## Changing the schedule

Edit the cron line in `weekly-draft.yml`:

```yaml
- cron: "0 9 * * 1" # Monday 9am UTC
- cron: "0 9 * * 1,3,5" # Mon, Wed, Fri
- cron: "0 8 * * 3" # Wednesday 8am UTC
```

Use [crontab.guru](https://crontab.guru) to build any schedule.
