// ============================================================
// Yeh script automatically npm install ke baad chalti hai
// (package.json ke "postinstall" hook se) aur whatsapp-web.js
// library ke andar ek chota sa patch lagati hai:
//
// Windows par RemoteAuth session backup ke waqt kabhi kabhi Chrome
// ek file delete/rewrite kar raha hota hai jab library usay copy
// karne ki koshish karti hai (ENOENT race condition). Yeh patch
// us specific copy operation ko 5 dafa retry karne layak banata
// hai (800ms gap ke saath), taake yeh chhoti si timing glitch
// poori process ko crash na kare.
// ============================================================
const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "node_modules",
  "whatsapp-web.js",
  "src",
  "authStrategies",
  "RemoteAuth.js"
);

if (!fs.existsSync(filePath)) {
  console.log("ℹ️ whatsapp-web.js abhi install nahi hui, patch skip.");
  process.exit(0);
}

let content = fs.readFileSync(filePath, "utf-8");

if (content.includes("PATCHED-BY-NEXT-APPLY-BOT")) {
  console.log("✅ RemoteAuth.js pehle se patched hai.");
  process.exit(0);
}

const oldMethod = `    async copyByRequiredDirs(from, to) {
        for (const d of this.requiredDirs) {
            const src = path.join(from, d);
            if (await this.isValidPath(src)) {
                const dest = path.join(to, path.basename(src));
                await fs.promises.cp(src, dest, {
                    recursive: true,
                    force: true,
                    errorOnExist: false,
                });
            }
        }
    }`;

const newMethod = `    /* PATCHED-BY-NEXT-APPLY-BOT: Windows ENOENT race condition ke liye retry logic */
    async copyByRequiredDirs(from, to) {
        for (const d of this.requiredDirs) {
            const src = path.join(from, d);
            if (await this.isValidPath(src)) {
                const dest = path.join(to, path.basename(src));
                let lastErr = null;
                for (let attempt = 0; attempt < 5; attempt++) {
                    try {
                        await fs.promises.cp(src, dest, {
                            recursive: true,
                            force: true,
                            errorOnExist: false,
                        });
                        lastErr = null;
                        break;
                    } catch (err) {
                        lastErr = err;
                        if (err && err.code === 'ENOENT') {
                            await new Promise((r) => setTimeout(r, 800));
                            continue;
                        }
                        throw err;
                    }
                }
                if (lastErr) throw lastErr;
            }
        }
    }`;

if (!content.includes(oldMethod)) {
  console.log(
    "⚠️ copyByRequiredDirs method exact match nahi mila (library version different ho sakta hai)."
  );
  console.log("   Koi masla nahi - resilient-run.js wrapper phir bhi is bug ko process-level par pakad lega.");
  process.exit(0);
}

content = content.replace(oldMethod, newMethod);
fs.writeFileSync(filePath, content, "utf-8");
console.log("✅ whatsapp-web.js ke andar RemoteAuth.js patch ho gayi.");
console.log("   Ab Windows ka ENOENT race-condition khud internally retry hoga (5 dafa),");
console.log("   poori process crash nahi hogi.");
