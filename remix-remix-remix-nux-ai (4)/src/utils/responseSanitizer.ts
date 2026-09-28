/**
 * Response Sanitizer Utility
 * Strips raw model leaks, internal tool_calls JSON blobs, and reasoning dumps
 * so the user always sees clean, concise language output.
 */

export function sanitizeAiResponse(rawText: string, userLanguage: 'ar' | 'en' = 'ar'): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let clean = rawText.trim();

  // Try parsing if string starts with JSON object delimiter
  if ((clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))) {
    try {
      const parsed = JSON.parse(clean);

      // Extract content string if present
      if (parsed.content && typeof parsed.content === 'string' && parsed.content.trim()) {
        return parsed.content.trim();
      }

      // If reasoning exists, extract human-readable reasoning
      if (parsed.reasoning && typeof parsed.reasoning === 'string' && parsed.reasoning.trim()) {
        return parsed.reasoning.trim();
      }

      // If raw tool_calls without answer, return empty to avoid freezing UI with placeholder
      if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
        return '';
      }
    } catch (_) {}
  }

  // Regex replacement for inline raw JSON dumps
  clean = clean.replace(/\{"role"\s*:\s*"assistant"\s*,\s*"reasoning"[\s\S]*?"tool_calls"[\s\S]*?\}\}\]\}/g, '');
  clean = clean.replace(/\{"tool_calls"\s*:\s*\[[\s\S]*?\]\}/g, '');
  clean = clean.replace(/\{"function_call"\s*:\s*\{[\s\S]*?\}\}/g, '');

  return clean.trim();
}
