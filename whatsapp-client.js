const { Client, RemoteAuth } = require("whatsapp-web.js");
const { MongoStore } = require("wwebjs-mongo");
const mongoose = require("mongoose");

function isHeadless() {
  // GitHub Actions (ya kisi bhi CI) mein hamesha headless=true hona ZAROORI hai
  // (cloud server ke paas screen/display hoti hi nahi, headless:false crash karegi)
  if (process.env.CI || process.env.GITHUB_ACTIONS) return true;

  // Local PC par debugging ke liye .env mein PUPPETEER_HEADLESS=false set kar sakte hain
  if (process.env.PUPPETEER_HEADLESS === "false") return false;

  return true; // default hamesha true - zyada stable/fast
}

// NOTE: mongoose.connect() index.js/local-setup.js/get-groups.js mein
// pehle hi call ho chuka hota hai isay call karne se pehle.
function createClient() {
  const store = new MongoStore({ mongoose });

  const client = new Client({
    authStrategy: new RemoteAuth({
      store: store,
      backupSyncIntervalMs: 60000, // 1 minute - GitHub Actions ke short runs ke liye kam rakha
    }),
    puppeteer: {
      headless: isHeadless(),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    },
  });

  return client;
}

module.exports = { createClient };
