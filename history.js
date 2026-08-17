const fs = require("fs");
const path = require("path");

const HISTORY_FILE = path.join(__dirname, "sent_history.json");

function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getSentLinks(history) {
  return new Set(history.map((h) => h.link));
}

function appendHistory(history, newItems) {
  const now = new Date().toISOString();
  const updated = [
    ...history,
    ...newItems.map((item) => ({ ...item, sentAt: now })),
  ];
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(updated, null, 2));
  return updated;
}

module.exports = { loadHistory, getSentLinks, appendHistory };
