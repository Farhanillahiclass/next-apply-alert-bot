const Parser = require("rss-parser");
const fetch = require("node-fetch");
const config = require("./config");

const parser = new Parser({
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
});

// Google News RSS links bahut lambe redirect URLs hote hain (WhatsApp mein
// messy dikhte hain). Yeh function asal article ka clean URL nikal ke deta hai.
async function resolveFinalUrl(url) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow", timeout: 8000 });
    return res.url || url;
  } catch {
    return url; // fail ho to original hi wapis kar dena
  }
}

function formatDetails(raw) {
  if (!raw) return "Details ke liye link dekhein.";
  let text = raw;

  // List items ko bullet points mein convert karna (strip se pehle)
  text = text.replace(/<li[^>]*>/gi, "• ");
  text = text.replace(/<\/li>/gi, "\n");
  // Paragraphs/breaks ko newlines mein convert karna
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  // Baaki saare HTML tags hatana
  text = text.replace(/<[^>]*>/g, "");
  // WordPress boilerplate hatana
  text = text.replace(/The post[\s\S]*?appeared first on[\s\S]*/i, "");
  // HTML entities decode karna (common ones)
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"');
  // Extra blank lines/spaces clean karna
  text = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");

  if (text.length > 500) {
    text = text.slice(0, 500).split(" ").slice(0, -1).join(" ") + "...";
  }
  return text || "Details ke liye link dekhein.";
}

async function fetchRssSources() {
  const items = [];
  for (const url of config.RSS_SOURCES) {
    try {
      const feed = await parser.parseURL(url);
      for (const entry of feed.items) {
        items.push({
          category: "🎓 Scholarship/Course",
          title: entry.title,
          link: entry.link,
          date: entry.pubDate ? new Date(entry.pubDate).toDateString() : "Recent",
          details: formatDetails(entry["content:encoded"] || entry.content || entry.contentSnippet || ""),
        });
      }
    } catch (err) {
      console.error(`⚠️ RSS fetch failed for ${url}:`, err.message);
    }
  }
  return items;
}

async function fetchGoogleNews() {
  const items = [];
  for (const query of config.GOOGLE_NEWS_QUERIES) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const feed = await parser.parseURL(url);
      for (const entry of feed.items.slice(0, 5)) {
        const cleanLink = await resolveFinalUrl(entry.link);
        items.push({
          category: "📰 News",
          title: entry.title,
          link: cleanLink,
          date: entry.pubDate ? new Date(entry.pubDate).toDateString() : "Recent",
          details: formatDetails(entry.contentSnippet || entry.content || ""),
        });
      }
    } catch (err) {
      console.error(`⚠️ Google News fetch failed for "${query}":`, err.message);
    }
  }
  return items;
}

async function fetchRemoteOKJobs() {
  const items = [];
  try {
    const res = await fetch(config.REMOTEOK_API, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const jobs = await res.json();

    for (const job of jobs) {
      if (!job.position || !job.tags) continue;
      const tags = job.tags.map((t) => t.toLowerCase());
      const isAiRelated = config.REMOTEOK_TAGS.some((tag) => tags.includes(tag));
      if (!isAiRelated) continue;

      const formattedDesc = formatDetails(job.description || "");
      items.push({
        category: "💼 AI Job",
        title: `${job.position} @ ${job.company}`,
        link: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
        date: job.date ? new Date(job.date).toDateString() : "Recent",
        details: formattedDesc !== "Details ke liye link dekhein." ? formattedDesc : `Location: ${job.location || "Remote"}`,
      });
    }
  } catch (err) {
    console.error("⚠️ RemoteOK fetch failed:", err.message);
  }
  return items.slice(0, 10);
}

async function fetchWeWorkRemotely() {
  const items = [];
  const aiKeywords = ["ai", "machine learning", "ml", "artificial intelligence", "data scien", "deep learning", "nlp", "llm"];
  try {
    const feed = await parser.parseURL(config.WWR_RSS);
    for (const entry of feed.items) {
      const titleLower = (entry.title || "").toLowerCase();
      const isAiRelated = aiKeywords.some((kw) => titleLower.includes(kw));
      if (!isAiRelated) continue;

      items.push({
        category: "💼 AI Job",
        title: entry.title,
        link: entry.link,
        date: entry.pubDate ? new Date(entry.pubDate).toDateString() : "Recent",
        details: formatDetails(entry.contentSnippet || entry.content || ""),
      });
    }
  } catch (err) {
    console.error("⚠️ WeWorkRemotely fetch failed:", err.message);
  }
  return items;
}

async function fetchAllSources() {
  const [rss, news, jobs, wwr] = await Promise.all([
    fetchRssSources(),
    fetchGoogleNews(),
    fetchRemoteOKJobs(),
    fetchWeWorkRemotely(),
  ]);

  const all = [...rss, ...jobs, ...wwr, ...news];
  const seen = new Set();
  const unique = [];
  for (const item of all) {
    if (!seen.has(item.link)) {
      seen.add(item.link);
      unique.push(item);
    }
  }
  return unique;
}

module.exports = { fetchAllSources };
