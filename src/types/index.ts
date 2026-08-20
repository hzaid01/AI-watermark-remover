export type SupportedExtension = 'docx' | 'pdf' | 'odt' | 'html' | 'htm' | 'md' | 'markdown' | 'txt';

export interface CleanStats {
  input_length?: number;
  output_length?: number;
  removed_count?: number;
  replaced_count?: number;
  removed?: Record<string, number>;
  replaced?: Record<string, number>;
  nfkc_changed?: boolean;
}

export interface CleanReport {
  kind: 'text' | 'image' | 'container' | 'av';
  format?: string;
  actions?: string[];
  stats?: CleanStats;
  length?: number;
  bytes_in?: number;
  bytes_out?: number;
  still_has_c2pa?: boolean;
  still_has_ai_metadata?: boolean;
  post_findings?: string[];
  meta?: {
    format?: string;
    degraded?: boolean;
    mode?: string;
  };
  text_detectors?: Record<string, any>;
}

export interface CleanApiResponse {
  ok: boolean;
  kind?: 'text' | 'container' | 'image' | 'av';
  cleaned?: string; // base64
  report?: CleanReport;
  error?: string;
}

export interface RewriteApiResponse {
  ok: boolean;
  rewritten?: string;
  info?: {
    backend?: string;
    model?: string;
    attempts_made?: number;
    evaluator?: string;
  };
  error?: string;
}

export interface OllamaModel {
  name: string;
  model: string;
  size?: number;
  digest?: string;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface AppSettings {
  outputFolder: string; // '' means same folder as input
  preserveOriginals: boolean;
  ollamaBaseUrl: string;
  selectedOllamaModel: string;
  backendPort: number;
}

export interface SystemToolsStatus {
  qpdf: boolean;
  exiftool: boolean;
}
