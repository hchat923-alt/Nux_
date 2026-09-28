import { compressAndEncodeImage, formatFileSize } from './imageUtils';
import { FileAttachment } from '../types';

export { formatFileSize };

// Disallowed archive and executable formats
const UNSUPPORTED_EXTENSIONS = new Set([
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'bz2',
  'xz',
  'iso',
  'exe',
  'dll',
  'bin',
  'dmg',
  'apk',
  'msi',
  'bat',
  'cmd',
  'vbs',
  'scr',
  'sys',
  'dylib',
  'so',
]);

const CODE_EXTENSIONS = new Set([
  'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'cs', 'go', 'rs',
  'php', 'rb', 'swift', 'kt', 'kts', 'scala', 'sh', 'bash', 'zsh', 'fish', 'sql', 'html',
  'htm', 'css', 'scss', 'sass', 'less', 'json', 'json5', 'yaml', 'yml', 'xml', 'csv', 'tsv',
  'env', 'toml', 'ini', 'cfg', 'conf', 'log', 'md', 'markdown', 'mdown', 'mkd', 'txt', 'text', 'rtf',
  'rst', 'tex', 'latex', 'vue', 'svelte', 'astro', 'graphql', 'gql', 'prisma', 'dockerfile', 'makefile',
]);

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm']);

export interface ProcessFileResult {
  attachment?: FileAttachment;
  error?: string;
}

/**
 * Checks if a file is supported and converts it into a standardized FileAttachment
 */
export async function processFile(file: File): Promise<ProcessFileResult> {
  const extension = (file.name.split('.').pop() || '').toLowerCase();

  // 1. Check for unsupported archive / binary executable formats
  if (UNSUPPORTED_EXTENSIONS.has(extension)) {
    return {
      error: `صيغة الملف (${file.name}) غير مدعومة (ملفات الأرشيف والضغط مثل .zip و .rar والملفات التنفيذية .exe غير مدعومة). يرجى إرفاق ملفات نصية، أكواد، مستندات PDF، أو صور/صوتيات.`,
    };
  }

  // Max size limit: 20MB
  if (file.size > 20 * 1024 * 1024) {
    return {
      error: `حجم الملف (${file.name}) كبير جداً (${formatFileSize(file.size)}). الحد الأقصى المسموح به هو 20 ميغابايت.`,
    };
  }

  const mime = file.type || '';
  const isImage = mime.startsWith('image/') || IMAGE_EXTENSIONS.has(extension);
  const isPdf = mime === 'application/pdf' || extension === 'pdf';
  const isAudio = mime.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension);
  const isCodeOrText =
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('xml') ||
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    CODE_EXTENSIONS.has(extension);

  let fileCategory: FileAttachment['fileCategory'] = 'document';
  if (isImage) fileCategory = 'image';
  else if (isPdf) fileCategory = 'pdf';
  else if (isAudio) fileCategory = 'audio';
  else if (isCodeOrText) fileCategory = 'code';

  try {
    let dataUrl = '';
    let textContent: string | undefined;

    if (isImage) {
      // Compress and optimize image
      dataUrl = await compressAndEncodeImage(file, 1600, 0.85);
    } else if (isCodeOrText) {
      // Read directly as text
      textContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file, 'utf-8');
      });

      // Also create base64 for download
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    } else {
      // Read as Data URL (PDF, Audio, Documents)
      dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });

      // If file is not PDF/Audio and smaller than 5MB, attempt to read text content as well
      if (!isPdf && !isAudio && file.size < 5 * 1024 * 1024) {
        try {
          const rawText = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file, 'utf-8');
          });
          // Check if looks like valid text (no excessive null/control characters)
          if (rawText && !/[\x00-\x08\x0E-\x1F]/.test(rawText.slice(0, 1000))) {
            textContent = rawText;
          }
        } catch {
          // Ignore binary read failure
        }
      }
    }

    const attachment: FileAttachment = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      size: file.size,
      type: file.type || `application/${extension || 'octet-stream'}`,
      data: dataUrl,
      fileCategory,
      textContent,
    };

    return { attachment };
  } catch (err: any) {
    return {
      error: `حدث خطأ أثناء قراءة الملف (${file.name}): ${err?.message || 'خطأ غير معروف'}`,
    };
  }
}
