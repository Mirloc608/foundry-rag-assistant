export const MODULE_ID = "foundry-rag-assistant";

export const SETTINGS = {
  BACKEND_URL: "backendUrl",
  AUTH_TOKEN: "authToken"
} as const;

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.BACKEND_URL, {
    name: "RAG.Setting.BackendURL",
    hint: "RAG.Setting.BackendURL.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "https://foundry.dmathome.com/rag",
    requiresReload: true
  });

  game.settings.register(MODULE_ID, SETTINGS.AUTH_TOKEN, {
    name: "RAG.Setting.AuthToken",
    hint: "RAG.Setting.AuthToken.Hint",
    scope: "world",
    config: true,
    type: String,
    default: "",
    requiresReload: false
  });
}

export function getBackendBase(): string {
  return (game.settings.get(MODULE_ID, SETTINGS.BACKEND_URL) as string).replace(/\/+$/, "");
}

export function getAuthToken(): string | null {
  const v = game.settings.get(MODULE_ID, SETTINGS.AUTH_TOKEN) as string;
  return v?.trim() || null;
}
