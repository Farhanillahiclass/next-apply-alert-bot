const mongoose = require("mongoose");
const config = require("./config");
const { createClient } = require("./whatsapp-client");
const { fetchAllSources } = require("./sources");
const { loadHistory, getSentLinks, appendHistory } = require("./history");
const { runResilient, sleep } = require("./resilient-run");
const { verifySessionSaved } = require("./session-verify");

// Har item ka apna alag, professional formatted message
function buildItemMessage(item) {
  const lines = [];
  lines.push(item.category);
  lines.push("");
  lines.push(`*${item.title}*`);
  lines.push("");
  lines.push(item.details);
  lines.push("");
  lines.push(`🔗 *Apply / Read More:*`);
  lines.push(item.link);
  lines.push("");
  lines.push(`📅 ${item.date}`);
  return lines.join("\n");
}

async function main() {
  if (!config.MONGODB_URI) {
    console.error("❌ MONGODB_URI set nahi hai!");
    process.exit(1);
  }

  if (mongoose.connection.readyState === 0) {
    console.log("🔄 MongoDB se connect ho raha hoon...");
    await mongoose.connect(config.MONGODB_URI);
  }

  console.log("🔍 Saare sources se data fetch kar raha hoon...");
  const allItems = await fetchAllSources();
  console.log(`📊 Total ${allItems.length} items mile.`);

  const history = loadHistory();
  const sentLinks = getSentLinks(history);
  const newItems = allItems
    .filter((item) => !sentLinks.has(item.link))
    .slice(0, config.MAX_ITEMS_PER_DAY);

  if (newItems.length === 0) {
    console.log("ℹ️ Koi naya item nahi mila. Aaj message skip.");
    return;
  }

  console.log(`📝 ${newItems.length} naye items mile. WhatsApp se connect ho raha hoon...`);
  const client = createClient();
  let qrRequested = false;

  return new Promise((resolve, reject) => {
    client.on("qr", () => {
      qrRequested = true;
      console.error("❌ Session MongoDB mein nahi mili - QR maanga ja raha hai.");
      console.error("   GitHub Actions par QR scan nahi ho sakta. Apne PC par 'npm run setup' dobara chalayein.");
      client.destroy().catch(() => {});
      reject(new Error("QR requested - session missing/corrupt. Run 'npm run setup' locally."));
    });

    client.on("ready", async () => {
      console.log("✅ WhatsApp connected. Live connection settle hone ka 5 sec wait...");
      await sleep(5000); // fresh connection ko settle hone ka time dena

      console.log("📤 Messages ek-ek kar ke bhej raha hoon...");
      const destinations = [{ id: config.GROUP_ID, label: "Group" }];
      if (config.CHANNEL_ID) {
        destinations.push({ id: config.CHANNEL_ID, label: "Channel" });
      }

      const successfullySent = [];

      for (const item of newItems) {
        const message = buildItemMessage(item);
        let sentAnywhere = false;

        for (const dest of destinations) {
          try {
            await client.sendMessage(dest.id, message);
            console.log(`   ✅ Sent to ${dest.label}: ${item.title}`);
            sentAnywhere = true;
            await sleep(4000);
          } catch (err) {
            console.error(`   ❌ Failed to send to ${dest.label} ("${item.title}"):`, err.message);
          }
        }

        if (sentAnywhere) successfullySent.push(item);
      }

      appendHistory(history, successfullySent);
      console.log(`💾 ${successfullySent.length} items history mein save ho gaye (sent_history.json).`);

      console.log("⏳ Session directly verify kar raha hoon (max 30 sec)...");
      await verifySessionSaved(mongoose, 30000, 10000);

      await client.destroy().catch(() => {});

      if (qrRequested) {
        reject(new Error("Session expired - QR was requested. Run 'npm run setup' locally again."));
      } else {
        resolve();
      }
    });

    client.on("auth_failure", (msg) => reject(new Error(`Auth fail: ${msg}`)));
    client.initialize().catch(reject);
  });
}

(async () => {
  await runResilient(main, { rootDir: __dirname, maxAttempts: 4 });
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
})();
