import { getBackendBase, getAuthToken } from "./settings";

interface RagChunk {
  payload: any;
  score: number;
}

interface RagModelsResponse {
  models: string[];
}

interface RagChunksResponse {
  chunks: RagChunk[];
}

export class RagControlPanel extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "rag-control-panel",
      title: game.i18n.localize("RAG.PanelTitle"),
      template: "modules/foundry-rag-assistant/templates/rag-panel.hbs",
      width: 420,
      height: "auto",
      resizable: true
    });
  }

  async getData() {
    const base = getBackendBase();
    const [chunksResp, modelsResp] = await Promise.all([
      this._fetchJSON<RagChunksResponse>(`${base}/chunks`),
      this._fetchJSON<RagModelsResponse>(`${base}/models`)
    ]);

    return {
      chunks: chunksResp?.chunks ?? [],
      models: modelsResp?.models ?? []
    };
  }

  private async _fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T | null> {
    try {
      const headers: HeadersInit = { ...(options.headers || {}), "Content-Type": "application/json" };
      const token = getAuthToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resp = await fetch(url, {
        ...options,
        headers,
        credentials: "include"
      });
      if (!resp.ok) {
        console.warn("RAG request failed", url, resp.status);
        return null;
      }
      return (await resp.json()) as T;
    } catch (err) {
      console.error("RAG request error", url, err);
      return null;
    }
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);

    html.find("[data-action='refresh']").on("click", ev => {
      ev.preventDefault();
      this.render(true);
    });

    html.find("[data-action='ingest-url']").on("click", async ev => {
      ev.preventDefault();
      const input = html.find("input[name='ingest-url']");
      const url = (input.val() as string)?.trim();
      if (!url) {
        ui.notifications?.warn("RAG: Please enter a URL to ingest.");
        return;
      }

      const scene = game.scenes?.current;
      const base = getBackendBase();
      await this._fetchJSON(`${base}/ingest`, {
        method: "POST",
        body: JSON.stringify({ url, sceneId: scene?.id })
      });

      ui.notifications?.info("RAG: URL ingested.");
      this.render(true);
    });

    html.find("[data-action='ingest-journals']").on("click", async ev => {
      ev.preventDefault();
      const scene = game.scenes?.current;
      const journals = game.journal?.contents ?? [];
      if (!journals.length) {
        ui.notifications?.warn("RAG: No journals found to ingest.");
        return;
      }

      const base = getBackendBase();
      for (const j of journals) {
        const pages = (j as any).pages ?? [];
        const text = pages
          .map((p: any) => p.text?.content ?? "")
          .filter((t: string) => !!t)
          .join("\n\n");
        if (!text) continue;

        await this._fetchJSON(`${base}/ingest/journal`, {
          method: "POST",
          body: JSON.stringify({
            id: j.id,
            name: j.name,
            text,
            sceneId: scene?.id
          })
        });
      }

      ui.notifications?.info("RAG: Journals ingested.");
    });

    html.find("[data-action='clear-scene']").on("click", async ev => {
      ev.preventDefault();
      const scene = game.scenes?.current;
      if (!scene) {
        ui.notifications?.warn("RAG: No active scene.");
        return;
      }

      const base = getBackendBase();
      await this._fetchJSON(`${base}/clear-scene`, {
        method: "POST",
        body: JSON.stringify({ sceneId: scene.id })
      });

      ui.notifications?.info("RAG: Scene memory cleared.");
    });
  }
}
