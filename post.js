// LinkedIn Draft Bot  |  Generates post and sends to you on Telegram

// CONFIG
const CONFIG = {
  niche: process.env.NICHE || "Frontend Development",
  tone: process.env.TONE || "thought leader sharing an opinion",
  format: process.env.FORMAT || "hook + insight with a CTA",
  topicHint: process.env.TOPIC_HINT || "",
  useImage: process.env.USE_IMAGE !== "false",
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Generate post with Claude
async function generatePost() {
  console.log("Generating post with Claude...");

  const prompt = `You are an expert LinkedIn content strategist for tech.

STEP 1: Use web_search to find ONE specific trending topic in ${CONFIG.niche} right now.
Search Hacker News, GitHub trending, dev.to, and recent tech blogs.

STEP 2: Write a LinkedIn post about that topic.

Requirements:
- Niche: ${CONFIG.niche}
- Tone: ${CONFIG.tone}
- Format: ${CONFIG.format}
${CONFIG.topicHint ? `- Topic hint: ${CONFIG.topicHint}` : ""}
- First person, sounds like a real developer
- Specific — real tech names, real version numbers
- 3–5 relevant hashtags at the end
- No filler phrases like "In today's fast-paced world"
- Under 1200 characters

STEP 3: Suggest a short Pexels image search query (3–5 words) for a relevant professional photo.

Respond ONLY with valid JSON (no markdown):
{
  "trend": "one sentence describing the trending topic",
  "post": "full linkedin post text",
  "imageQuery": "pexels search query"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const textBlock = data.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("No text block in Claude response");

  const parsed = JSON.parse(textBlock.text.replace(/```json|```/g, "").trim());
  console.log(`Trend   : ${parsed.trend}`);
  console.log(`Image Q : ${parsed.imageQuery}`);
  console.log(`\nPost:\n${parsed.post}\n`);
  return parsed;
}

// Fetch a Pexels photo URL
async function fetchPexelsImageUrl(query) {
  if (!PEXELS_API_KEY) {
    console.log("No PEXELS_API_KEY — skipping image");
    return null;
  }

  console.log(`🔍 Searching Pexels for: "${query}"`);

  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
    { headers: { Authorization: PEXELS_API_KEY } },
  );

  if (!res.ok) throw new Error(`Pexels API ${res.status}: ${await res.text()}`);

  const data = await res.json();
  if (!data.photos?.length) {
    console.log("No Pexels results");
    return null;
  }

  const photo = data.photos[Math.floor(Math.random() * data.photos.length)];
  console.log(`Photo: ${photo.url}`);
  return photo.src.large2x || photo.src.large;
}

// Send photo + caption to Telegram
async function sendTelegramPhoto(imageUrl, caption) {
  console.log("Sending photo message to Telegram...");

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        photo: imageUrl,
        caption: caption,
        parse_mode: "HTML",
      }),
    },
  );

  if (!res.ok)
    throw new Error(`Telegram sendPhoto ${res.status}: ${await res.text()}`);
  console.log("Photo message sent");
}

// Send text-only message to Telegram
async function sendTelegramMessage(text) {
  console.log("Sending text message to Telegram...");

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: "HTML",
      }),
    },
  );

  if (!res.ok)
    throw new Error(`Telegram sendMessage ${res.status}: ${await res.text()}`);
  console.log("Text message sent");
}

async function main() {
  if (!ANTHROPIC_API_KEY) throw new Error("Missing secret: ANTHROPIC_API_KEY");
  if (!TELEGRAM_BOT_TOKEN)
    throw new Error("Missing secret: TELEGRAM_BOT_TOKEN");
  if (!TELEGRAM_CHAT_ID) throw new Error("Missing secret: TELEGRAM_CHAT_ID");

  // 1. Generate the post
  const { post, imageQuery, trend } = await generatePost();

  // 2. Build the Telegram message
  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const header = `<b>Your LinkedIn draft: ${date}</b>\n<i>Trend: ${trend}</i>\n\n`;
  const footer = `\n\n<i>Copy the post above and paste it into LinkedIn. Happy posting!</i>`;
  const caption = header + post + footer;

  // Telegram captions are capped at 1024 chars; fall back to two messages if needed
  const captionTooLong = caption.length > 1024;

  // Send to Telegram
  if (CONFIG.useImage && PEXELS_API_KEY) {
    try {
      const imageUrl = await fetchPexelsImageUrl(imageQuery);
      if (imageUrl) {
        if (captionTooLong) {
          // Send image first, then post text separately
          await sendTelegramPhoto(imageUrl, header.trim());
          await sendTelegramMessage(post + footer);
        } else {
          await sendTelegramPhoto(imageUrl, caption);
        }
        // Also send the image URL so they can attach it to the LinkedIn post manually
        await sendTelegramMessage(
          `<b>Image to attach on LinkedIn:</b>\n${imageUrl}`,
        );
        console.log("Done — image URL also sent separately for easy copying");
      } else {
        await sendTelegramMessage(header + post + footer);
      }
    } catch (err) {
      console.warn(`Image step failed (${err.message}) — sending text only`);
      await sendTelegramMessage(header + post + footer);
    }
  } else {
    await sendTelegramMessage(header + post + footer);
  }

  console.log(`\n Draft sent to Telegram at ${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error(" Fatal error:", err.message);
  process.exit(1);
});
