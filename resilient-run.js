// ============================================================
// whatsapp-web.js ki RemoteAuth mein ek known Windows timing bug hai:
// session backup ke waqt kabhi kabhi ek file "gayab" ho jati hai
// (Chrome abhi bhi likh raha hota hai) - Node.js 24 is chhoti si
// error par bhi POORA process crash kar deta hai (unhandled rejection).
//
// Yeh helper us crash ko pakad kar KHUD retry karta hai, taake
// aapko manually dobara command chalani na pade.
// ============================================================
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function killStrayBrowsers(rootDir) {
  if (os.platform() !== "win32") return;
  try {
    // Sirf woh Chrome processes band karta hai jo ISI bot ke .wwebjs_auth
    // folder se launch hue the - user ka apna personal Chrome safe rehta hai
    const psCmd =
      "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*.wwebjs_auth*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: "ignore", timeout: 15000 });
    console.log("🧹 Purani atki hui bot-Chrome process band kar di (aapka apna browser safe hai).");
  } catch {
    // ignore - powershell na ho ya permission na ho to bhi aage badhna hai
  }
}

function cleanAuthFolders(rootDir) {
  killStrayBrowsers(rootDir);
  for (const folder of [".wwebjs_auth", ".wwebjs_cache"]) {
    const p = path.join(rootDir, folder);
    if (fs.existsSync(p)) {
      try {
        fs.rmSync(p, { recursive: true, force: true });
        console.log(`🧹 ${folder} clean kar diya (retry ke liye).`);
      } catch {
        // ignore - Windows kabhi file-lock ki wajah se turant delete nahi hone deta
      }
    }
  }
}

const RETRYABLE_PATTERNS = [
  "ENOENT",
  "RemoteAuth",
  "afterAuthReady",
  "compressSession",
  "copyByRequiredDirs",
  "already running",
  "userDataDir",
  "ChromeLauncher",
  "ETIMEDOUT",
  "ECONNRESET",
  "ENOTFOUND",
  "FetchError",
];

function isRetryableError(err) {
  const text = `${err?.message || ""} ${err?.stack || ""}`;
  return RETRYABLE_PATTERNS.some((p) => text.includes(p));
}

/**
 * mainFn: async function jo poora kaam karta hai (client banana, initialize, waghera)
 * options: { maxAttempts, rootDir }
 */
async function runResilient(mainFn, options = {}) {
  const maxAttempts = options.maxAttempts || 6;
  const rootDir = options.rootDir || __dirname;
  let attempt = 0;
  let finished = false;

  const tryRun = async () => {
    attempt++;
    if (attempt > 1) {
      console.log(`\n🔁 Retry attempt ${attempt}/${maxAttempts}...`);
      cleanAuthFolders(rootDir);
      await sleep(6000); // OS ko purani process poori tarah band karne ka time dena
    }
    try {
      await mainFn();
      finished = true;
    } catch (err) {
      await handleFailure(err);
    }
  };

  const handleFailure = async (err) => {
    if (finished) return; // already succeeded, ignore late errors
    if (isRetryableError(err) && attempt < maxAttempts) {
      console.error(`\n⚠️ Known timing bug pakda gaya: ${err.message}`);
      console.log("🔄 Khud automatically retry kar raha hoon...");
      await tryRun();
    } else {
      console.error("\n❌ Retry limit khatam ho gayi ya koi aur error hai:");
      console.error(err);
      console.error("\nAgar yeh baar baar ho raha hai, WSL (Linux environment) use karna behtar rahega.");
      process.exit(1);
    }
  };

  // Node.js 24 ka default behavior unhandled promise rejections par crash karna hai -
  // yeh handlers is default ko override kar ke apna retry logic chalate hain
  process.on("unhandledRejection", (err) => {
    handleFailure(err instanceof Error ? err : new Error(String(err)));
  });
  process.on("uncaughtException", (err) => {
    handleFailure(err);
  });

  await tryRun();
}

module.exports = { runResilient, cleanAuthFolders, sleep };
