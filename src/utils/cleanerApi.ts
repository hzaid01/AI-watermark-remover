import { CleanApiResponse, RewriteApiResponse, OllamaModel } from '../types';

export class CleanerApi {
  private backendUrl: string;

  constructor(backendUrl = 'http://127.0.0.1:8765') {
    this.backendUrl = backendUrl;
  }

  setBackendUrl(url: string) {
    this.backendUrl = url;
  }

  getBackendUrl(): string {
    return this.backendUrl;
  }

  /**
   * Healthcheck
   */
  async checkHealth(): Promise<{ ok: boolean; version?: string }> {
    try {
      const res = await fetch(`${this.backendUrl}/health`, { method: 'GET' });
      if (!res.ok) return { ok: false };
      const data = await res.json();
      return { ok: Boolean(data.ok), version: data.version };
    } catch {
      return { ok: false };
    }
  }

  /**
   * Capabilities
   */
  async getCapabilities(): Promise<any> {
    try {
      const res = await fetch(`${this.backendUrl}/capabilities`, { method: 'GET' });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Clean text using Layer A
   */
  async cleanText(text: string): Promise<CleanApiResponse> {
    try {
      // Encode UTF-8 text to base64 safely
      const encoder = new TextEncoder();
      const uint8 = encoder.encode(text);
      let binary = '';
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      const b64 = btoa(binary);

      const res = await fetch(`${this.backendUrl}/clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: b64,
          name: 'input.txt',
          options: {
            nfkc: false,
            aggressive_homoglyphs: false,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return {
          ok: false,
          error: data.error || `Server responded with status ${res.status}`,
        };
      }

      return data;
    } catch (err: any) {
      return {
        ok: false,
        error: err.message || 'Failed to connect to cleaning backend',
      };
    }
  }

  /**
   * Clean a file using base64 payload
   */
  async cleanFile(
    filename: string,
    base64Data: string,
    options: Record<string, any> = {}
  ): Promise<CleanApiResponse> {
    try {
      const res = await fetch(`${this.backendUrl}/clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64Data,
          name: filename,
          options: {
            ...options,
            also_layer_a_text: true,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return {
          ok: false,
          error: data.error || `Server returned error status ${res.status}`,
        };
      }

      return data;
    } catch (err: any) {
      return {
        ok: false,
        error: err.message || 'Failed to connect to cleaning service',
      };
    }
  }

  /**
   * Rewrite text via Ollama Layer B
   */
  async rewriteText(
    text: string,
    model: string,
    ollamaBaseUrl = 'http://127.0.0.1:11434',
    strength = 'paraphrase'
  ): Promise<RewriteApiResponse> {
    try {
      const res = await fetch(`${this.backendUrl}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model,
          backend: 'ollama',
          base_url: ollamaBaseUrl,
          strength,
          layer_a_after: true,
          timeout: 180,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return {
          ok: false,
          error: data.error || `Rewrite failed: ${res.statusText}`,
        };
      }

      return data;
    } catch (err: any) {
      return {
        ok: false,
        error: err.message || 'Rewrite service connection error',
      };
    }
  }

  /**
   * Detect local Ollama and fetch installed models
   */
  static async fetchOllamaModels(baseUrl = 'http://127.0.0.1:11434'): Promise<{
    available: boolean;
    models: OllamaModel[];
    error?: string;
  }> {
    const cleanUrl = baseUrl.replace('localhost', '127.0.0.1').replace(/\/+$/, '');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`${cleanUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          available: false,
          models: [],
          error: `Ollama returned HTTP status ${res.status}`,
        };
      }

      const data = await res.json();
      const models: OllamaModel[] = Array.isArray(data.models) ? data.models : [];
      return {
        available: models.length > 0,
        models,
      };
    } catch (err: any) {
      return {
        available: false,
        models: [],
        error: err.name === 'AbortError' ? 'Ollama connection timed out' : 'Ollama is not running locally',
      };
    }
  }
}

export const api = new CleanerApi();
