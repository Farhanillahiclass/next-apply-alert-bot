"""
Next Apply Alert Bot - Dashboard
==================================
Yeh Streamlit app GitHub repo mein se "sent_history.json" file read
karta hai (jo bot khud commit karta hai) aur GitHub Actions workflow
ko manually trigger karne ka button bhi deta hai.
"""

import streamlit as st
import requests
import pandas as pd

st.set_page_config(page_title="Next Apply Alert Bot", page_icon="🎓", layout="wide")

GITHUB_REPO = st.secrets.get("GITHUB_REPO", "")   # format: "username/reponame"
GITHUB_TOKEN = st.secrets.get("GITHUB_TOKEN", "")  # optional, manual trigger ke liye

st.title("🎓 Next Apply Alert Bot — Dashboard")
st.caption("Scholarships, free courses & AI jobs jo aapke WhatsApp group **'Next apply'** mein bheje ja chuke hain")

if not GITHUB_REPO:
    st.error("⚠️ GITHUB_REPO secret set nahi hai (format: username/reponame). Streamlit Settings → Secrets mein daalein.")
    st.stop()

# ---------------------- Fetch history.json from GitHub ----------------------
@st.cache_data(ttl=300)
def load_history(repo):
    url = f"https://raw.githubusercontent.com/{repo}/main/sent_history.json"
    resp = requests.get(url, timeout=15)
    if resp.status_code != 200:
        return None
    return resp.json()


history = load_history(GITHUB_REPO)

if history is None:
    st.warning("⚠️ 'sent_history.json' abhi tak repo mein nahi mili, ya repo private hai. Pehla bot run hone ka intezar karein.")
    history = []

df = pd.DataFrame(history)

# ---------------------- Stats ----------------------
col1, col2, col3 = st.columns(3)
col1.metric("📦 Total Items Sent", len(df))

if not df.empty and "sentAt" in df.columns:
    last_sent = pd.to_datetime(df["sentAt"]).max()
    col2.metric("🕐 Last Sent", last_sent.strftime("%d %b %Y, %I:%M %p"))
else:
    col2.metric("🕐 Last Sent", "Koi data nahi")

if not df.empty and "category" in df.columns:
    top_category = df["category"].mode()[0] if not df["category"].mode().empty else "N/A"
    col3.metric("🏆 Sabse Zyada Category", top_category)
else:
    col3.metric("🏆 Sabse Zyada Category", "N/A")

st.divider()

# ---------------------- Manual Trigger ----------------------
st.subheader("🚀 Bot Manually Chalayein")
st.caption("Roz 8 AM (PKT) automatic chalta hai, lekin abhi test karna ho to yahan se bhi chala sakte hain.")

if GITHUB_TOKEN:
    if st.button("▶️ Bot Abhi Chalayein"):
        url = f"https://api.github.com/repos/{GITHUB_REPO}/actions/workflows/daily-bot.yml/dispatches"
        headers = {
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json",
        }
        resp = requests.post(url, headers=headers, json={"ref": "main"})
        if resp.status_code == 204:
            st.success("✅ Bot trigger ho gaya! GitHub Actions tab mein progress dekhein (1-2 min lagega).")
        else:
            st.error(f"❌ Trigger fail hua: {resp.status_code} - {resp.text}")
else:
    st.info("Manual trigger button ke liye Secrets mein `GITHUB_TOKEN` add karein (README dekhein).")

st.divider()

# ---------------------- History Table ----------------------
st.subheader("📋 Sent History")

if df.empty:
    st.info("Abhi tak koi item send nahi hua.")
else:
    categories = ["Sab"] + sorted(df["category"].dropna().unique().tolist()) if "category" in df.columns else ["Sab"]
    selected_cat = st.selectbox("Category se filter karein:", categories)

    display_df = df.copy()
    if selected_cat != "Sab":
        display_df = display_df[display_df["category"] == selected_cat]

    display_cols = [c for c in ["category", "title", "date", "sentAt", "link"] if c in display_df.columns]
    display_df = display_df[display_cols].rename(columns={
        "category": "Category",
        "title": "Title",
        "date": "Original Date",
        "sentAt": "Sent At",
        "link": "Link",
    })

    if "Sent At" in display_df.columns:
        display_df["Sent At"] = pd.to_datetime(display_df["Sent At"]).dt.strftime("%d %b %Y, %I:%M %p")

    st.dataframe(
        display_df.sort_values("Sent At", ascending=False) if "Sent At" in display_df.columns else display_df,
        use_container_width=True,
        column_config={"Link": st.column_config.LinkColumn("Link")},
        hide_index=True,
    )

st.divider()
st.caption("Built by Muhammad Farhan — [LinkedIn](https://www.linkedin.com/in/muhammadfarhanmrs/)")
