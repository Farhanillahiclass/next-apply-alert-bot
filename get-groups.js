// ============================================================
// Apne "Next apply" GROUP mein exact yeh message bhejein:
//     FINDGROUPID
// ============================================================
const mongoose = require("mongoose");
const config = require("./config");
const { createClient } = require("./whatsapp-client");
const { runResilient } = require("./resilient-run");
const { verifySessionSaved } = require("./session-verify");

const MARKER = "FINDGROUPID";

async function main() {
  if (mongoose.connection.readyState === 0) {
    console.log("🔄 MongoDB se connect ho raha hoon...");
    await mongoose.connect(config.MONGODB_URI);
  }
  console.log("✅ Connected. Session restore ho raha hai...");
  const client = createClient();

  return new Promise((resolve, reject) => {
    client.on("loading_screen", (percent, message) => {
      console.log(`⏳ Loading: ${percent}% - ${message}`);
    });

    client.on("ready", () => {
      console.log("\n✅ WhatsApp ready hai!");
      console.log(`👉 Ab apne WhatsApp mobile app se 'Next apply' GROUP mein bilkul yeh message bhejein:`);
      console.log(`\n   ${MARKER}\n`);
      console.log("⏳ Us message ka wait kar raha hoon...\n");
    });

    client.on("message_create", async (msg) => {
      if (msg.body.trim() === MARKER && msg.from.endsWith("@g.us")) {
        console.log("📌 GROUP milla!");
        console.log(`   ID: ${msg.from}`);
        console.log("\n👉 Yeh ID copy karke config.js mein GROUP_ID mein daal dein.\n");
        console.log("⏳ Session save hone ka directly verify kar raha hoon (max 90 sec)...");

        await verifySessionSaved(mongoose, 90000, 10000);
        await client.destroy().catch(() => {});
        resolve();
      }
    });

    client.on("auth_failure", (msg) => reject(new Error(`Auth fail: ${msg}`)));
    client.initialize().catch(reject);
  });
}

(async () => {
  await runResilient(main, { rootDir: __dirname, maxAttempts: 6 });
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
})();
