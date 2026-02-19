import { RagControlPanel } from "./ragPanel";

Hooks.once("init", () => {
  console.log("Foundry RAG Assistant | Initializing");
});

Hooks.on("getSceneControlButtons", (controls: any) => {
  // V11: controls.controls is the array
  const buttons = controls.controls;

  const tokenControls = buttons.find((c: any) => c.name === "token");
  if (!tokenControls) return;

  tokenControls.tools.push({
    name: "rag-panel",
    title: game.i18n.localize("RAG.Title"),
    icon: "fas fa-brain",
    button: true,
    onClick: () => new RagControlPanel().render(true)
  });
});

