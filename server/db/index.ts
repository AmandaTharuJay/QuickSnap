import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(path.join(dataDir, "app.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS test_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      protocol TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      game_name TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS test_cases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES test_sessions(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      steps TEXT NOT NULL,
      expected_result TEXT NOT NULL,
      actual_result TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS defect_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES test_sessions(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      defect_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      steps_to_reproduce TEXT,
      expected_result TEXT,
      actual_result TEXT,
      protocol TEXT,
      game_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS protocol_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      protocol TEXT NOT NULL,
      log_content TEXT NOT NULL,
      analysis TEXT,
      severity TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fault_repository (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      fault_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      protocol TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      game_name TEXT,
      game_id TEXT,
      root_cause TEXT,
      resolution TEXT,
      search_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      protocol TEXT,
      messages TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const existingUser = db.select().from(schema.users).limit(1).all();
  if (existingUser.length === 0) {
    seedDatabase();
  }
}

function seedDatabase() {
  const userId = db.insert(schema.users).values({
    username: "demo_user",
    email: "demo@aiqaassist.com",
    displayName: "Demo User",
  }).returning().get().id;

  const sessions = [
    { name: "SAS Protocol Compliance Test", protocol: "SAS", status: "active", gameName: "Lucky Dragon Slots", description: "Testing SAS 6.03 protocol compliance for Lucky Dragon Slots game" },
    { name: "QCOM Protocol Validation", protocol: "QCOM", status: "active", gameName: "Golden Fortune", description: "QCOM 1.6.3 protocol validation testing" },
    { name: "ASP Integration Testing", protocol: "ASP", status: "completed", gameName: "Wild Safari", description: "ASP protocol integration testing for Wild Safari game" },
  ];

  const sessionIds: number[] = [];
  for (const s of sessions) {
    const result = db.insert(schema.testSessions).values({ ...s, userId }).returning().get();
    sessionIds.push(result.id);
  }

  const testCasesData = [
    { sessionId: sessionIds[0], title: "Meter Increment Validation", description: "Verify all meters increment correctly during gameplay", steps: "1. Start game\n2. Place bet\n3. Win combination\n4. Verify meter updates", expectedResult: "All meters updated correctly", status: "passed", priority: "high" },
    { sessionId: sessionIds[0], title: "Event Logging Accuracy", description: "Verify event logs contain accurate timestamps", steps: "1. Trigger game event\n2. Check event log\n3. Verify timestamp accuracy", expectedResult: "Event logged correctly with accurate timestamp and transmitted to host", status: "passed", priority: "high" },
    { sessionId: sessionIds[0], title: "Jackpot Reporting", description: "Verify jackpot events are reported correctly via SAS", steps: "1. Trigger jackpot condition\n2. Verify SAS exception code\n3. Check host acknowledgment", expectedResult: "Jackpot reported with correct exception code", status: "failed", priority: "critical" },
    { sessionId: sessionIds[1], title: "QCOM Link Layer Test", description: "Test QCOM link layer communication", steps: "1. Initialize QCOM connection\n2. Send poll message\n3. Verify response", expectedResult: "Valid QCOM response received", status: "passed", priority: "high" },
    { sessionId: sessionIds[1], title: "EGM Configuration Validation", description: "Validate EGM configuration via QCOM", steps: "1. Request EGM config\n2. Verify game settings\n3. Check denomination", expectedResult: "EGM configuration matches expected values", status: "pending", priority: "medium" },
    { sessionId: sessionIds[2], title: "ASP Handshake Protocol", description: "Test ASP handshake sequence", steps: "1. Initiate ASP connection\n2. Send handshake\n3. Verify acknowledgment", expectedResult: "Successful ASP handshake", status: "passed", priority: "high" },
  ];

  for (const tc of testCasesData) {
    db.insert(schema.testCases).values({ ...tc, userId }).run();
  }

  const defects = [
    { sessionId: sessionIds[0], defectId: "DEF-001", title: "Jackpot meter not updating", description: "Progressive jackpot meter fails to update after jackpot win", severity: "critical", status: "open", protocol: "SAS", gameName: "Lucky Dragon Slots", stepsToReproduce: "1. Trigger jackpot\n2. Observe meter", expectedResult: "Meter updates", actualResult: "Meter stays at previous value" },
    { sessionId: sessionIds[1], defectId: "DEF-002", title: "QCOM timeout on poll", description: "QCOM polling times out intermittently", severity: "high", status: "open", protocol: "QCOM", gameName: "Golden Fortune", stepsToReproduce: "1. Start polling\n2. Wait for timeout", expectedResult: "Consistent response", actualResult: "Random timeouts" },
    { sessionId: sessionIds[2], defectId: "DEF-003", title: "ASP sequence number mismatch", description: "ASP sequence numbers become misaligned after rapid transactions", severity: "medium", status: "resolved", protocol: "ASP", gameName: "Wild Safari" },
  ];

  for (const d of defects) {
    db.insert(schema.defectReports).values({ ...d, userId }).run();
  }

  const faults = [
    { faultId: "FLT-001", title: "Memory leak in event handler", description: "Event handler accumulates memory over extended play sessions", protocol: "SAS", severity: "high", gameName: "Lucky Dragon Slots", gameId: "LD-001", rootCause: "Event listeners not properly cleaned up on state transitions", resolution: "Added cleanup in componentWillUnmount lifecycle", searchCount: 5 },
    { faultId: "FLT-002", title: "Protocol version mismatch", description: "EGM reports incorrect protocol version during handshake", protocol: "QCOM", severity: "critical", gameName: "Golden Fortune", gameId: "GF-001", rootCause: "Hardcoded version string instead of reading from configuration", searchCount: 12 },
    { faultId: "FLT-003", title: "Timeout on large data transfer", description: "Large meter data transfers exceed the default timeout period", protocol: "ASP", severity: "medium", gameName: "Wild Safari", gameId: "WS-001", rootCause: "Default timeout too short for bulk operations", resolution: "Increased timeout and added chunked transfer support", searchCount: 3 },
  ];

  for (const f of faults) {
    db.insert(schema.faultRepository).values({ ...f, userId }).run();
  }

  const logs = [
    { protocol: "SAS", logContent: "2026-05-01 10:23:45 [INFO] SAS Poll received - General Poll\n2026-05-01 10:23:46 [INFO] Response sent - Meters\n2026-05-01 10:23:47 [WARN] Delayed response - 250ms\n2026-05-01 10:23:48 [ERROR] CRC mismatch on packet 0x4F", analysis: "Log shows intermittent CRC errors. The delayed response at 10:23:47 may indicate processing bottleneck. CRC mismatch on packet 0x4F suggests data corruption during transmission.", severity: "warning" },
    { protocol: "QCOM", logContent: "2026-05-01 11:00:00 [INFO] QCOM Session established\n2026-05-01 11:00:01 [INFO] EGM Poll Response received\n2026-05-01 11:00:05 [WARN] No response to poll - retrying\n2026-05-01 11:00:10 [ERROR] Poll timeout after 3 retries", analysis: "Communication failure detected. Initial connection successful but subsequent polls failing after 5 seconds. May indicate network instability or EGM processing delay.", severity: "error" },
  ];

  for (const l of logs) {
    db.insert(schema.protocolLogs).values({ ...l, userId }).run();
  }
}

export { schema };
