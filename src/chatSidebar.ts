import { getBackendBase, getAuthToken } from "./settings";

export class RagChatSidebar extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "rag-chat-sidebar",
      title: game.i18n.localize("RAG.ChatTitle"),
      template: "modules/foundry-rag-assistant/templates/rag-chat.hbs",
      width: 400,
      height: 500,
      resizable: true
    });
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);

    const log = html.find("[data-element='log']");
    const textarea = html.find("textarea[name='rag-chat-input']");

    const appendMessage = (who: string, text: string) => {
      const div = $(`<div class="rag-chat-message rag-chat-${who}"></div>`);
      div.text(text);
      log.append(div);
      log.scrollTop(log.prop("scrollHeight"));
    };

    html.find("[data-action='send']").on("click", async ev => {
      ev.preventDefault();
      const content = (textarea.val() as string)?.trim();
      if (!content) return;

      appendMessage("user", content);
      textarea.val("");

      const scene = game.scenes?.current;
      const base = getBackendBase();
      const url = `${base}/chat`;

      const headers: HeadersInit = { "Content-Type": "application/json" };
      const token = getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      try {
        const resp = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            content,
            scene: scene ? { id: scene.id, name: scene.name } : null
          })
        });

        if (!resp.ok || !resp.body) {
          appendMessage("assistant", "[Error contacting RAG backend]");
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let assistantText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          assistantText += chunk;
        }

        appendMessage("assistant", assistantText.trim());
      } catch (err) {
        console.error("RAG chat error", err);
        appendMessage("assistant", "[Error contacting RAG backend]");
      }
    });
  }
}
