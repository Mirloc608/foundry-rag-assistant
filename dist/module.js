// ===============================
// Constants & Settings
// ===============================
const MODULE_ID = "foundry-rag-assistant";

const SETTINGS = {
  BACKEND_URL: "backendUrl",
  AUTH_TOKEN: "authToken",
  MODEL: "model",
  MEMORY_ENABLED: "memoryEnabled",
  MEMORY_SIZE: "memorySize"
};

function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.BACKEND_URL, {
    name: "RAG Backend URL",
    hint: "URL of your RAG backend service.",
    scope: "world",
    config: true,
    type: String,
    default: "https://foundry.dmathome.com/rag",
    requiresReload: true
  });

  game.settings.register(MODULE_ID, SETTINGS.AUTH_TOKEN, {
    name: "RAG Auth Token",
    hint: "Authentication token for your RAG backend.",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS.MODEL, {
    name: "RAG Model",
    hint: "Choose which model to use.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      llama3: "Llama 3",
      mistral: "Mistral",
      phi3: "Phi-3",
      qwen2: "Qwen 2"
    },
    default: "llama3"
  });

  game.settings.register(MODULE_ID, SETTINGS.MEMORY_ENABLED, {
    name: "Enable Scene Memory",
    hint: "If enabled, recent interactions are sent as memory to the backend.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.MEMORY_SIZE, {
    name: "Scene Memory Size",
    hint: "How many recent messages to keep in memory.",
    scope: "world",
    config: true,
    type: Number,
    default: 20,
    range: { min: 5, max: 100, step: 1 }
  });
}

// ===============================
// Scene context & memory
// ===============================
function getSceneContext() {
  const scene = game.scenes?.current;
  const tokens = canvas?.tokens?.placeables ?? [];

  return {
    scene: scene
      ? {
          id: scene.id,
          name: scene.name,
          width: scene.width,
          height: scene.height
        }
      : null,
    tokens: tokens.map(t => ({
      id: t.id,
      name: t.name,
      disposition: t.document.disposition,
      x: t.document.x,
      y: t.document.y,
      hidden: t.document.hidden
    })),
    user: {
      id: game.user?.id,
      name: game.user?.name,
      isGM: game.user?.isGM
    }
  };
}

function getSceneMemory() {
  const enabled = game.settings.get(MODULE_ID, SETTINGS.MEMORY_ENABLED);
  if (!enabled) return [];
  const size = game.settings.get(MODULE_ID, SETTINGS.MEMORY_SIZE);
  const msgs = RAGAssistantApp.RAG_MESSAGES || [];
  return msgs.slice(-size);
}

// ===============================
// Token highlighting
// ===============================
function highlightTokensByIds(ids) {
  if (!canvas?.tokens) return;
  const set = new Set(ids);
  const targets = canvas.tokens.placeables.filter(t => set.has(t.id));
  applyHighlight(targets);
}

function highlightTokensByNames(names) {
  if (!canvas?.tokens) return;
  const lowerNames = names.map(n => n.toLowerCase());
  const tokens = canvas.tokens.placeables.filter(t => {
    const name = (t.name || "").toLowerCase();
    // smart: exact match preferred, then partial
    if (lowerNames.includes(name)) return true;
    return lowerNames.some(n => name.includes(n));
  });
  applyHighlight(tokens);
}

function inferTokensFromText(text) {
  if (!canvas?.tokens) return;
  const tokens = canvas.tokens.placeables;
  const lowerText = text.toLowerCase();
  const matches = tokens.filter(t => {
    const name = (t.name || "").toLowerCase();
    if (!name) return false;
    if (lowerText.includes(name)) return true;
    const parts = name.split(/\s+/).filter(p => p.length > 3);
    return parts.some(p => lowerText.includes(p));
  });
  applyHighlight(matches);
}

function applyHighlight(tokens) {
  if (!tokens.length) return;
  const isGM = game.user?.isGM;

  const visible = tokens.filter(t => {
    if (isGM) return true;
    return !t.document.hidden;
  });

  if (!visible.length) return;

  const first = visible[0];
  canvas.animatePan({ x: first.x, y: first.y, scale: 1.5, duration: 500 });

  visible.forEach(t => {
    const el = t.mesh?.object?.container ?? t.mesh?.object ?? t;
    if (!el || !t.icon) return;
    t.icon.filters = t.icon.filters || [];
    const existing = t.icon.filters.find(f => f.__ragHighlight);
    if (existing) return;

    const outline = new PIXI.filters.OutlineFilter(4, 0xffff00);
    outline.__ragHighlight = true;
    t.icon.filters.push(outline);

    setTimeout(() => {
      t.icon.filters = (t.icon.filters || []).filter(f => !f.__ragHighlight);
    }, 2000);
  });
}

// ===============================
// ApplicationV2 Panel (Handlebars)
// ===============================
class RAGAssistantApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "rag-assistant",
    title: "RAG Assistant",
    width: 520,
    height: 680,
    resizable: true,
    window: {
      frame: true,
      title: "RAG Assistant v1.1.0"
    }
  };

  static PARTS = {
    content: {
      template: "modules/foundry-rag-assistant/templates/panel.html"
    }
  };

  static RAG_MESSAGES = [];
  static STREAMING = false;
  static STREAMING_ERROR = null;

  async _preparePartContext(partId, context) {
    if (partId === "content") {
      return {
        messages: RAGAssistantApp.RAG_MESSAGES,
        backendUrl: game.settings.get(MODULE_ID, SETTINGS.BACKEND_URL),
        model: game.settings.get(MODULE_ID, SETTINGS.MODEL),
        memoryEnabled: game.settings.get(MODULE_ID, SETTINGS.MEMORY_ENABLED),
        isGM: game.user?.isGM,
        streaming: RAGAssistantApp.STREAMING,
        streamingError: RAGAssistantApp.STREAMING_ERROR
      };
    }
    return context;
  }

  static addMessage(role, content, extra = {}) {
    RAGAssistantApp.RAG_MESSAGES.push({
      role,
      content,
      ts: new Date().toLocaleTimeString(),
      ...extra
    });
  }

  static startStreamingMessage() {
    const msg = {
      role: "assistant",
      content: "",
      ts: new Date().toLocaleTimeString(),
      streaming: true
    };
    RAGAssistantApp.RAG_MESSAGES.push(msg);
    return msg;
  }

  static finishStreamingMessage(msg) {
    msg.streaming = false;
  }

  async sendMessage(prompt, options = {}) {
    if (!prompt?.trim()) return;

    const backendUrl = game.settings.get(MODULE_ID, SETTINGS.BACKEND_URL);
    const authToken = game.settings.get(MODULE_ID, SETTINGS.AUTH_TOKEN);
    const model = game.settings.get(MODULE_ID, SETTINGS.MODEL);

    const isGM = game.user?.isGM;
    const tool = options.tool || null;

    RAGAssistantApp.addMessage("user", prompt, { tool });
    await this.render();

    const context = getSceneContext();
    const memory = getSceneMemory();

    RAGAssistantApp.STREAMING = true;
    RAGAssistantApp.STREAMING_ERROR = null;
    const streamingMsg = RAGAssistantApp.startStreamingMessage();
    await this.render();

    try {
      const res = await fetch(`${backendUrl}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          model,
          prompt,
          context,
          memory,
          tool,
          user: {
            id: game.user?.id,
            name: game.user?.name,
            isGM
          }
        })
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        const msg = `Backend error: ${res.status} ${text}`;
        streamingMsg.content = msg;
        RAGAssistantApp.STREAMING_ERROR = msg;
        RAGAssistantApp.finishStreamingMessage(streamingMsg);
        RAGAssistantApp.STREAMING = false;
        await this.render();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let done = false;

      let lastUpdate = 0;
      const updateInterval = 40; // ~25fps

      const highlightIds = new Set();
      const highlightNames = new Set();

      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          buffer += decoder.decode(result.value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;

            try {
              const obj = JSON.parse(line);

              if (typeof obj.token === "string") {
                streamingMsg.content += obj.token;
              }

              if (Array.isArray(obj.highlight)) {
                for (const h of obj.highlight) {
                  if (typeof h === "string") {
                    if (h.match(/^[a-zA-Z0-9]{16}$/)) {
                      highlightIds.add(h);
                    } else {
                      highlightNames.add(h);
                    }
                  }
                }
              }
            } catch (e) {
              streamingMsg.content += line;
            }

            const now = performance.now();
            if (now - lastUpdate > updateInterval) {
              lastUpdate = now;
              await this.render();
            }
          }
        }
      }

      if (buffer.trim()) {
        try {
          const obj = JSON.parse(buffer.trim());
          if (typeof obj.token === "string") {
            streamingMsg.content += obj.token;
          }
          if (Array.isArray(obj.highlight)) {
            for (const h of obj.highlight) {
              if (typeof h === "string") {
                if (h.match(/^[a-zA-Z0-9]{16}$/)) {
                  highlightIds.add(h);
                } else {
                  highlightNames.add(h);
                }
              }
            }
          }
        } catch {
          streamingMsg.content += buffer.trim();
        }
      }

      RAGAssistantApp.finishStreamingMessage(streamingMsg);
      RAGAssistantApp.STREAMING = false;
      await this.render();

      const ids = Array.from(highlightIds);
      const names = Array.from(highlightNames);

      if (ids.length) {
        highlightTokensByIds(ids);
      } else if (names.length) {
        highlightTokensByNames(names);
      } else {
        inferTokensFromText(streamingMsg.content || "");
      }
    } catch (err) {
      const msg = `Request failed: ${err?.message ?? err}`;
      streamingMsg.content = msg;
      RAGAssistantApp.STREAMING_ERROR = msg;
      RAGAssistantApp.finishStreamingMessage(streamingMsg);
      RAGAssistantApp.STREAMING = false;
      await this.render();
    }
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!root) return;

    // Tabs
    const tabButtons = root.querySelectorAll("[data-rag-tab]");
    const tabPanels = root.querySelectorAll("[data-rag-panel]");

    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-rag-tab");
        tabButtons.forEach(b => b.classList.remove("active"));
        tabPanels.forEach(p =>
          p.classList.toggle(
            "active",
            p.getAttribute("data-rag-panel") === target
          )
        );
        btn.classList.add("active");
      });
    });

    // Chat form
    const form = root.querySelector("#rag-chat-form");
    const input = root.querySelector("#rag-chat-input");
    const messages = root.querySelector("#rag-chat-messages");

    if (messages) {
      messages.scrollTop = messages.scrollHeight;
    }

    if (form && input) {
      form.addEventListener("submit", async ev => {
        ev.preventDefault();
        const value = input.value;
        input.value = "";
        await this.sendMessage(value);
      });
    }

    // Context panel
    const contextPre = root.querySelector("#rag-context-json");
    if (contextPre) {
      contextPre.textContent = JSON.stringify(
        {
          context: getSceneContext(),
          memory: getSceneMemory()
        },
        null,
        2
      );
    }

    // GM tools
    const gmToolButtons = root.querySelectorAll("[data-rag-gm-tool]");
    gmToolButtons.forEach(btn => {
      const tool = btn.getAttribute("data-rag-gm-tool");
      const gmOnly = btn.getAttribute("data-rag-gm-only") === "true";
      const isGM = game.user?.isGM;

      if (gmOnly && !isGM) {
        btn.classList.add("rag-gm-disabled");
        btn.addEventListener("click", ev => {
          ev.preventDefault();
          ui.notifications?.warn("This tool is GM-only.");
        });
        return;
      }

      btn.addEventListener("click", async ev => {
        ev.preventDefault();
        const prompt = btn.getAttribute("data-rag-prompt") || "";
        await this.sendMessage(prompt, { tool });
      });
    });
  }
}

// ===============================
// Hooks
// ===============================
Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  game.ragAssistant = new RAGAssistantApp();

  // Floating quick-access button
  const btn = document.createElement("div");
  btn.id = "rag-floating-button";
  btn.title = "RAG Assistant";
  btn.innerHTML = `<i class="fas fa-brain"></i>`;
  btn.addEventListener("click", () => game.ragAssistant.render(true));
  document.body.appendChild(btn);
});

// Token Controls button
Hooks.on("getSceneControlButtons", (controls) => {
  const list = Array.isArray(controls) ? controls : Array.from(controls);

  const tokenControls = list.find(c => c.name === "token");
  if (!tokenControls) return;

  tokenControls.tools.push({
    name: "rag-assistant",
    title: "RAG Assistant",
    icon: "fas fa-brain",
    button: true,
    onClick: () => game.ragAssistant.render(true)
  });
});

// Chat sidebar button
Hooks.on("renderChatLog", (app, html) => {
  const root = html instanceof HTMLElement ? html : html?.element ?? html;
  if (!root) return;

  const controls = root.querySelector(".control-buttons");
  if (!controls) return;

  const btn = document.createElement("a");
  btn.classList.add("rag-chat-button");
  btn.title = "RAG Assistant";

  const icon = document.createElement("i");
  icon.classList.add("fas", "fa-brain");
  btn.appendChild(icon);

  btn.addEventListener("click", () => game.ragAssistant.render(true));
  controls.appendChild(btn);
});
