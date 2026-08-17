require("dotenv").config();

module.exports = {
  // MongoDB - WhatsApp session (unavoidable requirement) + sent-history dono
  // isi mein store hote hain, taake Streamlit dashboard bhi wahi data dekh sake
  MONGODB_URI: process.env.MONGODB_URI,

  // WhatsApp group ID. "npm run list-groups" chala kar nikalein.
  // Aapke group ka naam "Next apply" hai - us naam ke saamne wali ID copy karein
  GROUP_ID: process.env.GROUP_ID || "PASTE_YOUR_GROUP_ID_HERE@g.us",

  // WhatsApp Channel ID (OPTIONAL). Agar aap ek channel bhi rakhte hain,
  // to "npm run list-channels" chala kar ID nikal kar yahan daal dein.
  // Aap channel ke admin/owner hone chahiye. Khaali chhod dein agar
  // channel nahi chahiye.
  // ⚠️ NOTE: whatsapp-web.js library mein abhi Channels ke saath ek
  // known bug hai (getChat crash) jo library maintainers ne abhi fix
  // nahi kiya. Jab tak yeh fix na ho, CHANNEL_ID khaali rakhna behtar hai.
  CHANNEL_ID: process.env.CHANNEL_ID || "",

  MAX_ITEMS_PER_DAY: 8,

  RSS_SOURCES: [
    "https://fullyscholarships.com/feed/",
    "https://opportunitydesk.org/feed/",
    "https://www.opportunitiescircle.com/feed/",
  ],

  // We Work Remotely - programming jobs (filter hoga AI/ML keywords se)
  WWR_RSS: "https://weworkremotely.com/categories/remote-programming-jobs.rss",

  GOOGLE_NEWS_QUERIES: [
    "AI internship apply 2026",
    "AI jobs hiring remote",
    "free AI course certificate",
    "fully funded scholarship deadline",
    "machine learning internship 2026",
    "AI research fellowship",
  ],

  REMOTEOK_API: "https://remoteok.com/api",
  REMOTEOK_TAGS: ["ai", "machine-learning", "artificial-intelligence", "data-science"],
};
