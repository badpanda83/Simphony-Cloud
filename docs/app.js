const STORAGE_KEY = "simphony-setup-api-url";

const form = document.getElementById("setup-form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const submitBtn = document.getElementById("submit-btn");

const savedApi = localStorage.getItem(STORAGE_KEY);
if (savedApi) {
  document.getElementById("apiBaseUrl").value = savedApi;
} else if (window.location.origin.includes("localhost")) {
  document.getElementById("apiBaseUrl").value = "http://localhost:3000";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultsEl.classList.add("hidden");
  resultsEl.innerHTML = "";
  statusEl.classList.remove("hidden", "success", "failure", "running");
  statusEl.classList.add("running");
  statusEl.textContent = "Authenticating and running validation…";
  submitBtn.disabled = true;

  const apiBase = document
    .getElementById("apiBaseUrl")
    .value.trim()
    .replace(/\/$/, "");
  localStorage.setItem(STORAGE_KEY, apiBase);

  const payload = {
    simphonyHost: document.getElementById("simphonyHost").value.trim(),
    clientId: document.getElementById("clientId").value.trim(),
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value,
    orgName: document.getElementById("orgName").value.trim(),
    orgShortName: document.getElementById("orgShortName").value.trim(),
    locRef: document.getElementById("locRef").value.trim(),
    rvcRef: document.getElementById("rvcRef").value.trim(),
    menuId: document.getElementById("menuId").value.trim() || undefined,
  };

  try {
    const res = await fetch(`${apiBase}/workflows/setup/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok && !data.steps) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }

    renderResults(data);
    statusEl.classList.remove("running");
    statusEl.classList.add(data.ok ? "success" : "failure");
    statusEl.textContent = data.ok
      ? `All checks passed (${data.durationMs}ms)`
      : data.ticketsOk === false
        ? "Validation failed — no tickets in the last 7 days"
        : "Validation failed — see steps below";
  } catch (err) {
    statusEl.classList.remove("running");
    statusEl.classList.add("failure");
    statusEl.textContent =
      err instanceof Error ? err.message : "Unexpected error";
  } finally {
    submitBtn.disabled = false;
  }
});

function renderResults(data) {
  resultsEl.classList.remove("hidden");
  const steps = data.steps || [];

  resultsEl.innerHTML = steps
    .map(
      (step) => `
    <article class="step card">
      <div class="step-header">
        <span class="badge ${step.ok ? "ok" : "fail"}">${step.ok ? "OK" : "Fail"}</span>
        <span>${escapeHtml(step.label)}</span>
      </div>
      <p>${escapeHtml(step.message)}</p>
      ${
        step.sample
          ? `<pre>${escapeHtml(JSON.stringify(step.sample, null, 2))}</pre>`
          : ""
      }
    </article>
  `
    )
    .join("");
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
