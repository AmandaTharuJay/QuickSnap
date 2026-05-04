const state = {
  protocol: localStorage.getItem("aiqa-protocol") || "QCOM",
  signedIn: localStorage.getItem("aiqa-signed-in") === "true",
  lastLogSummary: localStorage.getItem("aiqa-last-log-summary") || ""
};

const protocolProfiles = {
  QCOM: {
    focus: "authorization timing, host response codes, reversal behavior, and terminal state transitions",
    evidence: ["transaction id", "auth request/response pair", "timeout window", "terminal firmware"],
    checks: ["Confirm approved auths complete within the expected response window.", "Verify reversal messages are emitted when completion fails.", "Capture host and terminal timestamps for drift."]
  },
  SAS: {
    focus: "polling cadence, event acknowledgements, meter deltas, and exception recovery",
    evidence: ["poll sequence", "event id", "meter snapshot", "cabinet state"],
    checks: ["Validate every event receives the expected acknowledgement.", "Compare meter deltas before and after the event.", "Check for duplicate polls during recovery."]
  },
  ASP: {
    focus: "session negotiation, message framing, payload validation, and retry handling",
    evidence: ["session id", "frame length", "payload checksum", "retry count"],
    checks: ["Confirm frame boundaries match the declared length.", "Validate checksum failures trigger a bounded retry.", "Record negotiated capabilities."]
  },
  "X-Series": {
    focus: "device orchestration, command sequencing, telemetry freshness, and failover",
    evidence: ["device id", "command sequence", "telemetry sample", "failover state"],
    checks: ["Ensure commands are idempotent across retries.", "Compare telemetry age against freshness thresholds.", "Capture failover transition markers."]
  },
  "All Protocols": {
    focus: "test setup, reproducibility, clear evidence capture, and risk-based triage",
    evidence: ["environment", "test data", "timestamps", "expected and actual behavior"],
    checks: ["Define the protocol under test before triage.", "Preserve raw logs with timestamps.", "Document the smallest reproducible path."]
  }
};

const authScreen = document.getElementById("authScreen");
const protocolSelect = document.getElementById("protocolSelect");
const sidebarProtocol = document.getElementById("sidebarProtocol");
const sessionSummary = document.getElementById("sessionSummary");

function renderAuth() {
  authScreen.classList.toggle("hidden", state.signedIn);
}

function renderProtocol() {
  protocolSelect.value = state.protocol;
  sidebarProtocol.textContent = state.protocol;
  sessionSummary.textContent = state.lastLogSummary || "No uploaded logs yet. Paste a log to enable data-aware analysis.";
}

function setOutput(element, html) {
  element.classList.remove("empty");
  element.innerHTML = html;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function routeTo(hash) {
  const target = hash.replace("#", "") || "dashboard";
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === target);
  });
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.nav === target);
  });
}

function buildAnswer(question) {
  const profile = protocolProfiles[state.protocol];
  const lowerQuestion = question.toLowerCase();
  const risk = lowerQuestion.includes("timeout") || lowerQuestion.includes("fail")
    ? "High"
    : lowerQuestion.includes("defect") || lowerQuestion.includes("bug")
      ? "Medium"
      : "Normal";

  return `
    <h4>${escapeHtml(state.protocol)} guidance</h4>
    <p><strong>Question:</strong> ${escapeHtml(question)}</p>
    <p>Focus this investigation on ${profile.focus}. Current triage risk: <strong>${risk}</strong>.</p>
    <h4>Recommended checks</h4>
    <ul>${profile.checks.map((check) => `<li>${escapeHtml(check)}</li>`).join("")}</ul>
    <h4>Evidence to capture</h4>
    <ul>${profile.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    <p class="note">If the issue is intermittent, run the same scenario at least twice and compare timestamps before changing the test setup.</p>
  `;
}

function analyzeLog(logText) {
  const lines = logText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const errorLines = lines.filter((line) => /error|fail|timeout|reject|invalid/i.test(line));
  const warningLines = lines.filter((line) => /warn|retry|slow|delay/i.test(line));
  const transactionIds = new Set();

  lines.forEach((line) => {
    const matches = line.match(/\b(?:txn|transaction|session|device)[=: -]?([A-Za-z0-9_-]+)/gi) || [];
    matches.forEach((match) => transactionIds.add(match));
  });

  const profile = protocolProfiles[state.protocol];
  const severity = errorLines.length > 0 ? "High" : warningLines.length > 0 ? "Medium" : "Low";
  const summary = `${lines.length} lines scanned, ${errorLines.length} errors, ${warningLines.length} warnings, severity ${severity}.`;
  state.lastLogSummary = summary;
  localStorage.setItem("aiqa-last-log-summary", summary);
  renderProtocol();

  return `
    <h4>Scan summary</h4>
    <div class="metric-row">
      <span><strong>${lines.length}</strong> lines</span>
      <span><strong>${errorLines.length}</strong> errors</span>
      <span><strong>${warningLines.length}</strong> warnings</span>
      <span><strong>${severity}</strong> severity</span>
    </div>
    <h4>Likely risk areas</h4>
    <ul>
      <li>${escapeHtml(profile.focus)}</li>
      <li>${transactionIds.size ? `${transactionIds.size} identifiers found for correlation.` : "No explicit transaction or session identifiers found."}</li>
      <li>${errorLines.length ? "Prioritize the first error before later cascading failures." : "No hard error markers found; inspect timing and state transitions."}</li>
    </ul>
    <h4>Flagged lines</h4>
    ${
      errorLines.concat(warningLines).slice(0, 8).length
        ? `<pre>${escapeHtml(errorLines.concat(warningLines).slice(0, 8).join("\n"))}</pre>`
        : "<p>No obvious error or warning markers detected.</p>"
    }
    <h4>Next actions</h4>
    <ul>${profile.checks.map((check) => `<li>${escapeHtml(check)}</li>`).join("")}</ul>
  `;
}

function draftDefect(summary, notes) {
  const profile = protocolProfiles[state.protocol];
  const title = summary || `${state.protocol} protocol behavior differs from expected result`;

  return `
    <h4>${escapeHtml(title)}</h4>
    <p><strong>Protocol:</strong> ${escapeHtml(state.protocol)}</p>
    <p><strong>Impact:</strong> Test execution may produce inconsistent certification evidence until the behavior is explained or corrected.</p>
    <h4>Steps to reproduce</h4>
    <ol>
      <li>Configure the test environment for ${escapeHtml(state.protocol)} validation.</li>
      <li>Run the scenario using the same device, host, and test data captured in the notes.</li>
      <li>Observe the response, timing, and state transitions around the failure point.</li>
    </ol>
    <h4>Expected result</h4>
    <p>The protocol exchange completes according to the specification and produces consistent acknowledgements, timing, and state updates.</p>
    <h4>Actual result</h4>
    <p>${escapeHtml(notes || "Actual result not provided. Add log excerpts and observed behavior before filing.")}</p>
    <h4>Required evidence</h4>
    <ul>${profile.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  `;
}

document.getElementById("signInButton").addEventListener("click", () => {
  state.signedIn = true;
  localStorage.setItem("aiqa-signed-in", "true");
  renderAuth();
});

document.getElementById("signOutButton").addEventListener("click", () => {
  state.signedIn = false;
  localStorage.removeItem("aiqa-signed-in");
  renderAuth();
});

protocolSelect.addEventListener("change", (event) => {
  state.protocol = event.target.value;
  localStorage.setItem("aiqa-protocol", state.protocol);
  renderProtocol();
});

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("questionInput").value = button.dataset.question;
  });
});

document.getElementById("questionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const question = document.getElementById("questionInput").value.trim();
  if (!question) return;
  setOutput(document.getElementById("answerOutput"), buildAnswer(question));
});

document.getElementById("logForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const logText = document.getElementById("logInput").value.trim();
  if (!logText) return;
  setOutput(document.getElementById("logOutput"), analyzeLog(logText));
});

document.getElementById("defectForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const summary = document.getElementById("defectSummary").value.trim();
  const notes = document.getElementById("defectNotes").value.trim();
  if (!summary && !notes) return;
  setOutput(document.getElementById("defectOutput"), draftDefect(summary, notes));
});

window.addEventListener("hashchange", () => routeTo(window.location.hash));

renderAuth();
renderProtocol();
routeTo(window.location.hash);
