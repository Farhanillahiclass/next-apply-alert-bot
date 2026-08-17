// ============================================================
// SIRF EK DAFA CHALANI HAI (apne PC par)
// Ab yeh MongoDB mein DIRECTLY query kar ke confirm karti hai ke
// session sach mein save hui - jhooti "SUCCESS" nahi bolti.
// ============================================================
const mongoose = require("mongoose");
const qrcode = require("qrcode-terminal");
const config = require("./config");
const { createClient } = require("./whatsapp-client");
const { runResilient } = require("./resilient-run");
const { verifySessionSaved } = require("./session-verify");

async function main() {
  if (!config.MONGODB_URI) {
    console.error("❌ MONGODB_URI set nahi hai! .env file mein daalein.");
    process.exit(1);
  }

  if (mongoose.connection.readyState === 0) {
    console.log("🔄 MongoDB se connect ho raha hoon...");
    await mongoose.connect(config.MONGODB_URI);
  }
  console.log(`✅ MongoDB connected (database: "${mongoose.connection.db.databaseName}")`);
  console.log("WhatsApp client ban raha hai...");

  const client = createClient();

  return new Promise((resolve, reject) => {
    client.on("qr", (qr) => {
      console.log("\n📱 Apne phone se WhatsApp kholein -> Linked Devices -> Link a Device");
      console.log("   aur neeche diya QR code scan karein:\n");
      qrcode.generate(qr, { small: true });
    });

    client.on("ready", async () => {
      console.log("\n✅ WhatsApp connected hai! Session MongoDB mein save hone ka intezar kar raha hoon (max 3 min)...\n");

      const confirmed = await verifySessionSaved(mongoose, 180000, 10000);
      await client.destroy().catch(() => {});

      if (!confirmed) {
        reject(new Error("RemoteAuth session MongoDB mein directly verify nahi ho payi. Retry karta hoon."));
        return;
      }

      console.log("\n✅✅ CONFIRMED! Session MongoDB mein WAKAI save ho chuki hai (directly DB query se check kiya).");
      console.log("   👉 Turant apne phone -> WhatsApp -> Linked Devices check karein - 'Active' dikhna chahiye.");
      console.log("   Agla step: 'npm run list-groups' chala kar apna Group ID nikalein.\n");
      resolve();
    });

    client.on("auth_failure", (msg) => {
      reject(new Error(`Auth fail: ${msg}`));
    });

    client.initialize().catch(reject);
  });
}

(async () => {
  await runResilient(main, { rootDir: __dirname, maxAttempts: 6 });
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
})();
