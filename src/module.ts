import { RagControlPanel } from "./ragPanel";

Hooks.once("init", () => {
  console.log("Foundry RAG Assistant | Initializing");
});

Hooks.on("getSceneControlButtons", (controls: any[]) => {
  const tokenControls = controls.find(c => c.name === "token");
  if (!tokenControls) return;

  tokenControls.tools.push({
    name: "rag-panel",
    title: "RAG Assistant",
    icon: "fas fa-brain",
    button: true,
    onClick: () => {
      const app = new RagControlPanel();
      app.render(true);
    }
  });
});
