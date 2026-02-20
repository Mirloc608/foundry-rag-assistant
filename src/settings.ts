export const MODULE_ID = "foundry-rag-assistant";

export const SETTINGS = {
  BACKEND_URL: "backendUrl",
  AUTH_TOKEN: "authToken",
  MODEL: "model"
} as const;

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.BACKEND_URL, {
    name: "RAG.Setting.BackendURL",
    hint: "RAG.Setting.BackendURLHint",
    scope: "world",
    config: true,
    type: String,
    default: "https://foundry.dmathome.com/rag",
    requiresReload: true
  });

  game.settings.register(MODULE_ID, SETTINGS.AUTH_TOKEN, {
    name: "RAG.Setting.AuthToken",
    hint: "RAG.Setting.AuthTokenHint",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS.MODEL, {
    name: "RAG.Setting.Model",
    hint: "RAG.Setting.ModelHint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "llama3": "Llama 3",
      "mistral": "Mistral",
      "phi3": "Phi-3",
      "qwen2": "Qwen 2"
    },
    default: "llama3"
  });
}

export function getBackendBase(): string {
  return (game.settings.get(MODULE_ID, SETTINGS.BACKEND_URL) as string).replace(/\/+$/, "");
}

export function getAuthToken(): string | null {
  const v = game.settings.get(MODULE_ID, SETTINGS.AUTH_TOKEN) as string;
  return v?.trim() || null;
}

export function getSelectedModel(): string {
  return game.settings.get(MODULE_ID, SETTINGS.MODEL) as string;
}
