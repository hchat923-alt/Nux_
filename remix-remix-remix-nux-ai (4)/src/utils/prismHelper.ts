import Prism from 'prismjs';

// Common languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  md: 'markdown',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  rs: 'rust',
  cs: 'csharp',
  dockerfile: 'bash',
};

export function highlightCode(code: string, rawLanguage?: string): string {
  const langKey = (rawLanguage || 'text').trim().toLowerCase();
  const resolvedLang = LANGUAGE_ALIASES[langKey] || langKey;

  if (Prism.languages[resolvedLang]) {
    try {
      return Prism.highlight(code, Prism.languages[resolvedLang], resolvedLang);
    } catch {
      // fallback
    }
  }

  // fallback to escaping html
  return escapeHtml(code);
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
