import fs from "fs";
import path from "path";

interface LogEntry {
  environment?: string;
  ip?: string;
  method?: string;
  url?: string;
  headers?: any;
  body?: any;
  response?: any;
  error?: any;
}

const logsDir = path.resolve("./logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

export async function logRequest(entry: LogEntry) {
  try {
    const now = new Date();
    const fileName = path.join(logsDir, `${now.toISOString().slice(0, 10)}.log`);
    const fullEntry = {
      timestamp: now.toISOString(),
      ...entry,
    };
    fs.appendFileSync(fileName, JSON.stringify(fullEntry, null, 2) + "\n", "utf-8");
  } catch (err) {
    console.error("❌ Falha ao salvar log:", err);
  }
}
