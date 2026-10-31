import { SupportedExtension } from '../types';

export const SUPPORTED_EXTENSIONS: readonly string[] = [
  'docx',
  'pdf',
  'odt',
  'html',
  'htm',
  'md',
  'markdown',
  'txt',
];

export const STRUCTURED_DOCUMENT_EXTENSIONS: readonly string[] = [
  'docx',
  'pdf',
  'odt',
];

export const STRICTLY_FORBIDDEN_EXTENSIONS: readonly string[] = [
  'png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'tiff',
  'mp4', 'mp3', 'wav', 'mkv', 'avi', 'mov', 'flac',
  'pptx', 'xlsx', 'epub', 'zip', 'tar', 'gz', '7z',
];

export const UNSUPPORTED_ERROR_MESSAGE =
  'This file type is not supported. Only DOCX, PDF, ODT, HTML, Markdown, and TXT are allowed.';

export interface ValidationResult {
  valid: boolean;
  extension: string;
  isStructuredDoc: boolean;
  error?: string;
}

export function extractExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

export function validateFile(filename: string): ValidationResult {
  const ext = extractExtension(filename);
  if (!ext) {
    return {
      valid: false,
      extension: '',
      isStructuredDoc: false,
      error: UNSUPPORTED_ERROR_MESSAGE,
    };
  }

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      extension: ext,
      isStructuredDoc: false,
      error: UNSUPPORTED_ERROR_MESSAGE,
    };
  }

  return {
    valid: true,
    extension: ext,
    isStructuredDoc: STRUCTURED_DOCUMENT_EXTENSIONS.includes(ext),
  };
}

export function getCleanedFilename(originalName: string): string {
  const lastDotIndex = originalName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${originalName}.cleaned`;
  }
  const baseName = originalName.substring(0, lastDotIndex);
  const ext = originalName.substring(lastDotIndex);
  return `${baseName}.cleaned${ext}`;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
