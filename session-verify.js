const { MongoStore } = require("wwebjs-mongo");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * MongoDB mein DIRECTLY query kar ke confirm karta hai ke session save hui.
 * Event ka bharosa nahi karta (events kabhi miss ho jaate hain).
 * Returns true/false - kabhi jhooti success nahi bolta.
 */
async function verifySessionSaved(mongoose, maxWaitMs = 90000, checkIntervalMs = 10000) {
  const store = new MongoStore({ mongoose });
  const attempts = Math.ceil(maxWaitMs / checkIntervalMs);
  let confirmed = false;

  for (let i = 0; i < attempts && !confirmed; i++) {
    await sleep(checkIntervalMs);
    try {
      confirmed = await store.sessionExists({ session: "RemoteAuth" });
    } catch (err) {
      console.log(`   ⚠️ DB check error (ignoring): ${err.message}`);
    }
    console.log(`   ⏳ (${(i + 1) * (checkIntervalMs / 1000)}s) Session ${confirmed ? "MIL GAYI ✅" : "abhi nahi mili..."}`);
  }

  return confirmed;
}

module.exports = { verifySessionSaved };
