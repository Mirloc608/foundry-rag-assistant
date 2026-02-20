import { RagControlPanel } from "./ragPanel";
import { RagChatSidebar } from "./chatSidebar";
import { registerSettings } from "./settings";

Hooks.once("init", () => {
  console.log("Foundry RAG Assistant | Initializing");
  registerSettings();
});

Hooks.on("getSceneControlButtons", (controls: any) => {
  const groups = controls.controls;
  if (!groups || typeof groups !== "object") return;

  // Dynamically detect the token controls group
  const tokenControls =
    groups["token"] ||
    groups["tokens"] ||
    Object.values(groups).find((g: any) =>
      typeof g?.name === "string" && g.name.toLowerCase().includes("token")
    );

  if (!tokenControls) return;

  tokenControls.tools.push({
    name: "rag-panel",
    title: game.i18n.localize("RAG.Title"),
    icon: "fas fa-brain",
    button: true,
    onClick: () => new RagControlPanel().render(true)
  });
});

Hooks.on("renderChatLog", (_app: any, html: HTMLElement) => {
  const jq = $(html);

  const button = $(`
    <a class="rag-chat-button">
      <i class="fas fa-brain"></i> ${game.i18n.localize("RAG.ChatTitle")}
    </a>
  `);

  button.on("click", ev => {
    ev.preventDefault();
    new RagChatSidebar().render(true);
  });

  jq.find(".chat-control-icon").last().after(button);
});
