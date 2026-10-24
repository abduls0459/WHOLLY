let accessToken = "";
const apiBase = import.meta.env.VITE_API_BASE_URL || "/api/v1";
function setAccessToken(token) {
  accessToken = token;
}
async function readResponse(response) {
  if (response.status === 204) return void 0;
  return response.json().catch(() => null);
}
async function send(path, init, retry = true) {
  const response = await fetch(apiBase + path, {
    ...init,
    credentials: "include",
    headers: {
      ...init.body ? { "Content-Type": "application/json" } : {},
      ...accessToken ? { Authorization: "Bearer " + accessToken } : {},
      ...init.headers
    }
  });
  if (response.status === 401 && accessToken && retry && !path.startsWith("/auth/")) {
    try {
      const refreshedResponse = await fetch(apiBase + "/auth/refresh", { method: "POST", credentials: "include" });
      const refreshed = await readResponse(refreshedResponse);
      if (!refreshedResponse.ok || !refreshed?.accessToken) throw new Error("Session expired.");
      setAccessToken(refreshed.accessToken);
      return send(path, init, false);
    } catch {
      setAccessToken("");
    }
  }
  if (!response.ok) {
    const body = await readResponse(response);
    throw new Error(body?.error?.message ?? "Something went wrong. Please try again.");
  }
  return readResponse(response);
}
function request(path, init = {}) {
  return send(path, init);
}
function studyRequest(path, init = {}) {
  return request(path, init);
}
function fitnessRequest(path, init = {}) {
  return request(path, init);
}
function getIslamicData() {
  return request("/islamic");
}
function saveIslamicData(data) {
  return request("/islamic", { method: "PUT", body: JSON.stringify({ data }) });
}
function getDashboard() {
  return request("/dashboard");
}
async function restoreSession() {
  const refreshed = await request("/auth/refresh", { method: "POST" });
  setAccessToken(refreshed.accessToken);
  const result = await request("/me");
  return result.user;
}
async function signIn(values) {
  const result = await request("/auth/login", { method: "POST", body: JSON.stringify(values) });
  setAccessToken(result.accessToken);
  return (await request("/me")).user;
}
async function signUp(values) {
  const result = await request("/auth/register", { method: "POST", body: JSON.stringify(values) });
  setAccessToken(result.accessToken);
  return (await request("/me")).user;
}
async function updateSettings(settings) {
  return request("/me", { method: "PATCH", body: JSON.stringify(settings) });
}
async function signOut() {
  try {
    await request("/auth/logout", { method: "POST" });
  } finally {
    setAccessToken("");
  }
}
export {
  fitnessRequest,
  getDashboard,
  getIslamicData,
  restoreSession,
  saveIslamicData,
  setAccessToken,
  signIn,
  signOut,
  signUp,
  studyRequest,
  updateSettings
};
