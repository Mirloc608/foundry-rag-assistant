import { RagControlPanel } from "./ragPanel";
import { RagChatSidebar } from "./chatSidebar";
import { registerSettings } from "./settings";

Hooks.once("init", () => {
  console.log("Foundry RAG Assistant | Initializing");
  registerSettings();
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tokenControls = controls.find(c => c.name === "token");
  if (!tokenControls) return;

  tokenControls.tools.push({
    name: "rag-assistant",
    title: "RAG Assistant",
    icon: "fas fa-brain",
    button: true,
    onClick: () => game.ragAssistant.openPanel()
  });
});


Hooks.on("renderChatLog", (app, html, data) => {
  const controls = html.find(".control-buttons");
  if (!controls.length) return;

  const btn = $(
    `<a class="rag-chat-button" title="RAG Assistant">
       <i class="fas fa-brain"></i>
     </a>`
  );

  btn.on("click", () => game.ragAssistant.openPanel());
  controls.append(btn);
});

class RAGAssistantApp extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "rag-assistant",
      title: "RAG Assistant",
      template: "modules/foundry-rag-assistant/templates/panel.html",
      width: 400,
      height: 600,
      resizable: true
    });
  }
}

Hooks.once("ready", () => {
  game.ragAssistant = new RAGAssistantApp();
});
