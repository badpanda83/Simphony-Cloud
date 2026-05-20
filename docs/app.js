const STORAGE_KEY = "simphony-setup-form";
const PERSISTED_FIELDS = [
  "apiBaseUrl",
  "simphonyHost",
  "clientId",
  "username",
  "orgName",
  "orgShortName",
  "locRef",
  "rvcRef",
  "menuId",
];

const form = document.getElementById("setup-form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const submitBtn = document.getElementById("submit-btn");
const clientIdInput = document.getElementById("clientId");
const clientIdSuggestionEl = document.getElementById("clientIdSuggestion");
const useDecodedClientIdBtn = document.getElementById("useDecodedClientId");

restoreFormValues();
if (!document.getElementById("apiBaseUrl").value && window.location.origin.includes("localhost")) {
  document.getElementById("apiBaseUrl").value = "http://localhost:3000";
}
updateClientIdSuggestion();
persistFormValues();

for (const fieldId of PERSISTED_FIELDS) {
  const fieldEl = document.getElementById(fieldId);
  if (!fieldEl) {
    continue;
  }
  fieldEl.addEventListener("input", () => {
    persistFormValues();
    if (fieldId === "clientId") {
      updateClientIdSuggestion();
    }
  });
}

useDecodedClientIdBtn.addEventListener("click", () => {
  const suggestion = getDecodedClientIdSuggestion(clientIdInput.value);
  if (!suggestion) {
    return;
  }
  clientIdInput.value = suggestion;
  updateClientIdSuggestion();
  persistFormValues();
});

function restoreFormValues() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }
  try {
    const values = JSON.parse(raw);
    for (const fieldId of PERSISTED_FIELDS) {
      const value = values[fieldId];
      if (typeof value !== "string") {
        continue;
      }
      const fieldEl = document.getElementById(fieldId);
      if (fieldEl) {
        fieldEl.value = value;
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persistFormValues() {
  const values = {};
  for (const fieldId of PERSISTED_FIELDS) {
    const fieldEl = document.getElementById(fieldId);
    if (!fieldEl) {
      continue;
    }
    values[fieldId] = fieldEl.value;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
}

function getDecodedClientIdSuggestion(value) {
  const raw = value.trim();
  if (!raw) {
    return null;
  }
  const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    return null;
  }
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  let decoded = "";
  try {
    decoded = atob(padded).trim();
  } catch {
    return null;
  }
  if (!decoded || decoded === raw) {
    return null;
  }
  const printable = /^[\x20-\x7E]+$/.test(decoded);
  const orgUuidLike = /^[A-Za-z0-9_-]+\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    decoded
  );
  const plausible = /^[A-Za-z0-9_-]+\.[A-Za-z0-9._-]{8,}$/.test(decoded);
  if (!printable || (!orgUuidLike && !plausible)) {
    return null;
  }
  return decoded;
}

function updateClientIdSuggestion() {
  const suggestion = getDecodedClientIdSuggestion(clientIdInput.value);
  if (!suggestion) {
    clientIdSuggestionEl.classList.add("hidden");
    useDecodedClientIdBtn.classList.add("hidden");
    clientIdSuggestionEl.textContent = "";
    return;
  }
  clientIdSuggestionEl.classList.remove("hidden");
  useDecodedClientIdBtn.classList.remove("hidden");
  clientIdSuggestionEl.textContent = `Decoded candidate: ${suggestion}`;
}

function normalizeHost(host) {
  return host.trim().replace(/\/$/, "");
}

function toFriendlyError(message) {
  const raw = String(message || "");
  const lower = raw.toLowerCase();
  if (raw.includes("REDIRECT_URL_NOT_FOUND")) {
    return "Redirect URI is not registered for this API account. Ask your Simphony admin to allow the expected callback URI for this client ID.";
  }
  if (raw.includes("INVALID_AUTHORIZATION_HEADER")) {
    return "Authorization header was rejected by Oracle. Confirm the Simphony host and client ID are correct, then retry.";
  }
  if (raw.includes("Ambiguous URI empty segment") || raw.includes("badURI")) {
    return "The Simphony host URL is malformed (often from an extra slash). Use only the Oracle host, for example https://ors-idm.us07.oraclerestaurants.com.";
  }
  if (
    lower.includes("client_id") ||
    lower.includes("client id") ||
    lower.includes("invalid_client")
  ) {
    return "Client ID appears invalid. Oracle may provide an encoded value; try the decoded ORG.UUID-style client ID.";
  }
  return raw;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultsEl.classList.add("hidden");
  resultsEl.innerHTML = "";
  statusEl.classList.remove("hidden", "success", "failure", "running");
  statusEl.classList.add("running");
  statusEl.textContent = "Authenticating and running validation…";
  submitBtn.disabled = true;

  const apiBase = normalizeHost(document.getElementById("apiBaseUrl").value);

  const payload = {
    simphonyHost: normalizeHost(document.getElementById("simphonyHost").value),
    clientId: document.getElementById("clientId").value.trim(),
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value,
    orgName: document.getElementById("orgName").value.trim(),
    orgShortName: document.getElementById("orgShortName").value.trim(),
    locRef: document.getElementById("locRef").value.trim(),
    rvcRef: document.getElementById("rvcRef").value.trim(),
    menuId: document.getElementById("menuId").value.trim() || undefined,
  };
  document.getElementById("apiBaseUrl").value = apiBase;
  document.getElementById("simphonyHost").value = payload.simphonyHost;
  persistFormValues();

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
      throw new Error(toFriendlyError(data.error || `Request failed (${res.status})`));
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
    statusEl.textContent = toFriendlyError(err instanceof Error ? err.message : "Unexpected error");
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
      <p>${escapeHtml(toFriendlyError(step.message))}</p>
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
