import { RagControlPanel } from "./ragPanel";

Hooks.once("init", () => {
  console.log("Foundry RAG Assistant | Initializing");
});

Hooks.on("getSceneControlButtons", (controls: any) => {
  // In Foundry V12+ and V13, the array of control groups is in controls.controls
  const groups = controls.controls;
  if (!Array.isArray(groups)) return;

  const tokenControls = groups.find((c: any) => c.name === "token");
  if (!tokenControls) return;

  tokenControls.tools.push({
    name: "rag-panel",
    title: game.i18n.localize("RAG.Title"),
    icon: "fas fa-brain",
    button: true,
    onClick: () => new RagControlPanel().render(true)
  });
});


