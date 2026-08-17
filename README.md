# 🎓 Next Apply Alert Bot

Scholarships, free courses, aur **AI jobs/internships** ko roz automatically
fetch kar ke WhatsApp group mein bhejta hai — 100% cloud par chalta hai
(PC on hona zaroori nahi).

**WhatsApp Group:** [Next apply](https://chat.whatsapp.com/IHRUWJbSVQDBbSGiAKn6oN)

## 🏗️ Architecture
- **Automation (daily send):** GitHub Actions (free) — roz 8:00 AM PKT
- **WhatsApp connection:** `whatsapp-web.js` + MongoDB (session store)
- **Sent history:** `sent_history.json` file, seedha GitHub repo mein
- **Dashboard:** Streamlit Community Cloud (free) — history + manual trigger
- **Message format:** Har item ka apna alag, professional message

## ⚠️ WhatsApp Channel — Filhaal Disabled
`whatsapp-web.js` library mein abhi Channels ke saath ek **known, unresolved
bug** hai (library maintainers ne khud confirm kiya hai, GitHub par open issue
hai). Jab tak yeh upstream fix nahi hoti, `CHANNEL_ID` ko khaali (`""`) rakhein
— sirf Group use hoga. Jab library fix ho jaye, `npm run list-channels` se
ID nikal kar `config.js` mein daal sakte hain.

## ✨ Features
- ☁️ Cloud-run — PC band ho tab bhi chalta hai
- 🎓 Scholarships & free courses (fullyscholarships.com)
- 💼 AI/ML remote jobs (RemoteOK)
- 📰 AI internships & extra updates (Google News, clean resolved links)
- 📱 WhatsApp Group mein direct
- 📊 Streamlit dashboard — history, stats, manual trigger
- ⏰ Roz automatically **3 baar**: 8:00 AM, 12:45 PM, aur 9:00 PM (Pakistan Time)
- 🌐 4 alag sources: fullyscholarships.com, OpportunityDesk, OpportunitiesCircle,
  RemoteOK, WeWorkRemotely (AI-filtered), Google News
- 🚫 Duplicate-free
- 🆓 Bilkul free

---

## 🔒 Security Note
- `.env` file **kabhi bhi** GitHub par push nahi hoti (`.gitignore` mein hai)
- MongoDB connection string sirf **GitHub Secrets** mein rehni chahiye
  (Settings → Secrets → Actions), code mein kahin bhi hardcode nahi honi chahiye
- Agar kabhi galti se password kahin public share ho jaye, MongoDB Atlas →
  Database Access → password turant reset kar dein

---

## 📦 COMPLETE SETUP (Shuru se Aakhir tak)

### Step 1: MongoDB Atlas
1. [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register) — free account
2. Free "M0" cluster banayein
3. Database Access → user banayein, password note kar lein
4. Network Access → "Allow access from anywhere" (0.0.0.0/0) — **zaroori hai**,
   warna GitHub Actions connect nahi kar payega
5. Connect → Drivers → Node.js → connection string copy karein, database
   naam add karein:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/next-apply-bot?retryWrites=true&w=majority&appName=Cluster0
   ```

### Step 2: Local Setup
```bash
npm install
```
`.env.example` ko `.env` naam se copy karein, `MONGODB_URI` daal dein.

### Step 3: WhatsApp QR Scan (SIRF EK DAFA)
```bash
npm run setup
```
QR scan karein. **Script khud "SUCCESS!" print hone tak wait karegi** —
isay beech mein band na karein, khud band ho jayegi jab session pakki
tarah save ho jaye.

### Step 4: Group ID Nikalein
```bash
npm run list-groups
```
Jab kahe, apne phone se "Next apply" group mein bilkul yeh message bhejein:
```
FINDGROUPID
```
Milne wali ID `config.js` mein `GROUP_ID` mein daal dein.

### Step 5: Test Run (Local)
```bash
node index.js
```
Dekhein message group mein sahi pahunchta hai.

### Step 6: GitHub Repo Connect Karein
Agar pehli baar push kar rahe hain, ya repo dobara connect karni hai:
```bash
cd next-apply-alert-bot
git init
git add -A
git commit -m "Next Apply Alert Bot setup"
git branch -M main
git remote remove origin 2>/dev/null
git remote add origin https://github.com/Farhanillahiclass/next-apply-alert-bot.git
git push -u origin main
```
(Agar remote already sahi connected hai, sirf yeh kaafi hai:)
```bash
git add -A
git commit -m "Update bot"
git push
```

### Step 7: GitHub Secrets Set Karein
Repo → Settings → Secrets and variables → Actions → New repository secret:
- `MONGODB_URI` = apna connection string
- `GROUP_ID` = apna group ID (jo Step 4 mein mili)
- `CHANNEL_ID` = khaali chhod dein (abhi disabled hai)

**Yeh secrets encrypted hote hain aur kabhi bhi code/logs mein nahi dikhte —
GitHub Actions runtime par hi decrypt hote hain.**

### Step 8: Manually Test Karein (3 dafa jitni baar chahein)
Repo → Actions tab → "Daily Next Apply Alert Bot" → "Run workflow" button
se jitni baar chahein manually chala kar test kar sakte hain.

### Step 9: Daily Schedule
Kuch aur karne ki zaroorat nahi — workflow already roz **8:00 AM PKT**
(`.github/workflows/daily-bot.yml` mein cron `0 3 * * *` = 3 AM UTC) khud
chalta rahega, chahe aap manually test karein ya na karein.

### Step 10: Streamlit Dashboard (Optional)
1. [share.streamlit.io](https://share.streamlit.io) — GitHub se login
2. New app → apna repo → Main file: `dashboard/streamlit_app.py`
3. Secrets mein:
   ```toml
   GITHUB_REPO = "Farhanillahiclass/next-apply-alert-bot"
   GITHUB_TOKEN = "apna_personal_access_token"
   ```
4. Deploy

---

## 🛠️ Troubleshooting
- **Local debugging ke liye browser dekhna ho:** `.env` mein
  `PUPPETEER_HEADLESS=false` add karein (sirf local ke liye kaam karta hai;
  GitHub Actions mein hamesha automatically headless=true rehta hai, chahe
  yeh setting kuch bhi ho)
- **QR baar-baar maang raha ho:** `npm run setup` chalayein aur poora
  "SUCCESS!" hone tak chalne dein
- **Windows "ENOENT"/RemoteAuth crash:** `npm install` khud-ba-khud is bug
  ko library ke andar hi patch kar deti hai (`patch-remoteauth.js`,
  `postinstall` hook se automatic). Isके bawajood agar kabhi ho, script
  khud process-level par bhi retry kar leti hai (`resilient-run.js`)
- **fullyscholarships.com "403" error:** Fix ho chuka hai (User-Agent header)
- **Group/Channel message fail ho:** `whatsapp-web.js` ka current known bug
  ho sakta hai
- **Message "sent" dikhe par phone par na aaye:** Phone -> WhatsApp ->
  Linked Devices check karein - agar session "last active" dikhe (na ke
  "Active"), session stale hai. Purana session logout karke `.wwebjs_auth`
  delete kar ke `npm run setup` dobara chalayein

## 👤 Author
**Muhammad Farhan**
[LinkedIn](https://www.linkedin.com/in/muhammadfarhanmrs/)

## 📄 License
MIT
