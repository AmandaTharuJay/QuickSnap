const state = {
  protocol: "QCOM",
  signedIn: false,
  user: null,
  lastLogSummary: ""
};

const authScreen = document.getElementById("authScreen");
const protocolSelect = document.getElementById("protocolSelect");
const sidebarProtocol = document.getElementById("sidebarProtocol");
const sessionSummary = document.getElementById("sessionSummary");
const userChip = document.getElementById("userChip");
const exportReportButton = document.getElementById("exportReportButton");
const clearHistoryButton = document.getElementById("clearHistoryButton");

function renderAuth() {
  authScreen.classList.toggle("visible", !state.signedIn);
}

function renderProtocol() {
  protocolSelect.value = state.protocol;
  sidebarProtocol.textContent = state.protocol;
  sessionSummary.textContent = state.lastLogSummary || "No uploaded logs yet. Paste a log to enable data-aware analysis.";
  userChip.hidden = !state.signedIn;
  userChip.textContent = state.user ? `Signed in as ${state.user}` : "";
}

function setOutput(element, html) {
  element.classList.remove("empty");
  element.innerHTML = html;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
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

function renderAnswer(result) {
  return `
    <h4>${escapeHtml(result.protocol)} guidance</h4>
    <p><strong>Question:</strong> ${escapeHtml(result.question)}</p>
    <p>${escapeHtml(result.guidance)}</p>
    <h4>Recommended checks</h4>
    ${renderList(result.recommended_checks)}
    <h4>Evidence to capture</h4>
    ${renderList(result.evidence_to_capture)}
    <p class="note">${escapeHtml(result.note)}</p>
  `;
}

function renderLogAnalysis(result) {
  state.lastLogSummary = result.summary;
  renderProtocol();

  return `
    <h4>Scan summary</h4>
    <div class="metric-row">
      <span><strong>${result.line_count}</strong> lines</span>
      <span><strong>${result.error_count}</strong> errors</span>
      <span><strong>${result.warning_count}</strong> warnings</span>
      <span><strong>${escapeHtml(result.severity)}</strong> severity</span>
    </div>
    <h4>Likely risk areas</h4>
    ${renderList(result.risk_areas)}
    <h4>Flagged lines</h4>
    ${
      result.flagged_lines.length
        ? `<pre>${escapeHtml(result.flagged_lines.join("\n"))}</pre>`
        : "<p>No obvious error or warning markers detected.</p>"
    }
    <h4>Next actions</h4>
    ${renderList(result.next_actions)}
  `;
}

function renderDefect(result) {
  return `
    <h4>${escapeHtml(result.title)}</h4>
    <p><strong>Protocol:</strong> ${escapeHtml(result.protocol)}</p>
    <p><strong>Impact:</strong> ${escapeHtml(result.impact)}</p>
    <h4>Steps to reproduce</h4>
    <ol>${result.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
    <h4>Expected result</h4>
    <p>${escapeHtml(result.expected_result)}</p>
    <h4>Actual result</h4>
    <p>${escapeHtml(result.actual_result)}</p>
    <h4>Required evidence</h4>
    ${renderList(result.required_evidence)}
  `;
}

function renderHistory(history) {
  const output = document.getElementById("historyOutput");
  exportReportButton.disabled = !history.length;
  clearHistoryButton.disabled = !history.length;

  if (!history.length) {
    output.classList.add("empty");
    output.textContent = "No application activity yet. Sign in and use the assistants to build a session history.";
    return;
  }

  output.classList.remove("empty");
  output.innerHTML = history
    .slice()
    .reverse()
    .map((entry) => `
      <article class="history-item">
        <strong>${escapeHtml(entry.type)}</strong>
        <span>${escapeHtml(entry.created_at)}</span>
        <p>${escapeHtml(entry.summary)}</p>
      </article>
    `)
    .join("");
}

async function refreshSession() {
  const session = await api("/api/session");
  state.signedIn = session.signed_in;
  state.user = session.user;
  state.protocol = session.protocol;
  state.lastLogSummary = session.last_log_summary || "";
  renderAuth();
  renderProtocol();
  renderHistory(session.history || []);
}

document.getElementById("signInButton").addEventListener("click", async () => {
  await api("/api/sign-in", {
    method: "POST",
    body: JSON.stringify({ name: document.getElementById("displayNameInput").value.trim() || "QA Tester" })
  });
  await refreshSession();
});

document.getElementById("signOutButton").addEventListener("click", async () => {
  await api("/api/sign-out", { method: "POST", body: "{}" });
  await refreshSession();
});

clearHistoryButton.addEventListener("click", async () => {
  await api("/api/clear-history", { method: "POST", body: "{}" });
  await refreshSession();
});

exportReportButton.addEventListener("click", () => {
  window.location.href = "/api/export";
});

protocolSelect.addEventListener("change", async (event) => {
  state.protocol = event.target.value;
  renderProtocol();
  await api("/api/protocol", {
    method: "POST",
    body: JSON.stringify({ protocol: state.protocol })
  });
  await refreshSession();
});

document.querySelectorAll("[data-question]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("questionInput").value = button.dataset.question;
  });
});

document.getElementById("questionForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = document.getElementById("questionInput").value.trim();
  if (!question) return;
  const result = await api("/api/ask", {
    method: "POST",
    body: JSON.stringify({ question })
  });
  setOutput(document.getElementById("answerOutput"), renderAnswer(result));
  renderHistory(result.history || []);
});

document.getElementById("logForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const logText = document.getElementById("logInput").value.trim();
  if (!logText) return;
  const result = await api("/api/analyze-log", {
    method: "POST",
    body: JSON.stringify({ log: logText })
  });
  setOutput(document.getElementById("logOutput"), renderLogAnalysis(result));
  renderHistory(result.history || []);
});

document.getElementById("defectForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const summary = document.getElementById("defectSummary").value.trim();
  const notes = document.getElementById("defectNotes").value.trim();
  if (!summary && !notes) return;
  const result = await api("/api/draft-defect", {
    method: "POST",
    body: JSON.stringify({ summary, notes })
  });
  setOutput(document.getElementById("defectOutput"), renderDefect(result));
  renderHistory(result.history || []);
});

window.addEventListener("hashchange", () => routeTo(window.location.hash));

refreshSession().catch((error) => {
  console.error(error);
  renderAuth();
  renderProtocol();
});
routeTo(window.location.hash);
