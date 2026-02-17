#!/usr/bin/env node
/**
 * Reads bilyar-service-account.json and prints a one-line value for FIREBASE_SERVICE_ACCOUNT_JSON.
 * Run: node scripts/prepare-firebase-env.js
 * Then copy the output and paste it as the value for FIREBASE_SERVICE_ACCOUNT_JSON in Render/Railway/Replit.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, "..", "bilyar-service-account.json");
if (!fs.existsSync(file)) {
  console.error("File not found: bilyar-service-account.json in project root.");
  process.exit(1);
}
const json = fs.readFileSync(file, "utf8");
const oneLine = JSON.stringify(JSON.parse(json));
console.log("\nCopy everything below (one line) and paste as FIREBASE_SERVICE_ACCOUNT_JSON:\n");
console.log(oneLine);
console.log("");
