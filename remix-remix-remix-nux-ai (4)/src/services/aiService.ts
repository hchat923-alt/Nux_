import { Message } from '../types';
import {
  getStoredApiKeys,
  callGeminiDirect,
  callDeepSeekDirect,
  callOpenRouterDirect,
  callGroqDirect,
  callSambaNovaDirect,
  callPollinationsDirect,
  callGratisfyDirect,
  callHuggingFaceDirect,
} from './apiKeys';
import { SmoothStreamer } from '../utils/smoothStreamer';
import { callOllamaChat } from './ollamaService';
import { getIntelligencePersona, getFullSystemInstruction } from './claudePersona';
import { translatePromptToEnglish, stripArabicImagePrefixes } from '../utils/imageTranslator';
import { sanitizeAiResponse } from '../utils/responseSanitizer';
import { getDeepThinkingEnabled, ensureDeepThinkingInResponse } from './deepThinkingService';
import { ensurePuterConnected } from './puterService';

declare global {
  interface Window {
    puter?: any;
  }
}

export interface StreamCallbacks {
  onChunk: (chunk: string, fullText?: string) => void;
  onError: (error: Error) => void;
  onComplete: (fullText: string) => void;
}

export interface SendChatOptions {
  messages: Array<{
    role: string;
    content: string;
    images?: string[];
    attachments?: any[];
    [key: string]: any;
  }>;
  modelId: string;
  onChunk?: (chunk: string, fullText?: string) => void;
  onError?: (error: Error) => void;
  onComplete?: (fullText: string) => void;
  signal?: AbortSignal;
}

/**
 * Automatically substitute any model that has no credit with DeepSeek or Gemini
 */
export async function executeFallbackModel(
  formattedHistory: Array<{ role: string; content: string; images?: string[]; attachments?: any[] }>,
  originalModelId: string,
  onChunk?: (chunk: string, fullText?: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const userKeys = getStoredApiKeys();
  const cleanOriginalName = originalModelId.toLowerCase().includes('claude')
    ? 'Claude'
    : originalModelId.toLowerCase().includes('gpt')
    ? 'ChatGPT'
    : originalModelId;

  // 1. If user configured DeepSeek key and no images/attachments (DeepSeek text-only)
  const hasMedia = formattedHistory.some(
    (m) =>
      (Array.isArray(m.images) && m.images.length > 0) ||
      (Array.isArray(m.attachments) && m.attachments.length > 0)
  );
  if (userKeys.deepseekKey && !hasMedia) {
    try {
      const reply = await callDeepSeekDirect(
        userKeys.deepseekKey,
        formattedHistory,
        onChunk,
        signal,
        originalModelId
      );
      if (reply && reply.trim()) {
        return reply.trim();
      }
    } catch (dsErr) {
      console.warn('Auto fallback to DeepSeek failed, attempting Gemini:', dsErr);
    }
  }

  // 2. Try Gemini (via full-stack backend /api/gemini/chat or user key)
  try {
    const reply = await callGeminiDirect(
      userKeys.geminiKey || '',
      'gemini-3.1-flash-lite',
      formattedHistory,
      onChunk,
      signal
    );
    if (reply && reply.trim()) {
      return reply.trim();
    }
  } catch (geminiErr) {
    console.warn('Auto fallback to Gemini failed:', geminiErr);
  }

  // 3. Ultimate Free Fallback: Pollinations AI (openai-fast)
  try {
    const reply = await callPollinationsDirect(
      'openai-fast',
      formattedHistory,
      onChunk
    );
    if (reply && reply.trim()) {
      return reply.trim();
    }
  } catch (pollinationsErr) {
    console.warn('Auto fallback to Pollinations failed:', pollinationsErr);
  }

  throw new Error('انتهت حصة النموذج الحالي، وتم تفعيل جميع بدائل الاتصال المتاحة. يرجى الانتظار قليلاً أو إدخال مفتاح API في الإعدادات.');
}

async function executeRawChatMessage(
  modelId: string,
  formattedHistory: Array<{ role: string; content: string; images?: string[]; attachments?: any[] }>,
  onChunk?: (chunk: string, fullText?: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const userKeys = getStoredApiKeys();
  const hasMedia = formattedHistory.some(
    (m) =>
      (Array.isArray(m.images) && m.images.length > 0) ||
      (Array.isArray(m.attachments) && m.attachments.length > 0)
  );

  // If message contains attached files or images: route directly to Gemini Multimodal engine
  if (hasMedia) {
    try {
      const geminiVisionModel = modelId.toLowerCase().includes('gemini')
        ? modelId
        : 'gemini-3.1-flash-lite';
      const reply = await callGeminiDirect(
        userKeys.geminiKey || '',
        geminiVisionModel,
        formattedHistory,
        onChunk,
        signal
      );
      return reply;
    } catch (geminiImgErr: any) {
      if (signal?.aborted) throw geminiImgErr;
      console.warn('Direct Gemini File analysis failed with chosen model, attempting fallback:', geminiImgErr);
      try {
        return await callGeminiDirect(
          userKeys.geminiKey || '',
          'gemini-3.1-flash-lite',
          formattedHistory,
          onChunk,
          signal
        );
      } catch (fallbackImgErr: any) {
        // Ultimate fallback to pollinations if media not required or text part
        try {
          return await callPollinationsDirect('openai-fast', formattedHistory, onChunk);
        } catch (_) {
          throw fallbackImgErr;
        }
      }
    }
  }

  // 1. If an Ollama local model is selected (e.g. ollama:qwen2.5:3b or provider Ollama)
  if (modelId.startsWith('ollama:')) {
    try {
      const reply = await callOllamaChat(
        modelId,
        formattedHistory,
        onChunk,
        signal
      );
      return reply;
    } catch (ollamaErr: any) {
      if (signal?.aborted) throw ollamaErr;
      console.warn('Ollama chat execution failed:', ollamaErr);
      throw new Error(
        `تعذر الاتصال بـ Ollama محلياً (${modelId.replace(/^ollama:/, '')}): ${
          ollamaErr?.message || 'تأكد من تشغيل Ollama على جهازك (ollama serve) وأن النموذج تم تنزيله.'
        }`
      );
    }
  }

  // If Gemini model is selected (or user provided custom key): route directly through full-stack Gemini service
  if (modelId.toLowerCase().includes('gemini') || modelId.toLowerCase().includes('google')) {
    try {
      const reply = await callGeminiDirect(
        userKeys.geminiKey || '',
        modelId,
        formattedHistory,
        onChunk,
        signal
      );
      return reply;
    } catch (e: any) {
      if (signal?.aborted) throw e;
      console.warn('Direct Gemini API call failed with primary model, trying fallback:', e);
      try {
        const fallbackReply = await callGeminiDirect(
          userKeys.geminiKey || '',
          'gemini-3.1-flash-lite',
          formattedHistory,
          onChunk,
          signal
        );
        return fallbackReply;
      } catch (fallbackErr: any) {
        if (signal?.aborted) throw fallbackErr;
        console.warn('Gemini fallback failed, auto-routing to Pollinations free AI:', fallbackErr);
        try {
          const pollinationsReply = await callPollinationsDirect(
            'openai-fast',
            formattedHistory,
            onChunk
          );
          if (pollinationsReply && pollinationsReply.trim()) {
            return pollinationsReply.trim();
          }
        } catch (polErr) {
          console.warn('Pollinations automatic fallback failed:', polErr);
        }
        throw new Error(fallbackErr?.message || e?.message || 'فشل الاتصال بـ Gemini API');
      }
    }
  }

  // If user configured a direct DeepSeek API key and selected a DeepSeek model
  if (userKeys.deepseekKey && modelId.toLowerCase().includes('deepseek')) {
    try {
      const reply = await callDeepSeekDirect(
        userKeys.deepseekKey,
        formattedHistory,
        onChunk,
        signal,
        modelId
      );
      return reply;
    } catch (e: any) {
      if (signal?.aborted) throw e;
      console.warn('Direct DeepSeek API call failed:', e);
      // If the error is due to authentication or balance, let the user know directly
      const errLower = (e?.message || '').toLowerCase();
      if (
        errLower.includes('authentication') ||
        errLower.includes('balance') ||
        errLower.includes('invalid') ||
        errLower.includes('401') ||
        errLower.includes('402')
      ) {
        throw new Error(`تعذر استخدام DeepSeek: ${e.message} (تأكد من شحن رصيد الحساب أو صحة المفتاح في الإعدادات)`);
      }
    }
  }

  // If user selected an OpenRouter model
  if (modelId.startsWith('openrouter:')) {
    if (userKeys.openrouterKey) {
      try {
        const reply = await callOpenRouterDirect(
          userKeys.openrouterKey,
          modelId,
          formattedHistory,
          onChunk
        );
        if (reply && reply.trim()) {
          return reply;
        }
      } catch (e: any) {
        console.warn('Direct OpenRouter call failed:', e);
        throw new Error(`خطأ من OpenRouter API: ${e?.message || 'تعذر الحصول على إجابة من النموذج المختار عبر OpenRouter.'}`);
      }
    }
    return executeFallbackModel(formattedHistory, modelId, onChunk, signal);
  }

  // If user selected a Groq model
  if (modelId.startsWith('groq:')) {
    if (userKeys.groqKey) {
      try {
        const reply = await callGroqDirect(
          userKeys.groqKey,
          modelId,
          formattedHistory,
          onChunk
        );
        if (reply && reply.trim()) {
          return reply;
        }
      } catch (e: any) {
        console.warn('Direct Groq call failed:', e);
        throw new Error(`خطأ من Groq API: ${e?.message || 'تعذر الحصول على إجابة من النموذج المختار عبر Groq.'}`);
      }
    }
    return executeFallbackModel(formattedHistory, modelId, onChunk, signal);
  }

  // If user selected a SambaNova model
  if (modelId.startsWith('sambanova:')) {
    try {
      const reply = await callSambaNovaDirect(
        (userKeys.sambanovaKey || '').trim(),
        modelId,
        formattedHistory,
        onChunk
      );
      if (reply && reply.trim()) {
        return reply;
      }
    } catch (e: any) {
      console.warn('SambaNova execution failed, attempting fallback model:', e);
    }
    return executeFallbackModel(formattedHistory, modelId, onChunk, signal);
  }

  // If user selected a Pollinations model
  if (modelId.startsWith('pollinations:')) {
    try {
      const reply = await callPollinationsDirect(
        modelId,
        formattedHistory,
        onChunk
      );
      if (reply && reply.trim()) {
        return reply;
      }
    } catch (e: any) {
      if (signal?.aborted) throw e;
      console.warn('Direct Pollinations call failed, routing to ultra-fast fallback engine:', e);
    }
    return executeFallbackModel(formattedHistory, modelId, onChunk, signal);
  }

  // If user selected a Gratisfy model
  if (modelId.startsWith('gratisfy:')) {
    try {
      const reply = await callGratisfyDirect(
        (userKeys.gratisfyKey || '').trim(),
        modelId,
        formattedHistory,
        onChunk,
        signal
      );
      if (reply && reply.trim()) {
        return reply;
      }
    } catch (e: any) {
      if (signal?.aborted) throw e;
      if (e?.message && (e.message.includes('Plus') || e.message.includes('مفتاح'))) {
        throw e;
      }
      console.warn('Gratisfy execution failed, routing to fallback engine:', e);
    }
    return executeFallbackModel(formattedHistory, modelId, onChunk, signal);
  }

  // If user selected a Hugging Face model
  if (modelId.startsWith('hf:') || modelId.startsWith('huggingface:')) {
    if (userKeys.huggingfaceKey) {
      try {
        const reply = await callHuggingFaceDirect(
          userKeys.huggingfaceKey,
          modelId,
          formattedHistory,
          onChunk
        );
        if (reply && reply.trim()) {
          return reply;
        }
      } catch (e: any) {
        console.warn('Direct Hugging Face call failed:', e);
        throw new Error(`خطأ من Hugging Face API: ${e?.message || 'تعذر الحصول على إجابة من نموذج Hugging Face. تأكد من صلاحية Token للـ Inference.'}`);
      }
    }
    return executeFallbackModel(formattedHistory, modelId, onChunk, signal);
  }

  const isPuterExhausted =
    typeof window !== 'undefined' &&
    sessionStorage.getItem('puter_quota_exhausted') === 'true';

  // If Puter quota is already known to be exhausted, immediately auto-swap to DeepSeek or Gemini
  if (isPuterExhausted && !modelId.toLowerCase().includes('gemini') && !modelId.toLowerCase().includes('deepseek')) {
    console.info(`Puter quota exhausted. Auto-routing ${modelId} to DeepSeek / Gemini...`);
    return executeFallbackModel(formattedHistory, modelId, onChunk, signal);
  }

  if (typeof window !== 'undefined' && (window.puter || await ensurePuterConnected())) {
    // 1. Resolve available models dynamically from Puter
    let availableModels: any[] = [];
    try {
      if (typeof window.puter?.ai?.listModels === 'function') {
        const list = await window.puter.ai.listModels();
        if (Array.isArray(list)) {
          availableModels = list;
        }
      }
    } catch (e) {
      console.warn('Could not retrieve models list, using mapping fallback:', e);
    }

    // 2. Determine best model name
    const resolvedModel = resolveModelCandidate(modelId, availableModels);

    const performChat = async (modelToUse: string, msgHistory: any) => {
      if (onChunk) {
        try {
          const responseStream = await window.puter.ai.chat(msgHistory, {
            model: modelToUse,
            stream: true,
          });

          let fullText = '';
          if (responseStream && typeof responseStream[Symbol.asyncIterator] === 'function') {
            for await (const part of responseStream) {
              const piece = part?.text || part?.message?.content?.[0]?.text || '';
              if (piece) {
                fullText += piece;
                onChunk(piece, fullText);
              }
            }
            if (fullText.trim()) {
              return fullText;
            }
          }
        } catch (streamErr: any) {
          console.warn(`Streaming failed for ${modelToUse}, trying non-stream...`, streamErr);
        }
      }

      // Non-streaming call
      const response = await window.puter.ai.chat(msgHistory, { model: modelToUse });
      let reply = '';
      if (typeof response === 'string') {
        reply = response;
      } else if (response?.message?.content) {
        if (Array.isArray(response.message.content)) {
          reply = response.message.content.map((c: any) => c.text || '').join('');
        } else if (typeof response.message.content === 'string') {
          reply = response.message.content;
        }
      } else if (response?.text) {
        reply = response.text;
      } else {
        reply = JSON.stringify(response);
      }
      if (reply && onChunk) {
        onChunk(reply, reply);
      }
      return reply;
    };

    // Candidates to attempt: attempt requested model then 1 solid fallback
    const candidates = [resolvedModel, 'claude-sonnet-4-5-20250929'];
    const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));

    for (const candidate of uniqueCandidates) {
      try {
        // Enforce 28-second timeout on Puter calls so model has ample time to generate
        const chatPromise = performChat(candidate, formattedHistory);
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Puter request timed out after 28s')), 28000)
        );

        const reply = await Promise.race([chatPromise, timeoutPromise]);
        if (reply && reply.trim()) {
          return reply;
        }
      } catch (err: any) {
        const errMsg = String(err?.message || err || '').toLowerCase();
        console.warn(`Puter model ${candidate} issue:`, errMsg);

        // ONLY mark quota exhausted if the provider explicitly returned quota/credit limits
        if (errMsg.includes('quota') || errMsg.includes('credit') || errMsg.includes('rate limit') || errMsg.includes('429')) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('puter_quota_exhausted', 'true');
          }
          break;
        }
      }
    }

    // Automatically substitute with server/Gemini engine if Puter couldn't reply
    return executeFallbackModel(formattedHistory, modelId, onChunk, signal);
  }

  // Fallback if Puter is unavailable
  return executeFallbackModel(formattedHistory, modelId, onChunk, signal);
}

export async function sendChatMessage(
  messagesOrOptions: Message[] | SendChatOptions,
  modelIdArg?: string,
  callbacksArg?: StreamCallbacks
): Promise<string> {
  let messages: Array<{ role?: string; sender?: string; content: string }>;
  let modelId: string;
  let callbacks: StreamCallbacks | undefined;
  let signal: AbortSignal | undefined;

  if (Array.isArray(messagesOrOptions)) {
    messages = messagesOrOptions;
    modelId = modelIdArg || 'gemini-flash-lite-latest';
    callbacks = callbacksArg;
  } else {
    messages = messagesOrOptions.messages;
    modelId = messagesOrOptions.modelId;
    signal = messagesOrOptions.signal;
    callbacks = {
      onChunk: messagesOrOptions.onChunk || (() => {}),
      onError: messagesOrOptions.onError || (() => {}),
      onComplete: messagesOrOptions.onComplete || (() => {}),
    };
  }

  const formattedHistory = (Array.isArray(messages) ? messages : []).map((m: any) => ({
    role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
    content: m.content,
    images: Array.isArray(m.images) ? m.images : undefined,
    attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
  }));

  const userOnChunk = callbacks?.onChunk;
  const streamer = userOnChunk
    ? new SmoothStreamer({
        onEmit: (chunk, fullText) => {
          if (!signal?.aborted) {
            userOnChunk(chunk, fullText);
          }
        },
        signal,
      })
    : null;

  const internalOnChunk = streamer
    ? (chunk: string, fullText?: string) => {
        if (fullText !== undefined) {
          streamer.push(fullText);
        } else if (chunk) {
          streamer.append(chunk);
        }
      }
    : undefined;

  // Autonomous Image Generation Command Handler (/img or gemini image models)
  const isGeminiImageModel =
    modelId === 'gemini-3.1-flash-image' ||
    modelId === 'gemini-3.1-flash-lite-image' ||
    modelId === 'gemini-flash-image' ||
    modelId.includes('flash-image') ||
    modelId.includes('lite-image');
  const lastMsgForImage = [...formattedHistory].reverse().find((m) => m.role === 'user');
  const userContent = lastMsgForImage && typeof lastMsgForImage.content === 'string' ? lastMsgForImage.content.trim() : '';

  if (isGeminiImageModel || userContent.toLowerCase().startsWith('/img')) {
    const rawImgPrompt = userContent.replace(/^\/img\s*/i, '').trim();
    if (!rawImgPrompt) {
      const guideText = `🎨 **طريقة استخدام أداة إنشاء الصور التلقائية (Google Gemini Nano Banana 2 / /img):**\n\nيرجى كتابة وصف الصورة التي ترغب في إنشائها بعد الأمر مباشرة.\n\n*أمثلة:*
• \`/img أسد أسطوري شامخ في غابة ذهبية بحجم 4k\`
• \`/img A futuristic cybernetic city at twilight, cinematic lighting 8k\`
• \`/img سيارة رياضية فاخرة تسير في صحراء ذهبية\``;
      if (internalOnChunk) internalOnChunk(guideText, guideText);
      if (callbacks?.onComplete) callbacks.onComplete(guideText);
      return guideText;
    }

    const cleanSubject = stripArabicImagePrefixes(rawImgPrompt) || rawImgPrompt;
    let englishPrompt = await translatePromptToEnglish(rawImgPrompt);

    // Apply Anthropic Visual Art Direction Style if Claude Persona mode is active
    if (getIntelligencePersona() === 'claude') {
      englishPrompt += `, Anthropic visual art director photography style, physical foundation materials like aged paper, natural leather, linen or raw canvas, tactile analog texture with grain, warm neutral palette (cream, tan, off-white, muted coral, sage green, deep charcoal accents), no neon or high saturation, layered physical elements, macro close-up photography, natural lighting, handmade artisan aesthetic, quiet intelligence, purposeful minimalism`;
    }

    const userKeys = getStoredApiKeys();
    const targetGoogleModel = modelId === 'gemini-3.1-flash-lite-image' ? 'gemini-3.1-flash-lite-image' : 'gemini-3.1-flash-image';

    // Attempt official server-side Google Gemini Image API call first
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userKeys.geminiKey) {
        headers['x-gemini-api-key'] = userKeys.geminiKey;
      }
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
      const apiRes = await fetch(`${baseUrl}/api/gemini/generate-image`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: englishPrompt, model: targetGoogleModel }),
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.imageUrl) {
          const responseText = `![${cleanSubject}](${data.imageUrl})`;
          if (internalOnChunk) internalOnChunk(responseText, responseText);
          if (callbacks?.onComplete) callbacks.onComplete(responseText);
          return responseText;
        }
      }
    } catch (googleApiErr) {
      console.warn('Direct Google Gemini Image API call failed, using fallback:', googleApiErr);
    }

    // High-reliability Fallback via Pollinations Gemini Route
    const seed = Math.floor(Math.random() * 900000) + 100000;
    const encodedPrompt = encodeURIComponent(englishPrompt);
    const imgUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=gemini&width=1024&height=1024&seed=${seed}&nologo=true`;
    const responseText = `![${cleanSubject}](${imgUrl})`;

    if (internalOnChunk) internalOnChunk(responseText, responseText);
    if (callbacks?.onComplete) callbacks.onComplete(responseText);
    return responseText;
  }

  const isDeepThinkingOn = getDeepThinkingEnabled();
  const lastUserMsg = [...formattedHistory].reverse().find((m) => m.role === 'user');
  const userText = (lastUserMsg && typeof lastUserMsg.content === 'string') ? lastUserMsg.content : '';

  let effectiveHistory = formattedHistory;
  if (isDeepThinkingOn) {
    effectiveHistory = formattedHistory.map((m, idx) => {
      if (idx === formattedHistory.length - 1 && m.role === 'user') {
        const thoughtDirective = `\n\n[MANDATORY THINKING DIRECTIVE: You MUST begin your response strictly with <thought>...step-by-step reasoning...</thought> before answering. Never skip <thought>.]`;
        return {
          ...m,
          content: `${m.content}${thoughtDirective}`,
        };
      }
      return m;
    });
  }

  const nonSystemHistory = effectiveHistory.filter((m) => m.role !== 'system');
  const fullInstruction = getFullSystemInstruction();
  const rawWithSystem = fullInstruction
    ? [{ role: 'system', content: fullInstruction }, ...nonSystemHistory]
    : nonSystemHistory;

  try {
    const rawResult = await executeRawChatMessage(
      modelId,
      rawWithSystem,
      internalOnChunk,
      signal
    );

    let finalResult = sanitizeAiResponse(rawResult);
    if (isDeepThinkingOn) {
      finalResult = ensureDeepThinkingInResponse(finalResult, userText);
    }
    if (streamer) {
      finalResult = await streamer.end(finalResult);
    }
    if (isDeepThinkingOn) {
      finalResult = ensureDeepThinkingInResponse(finalResult, userText);
    }
    finalResult = sanitizeAiResponse(finalResult);
    if (callbacks?.onComplete) {
      callbacks.onComplete(finalResult);
    }
    return finalResult;
  } catch (err: any) {
    if (streamer) {
      streamer.flush();
    }
    if (callbacks?.onError) {
      callbacks.onError(err);
    }
    throw err;
  }
}

/**
 * Dual-Model Collaborative Dialogue / Debate
 * Combines two distinct AI models to analyze, critique, and produce an error-free synthesis.
 */
export interface DualModelDebateOptions {
  modelAId: string;
  modelBId: string;
  modelAName: string;
  modelBName: string;
  userQuery: string;
  chatHistory?: Array<{ role: string; content: string; images?: string[]; attachments?: any[] }>;
  attachments?: any[];
  images?: string[];
  onStageUpdate?: (stage: 'stage1' | 'stage2' | 'synthesis', text: string) => void;
  onChunk?: (text: string) => void;
  language?: 'ar' | 'en';
}

export async function sendDualModelDebate({
  modelAId,
  modelBId,
  modelAName,
  modelBName,
  userQuery,
  chatHistory = [],
  attachments,
  images,
  onStageUpdate,
  onChunk,
  language = 'ar',
}: DualModelDebateOptions): Promise<string> {
  const isEn = language === 'en';

  // Extract attached files text context if any code/text/document files are attached
  let attachedFilesText = '';
  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const f of attachments) {
      if (f.textContent && typeof f.textContent === 'string') {
        attachedFilesText += `\n\n📄 [${isEn ? 'Attached File' : 'ملف مرفق'}: ${f.name}]\n\`\`\`\n${f.textContent}\n\`\`\`\n`;
      }
    }
  }

  // Phase 1: Model A analyzes and proposes initial thorough solution
  if (onStageUpdate) {
    onStageUpdate(
      'stage1',
      isEn ? `Analyzing query with ${modelAName}...` : `جاري تحليل المسألة بواسطة ${modelAName}...`
    );
  }

  const activePersona = getIntelligencePersona();
  const isDeepThinking = getDeepThinkingEnabled();

  // Determine display role labels using the user's selected model names
  const personaPrimaryName = modelAName || (isEn ? 'Primary Model' : 'النموذج الأول');
  const personaAuditorName = modelBName || (isEn ? 'Secondary Auditor' : 'النموذج الثاني المراجع');

  // Construct persona and deep thinking directive for both collaborative models
  let personaInstruction = '';
  if (activePersona === 'claude') {
    personaInstruction = isEn
      ? `\n[Claude Intelligence Persona - Strict Identity Immersion]:
- You embody the intelligence, values, and reasoning depth of Claude (Anthropic).
- NEVER mention "Gemini", "Google", "Google AI", "Gemini consensus", or meta-discussions about simulating models in your thoughts or responses.
- Think and analyze with uncompromising intellectual honesty, authenticity, and directness.
- Deliver pristine, robust, and zero-defect code/solutions without fluff or sycophancy.
- Document your step-by-step internal reasoning inside <thought>...</thought> tags at the beginning of your response.`
      : `\n[توجيه محاكاة كلود - Claude Intelligence Persona]:
- أنت تمثل فكر ونزاهة وذكاء واستدلال Claude Opus بأعلى درجات الدقة والعمق.
- يُحظر تماماً ذكر أي أسماء مثل Gemini أو Google أو عبارات مثل "Gemini consensus" أو الحديث عن محاكاة النماذج داخل وسم التفكير <thought>...</thought> أو في ردك.
- فكر وحلل بعمق ونزاهة فكرية مطلقة مع صدق تام ومباشر وتجنب المجاملات الزائفة.
- قدم حلولاً متقنة وبرمجيات نظيفة وخالية تماماً من العيوب والثغرات.
- اكتب مسار استدلالك وتحليلك الداخلي الدقيق للمسألة داخل وسم <thought>...</thought> في بداية الرد ثم قدم تحليلك الكامل.`;
  } else if (activePersona === 'chatgpt') {
    personaInstruction = isEn
      ? `\n[ChatGPT Intelligence Persona]:
- Provide structured, warm, direct, and actionable solutions with clear step-by-step guidance.
- Document your step-by-step internal reasoning inside <thought>...</thought> tags at the beginning of your response.`
      : `\n[توجيه محاكاة تشات جي بي تي - ChatGPT Intelligence Persona]:
- قدم إجابة مباشرة ومرتبة ومنظمة ودافئة وعملية مع حلول واضحة دون مقدمات مطولة.
- اكتب مسار استدلالك وتحليلك الداخلي الدقيق للمسألة داخل وسم <thought>...</thought> في بداية الرد ثم قدم تحليلك الكامل.`;
  }

  let deepThinkingInstruction = '';
  if (isDeepThinking) {
    deepThinkingInstruction = isEn
      ? `\n[Deep Thinking - Claude Opus 5 Internal Philosophy]:
- Scrutinize all hidden assumptions, complex dimensions, and edge cases.
- Construct rigorous first-principles reasoning and explore corner cases.
- Write your full reasoning process inside <thought>...</thought> tags.`
      : `\n[توجيه التفكير العميق - Claude Opus 5 Deep Thinking Philosophy]:
- تحقق من كافة الفرضيات الخفية والأبعاد المعقدة للمسألة.
- قم ببناء تسلسل استدلالي محكم وتحقق من معالجة جميع الحالات الشاذة والطرفية (Edge Cases).
- وثق كامل مسار تفكيرك الداخلي بدقة داخل وسم <thought>...</thought> في مستهل ردك.`;
  }

  const stage1Prompt = [
    ...chatHistory,
    {
      role: 'user',
      content: isEn
        ? `You are the primary analyst model in a collaborative AI team (${personaPrimaryName}).
User query:
"${userQuery}"
${attachedFilesText}
${personaInstruction}${deepThinkingInstruction}

Task:
Provide a rigorous, comprehensive, and direct solution. If files are provided, analyze and summarize them thoroughly according to the user request. Document your thought process inside <thought>...</thought>.`
        : `أنت النموذج الأول المتخصص في فريق الذكاء الاصطناعي المشترك (${personaPrimaryName}).
سؤال المستخدم:
"${userQuery}"
${attachedFilesText}
${personaInstruction}${deepThinkingInstruction}

المطلوب منك:
قدم تحليلاً دقيقاً وإجابة متكاملة وشاملة ومباشرة. إذا تم إرفاق ملفات، قم بتحليلها وقراءتها وتلخيصها بدقة وفق طلب المستخدم، وإذا كان السؤال برمجياً اكتب الكود الأفضل والأنظف. تأكد من توثيق مسار تفكيرك داخل وسم <thought>...</thought>.`,
      attachments,
      images,
    },
  ];

  let stage1Response = '';
  try {
    stage1Response = await sendChatMessage({
      modelId: modelAId,
      messages: stage1Prompt,
      onChunk: (chunk, fullText) => {
        const textSoFar = fullText || chunk;
        if (onChunk) {
          onChunk(
            isEn
              ? `> **Dual-AI Consensus Session**
> Initial analysis and reasoning in progress by **${personaPrimaryName}**...

---

### Initial Analysis (${personaPrimaryName})
${textSoFar}`
              : `> **جلسة تفكير تشاركي ثنائي (Dual-AI Consensus)**
> جاري التحليل الأولي بواسطة **${personaPrimaryName}**...

---

### التحليل والتفكير الأولي (${personaPrimaryName})
${textSoFar}`
          );
        }
      },
    });
  } catch (errStage1: any) {
    try {
      stage1Response = await sendChatMessage({
        modelId: 'gemini-3.6-flash',
        messages: stage1Prompt,
      });
    } catch (fallbackErr: any) {
      stage1Response = isEn
        ? `[Initial analysis unavailable: ${fallbackErr?.message || errStage1?.message || 'Unknown error'}]`
        : `[تعذر الحصول على التحليل الأولي: ${fallbackErr?.message || errStage1?.message || 'خطأ غير معروف'}]`;
    }
  }

  // Phase 2: Model B critiques, verifies edge cases, and inspects Model A's output
  if (onStageUpdate) {
    onStageUpdate(
      'stage2',
      isEn ? `Verifying and auditing with ${modelBName}...` : `جاري التدقيق والمراجعة بواسطة ${modelBName}...`
    );
  }

  const stage2Prompt = [
    {
      role: 'user',
      content: isEn
        ? `You are the secondary auditor model (${personaAuditorName}) in a collaborative dual-AI team.

Original user query:
"${userQuery}"
${attachedFilesText ? `\nAttached file context:\n${attachedFilesText}` : ''}

Primary model (${personaPrimaryName}) analysis & solution:
"""
${stage1Response}
"""
${personaInstruction}${deepThinkingInstruction}

Your auditing instructions:
1. Rigorously inspect the primary model's output: are there any bugs, omissions, or flawed assumptions? Cross-check with the user query and any attached files.
2. Highlight key strengths and improvements.
3. Document your audit reasoning inside <thought>...</thought> tags.
4. Provide the final, verified, and pristine solution.`
        : `أنت النموذج الثاني (${personaAuditorName}) المراجع والمدقق المتخصص في فريق الذكاء الاصطناعي المشترك.

سؤال المستخدم الأصلي:
"${userQuery}"
${attachedFilesText ? `\nمحتوى الملفات المرفقة للمراجعة:\n${attachedFilesText}` : ''}

إجابة وتحليل النموذج الأول (${personaPrimaryName}):
"""
${stage1Response}
"""
${personaInstruction}${deepThinkingInstruction}

مهمتك التدقيقية:
1. راجع إجابة وتحليل النموذج الأول بدقة متناهية مقارنة بطلب المستخدم والملفات المرفقة: هل هناك أي خطأ برمجي، ثغرة، نقص، أو فرضية خاطئة؟
2. حدد نقاط القوة والتحسينات اللازمة.
3. اكتب مسار تدقيقك واستدلالك الداخلي داخل وسم <thought>...</thought>.
4. قدم الحل النهائي المثالي والموثق والمعتمد بعد المراجعة ليكون شاملاً ودقيقاً وخالياً تماماً من الأخطاء والهلوسة.`,
      attachments,
      images,
    },
  ];

  let stage2Response = '';
  try {
    stage2Response = await sendChatMessage({
      modelId: modelBId,
      messages: stage2Prompt,
      onChunk: (chunk, fullText) => {
        const textSoFar = fullText || chunk;
        if (onChunk) {
          onChunk(
            isEn
              ? `> **Dual-AI Consensus Session**
> Collaborative session between **${modelAName}** (Solution Drafting) and **${modelBName}** (Auditing & Verification).

---

### Initial Analysis by ${personaPrimaryName}
${stage1Response}

---

### Verification & Final Audited Solution by ${personaAuditorName}
${textSoFar}`
              : `> **جلسة تفكير تشاركي ثنائي (Dual-AI Consensus)**
> تم إشراك **${personaPrimaryName}** (التحليل وتوليد الحل) مع **${personaAuditorName}** (التدقيق ومراجعة الأخطاء).

---

### التحليل الأولي بواسطة ${personaPrimaryName}
${stage1Response}

---

### التدقيق والمراجعة والحل المعتمد بواسطة ${personaAuditorName}
${textSoFar}`
          );
        }
      },
    });
  } catch (errStage2: any) {
    try {
      stage2Response = await sendChatMessage({
        modelId: 'gemini-3.6-flash',
        messages: stage2Prompt,
      });
    } catch (fallbackErr: any) {
      stage2Response = isEn
        ? `[Audited review unavailable: ${fallbackErr?.message || errStage2?.message || 'Unknown error'}]`
        : `[تعذر الحصول على التدقيق النهائي: ${fallbackErr?.message || errStage2?.message || 'خطأ غير معروف'}]`;
    }
  }

  // Combine into a beautifully formatted multi-agent report
  const combinedReport = isEn
    ? `> **Dual-AI Consensus Session**
> **${personaPrimaryName}** (Initial Solution) and **${personaAuditorName}** (Auditing & Refinement) worked collaboratively to guarantee maximum accuracy and eliminate errors.

---

### Initial Analysis by ${personaPrimaryName}
${stage1Response}

---

### Verification & Final Audited Solution by ${personaAuditorName}
${stage2Response}`
    : `> **جلسة تفكير تشاركي ثنائي (Dual-AI Consensus)**
> تم إشراك **${personaPrimaryName}** (التحليل وتوليد الحل) مع **${personaAuditorName}** (التدقيق ومراجعة الأخطاء) لتقليل نسبة الخطأ إلى الصفر وضمان أعلى جودة وإتقان.

---

### التحليل الأولي بواسطة ${personaPrimaryName}
${stage1Response}

---

### التدقيق والمراجعة والحل المعتمد بواسطة ${personaAuditorName}
${stage2Response}`;

  if (onChunk) onChunk(combinedReport);
  return combinedReport;
}

/**
 * Maps the selected model ID to the best matching model in Puter's available list.
 */
function resolveModelCandidate(modelId: string, availableModels: any[]): string {
  // If we have available models from Puter, look for exact or close match
  if (availableModels.length > 0) {
    const list = availableModels.map((m: any) => (typeof m === 'string' ? m : m.id));

    // 1. Exact match
    if (list.includes(modelId)) return modelId;

    // 2. OpenRouter prefixed exact
    if (list.includes(`openrouter:${modelId}`)) return `openrouter:${modelId}`;

    // 3. Known mappings
    const mapping: Record<string, string[]> = {
      'claude-haiku-4-5': ['claude-haiku-4-5-20251001', 'claude-haiku-4-5', 'openrouter:anthropic/claude-haiku-4.5', 'claude-3-5-haiku'],
      'claude-sonnet-4-6': ['claude-sonnet-4-6', 'claude-sonnet-5', 'openrouter:anthropic/claude-sonnet-4.6', 'claude-sonnet-4-5-20250929'],
      'claude-sonnet-5': ['claude-sonnet-5', 'claude-sonnet-4-6', 'claude-sonnet-4-5-20250929', 'claude-3-5-sonnet'],
      'claude-opus-5': ['claude-opus-5', 'claude-opus-4-6', 'openrouter:anthropic/claude-opus-5', 'claude-3-opus'],
      'claude-opus-5-fast': ['claude-opus-5', 'claude-opus-4-6', 'claude-sonnet-4-6'],
      'claude-fable-5-1': ['claude-fable-5-1', 'claude-sonnet-5', 'claude-sonnet-4-6'],
      'claude-sonnet-4-5-20250929': ['claude-sonnet-4-5-20250929', 'claude-sonnet-4-6', 'claude-sonnet-5', 'openrouter:anthropic/claude-sonnet-4.5', 'claude-3-5-sonnet'],
      'gpt-5.4': ['gpt-5.4', 'gpt-5.2', 'gpt-5', 'openrouter:openai/gpt-5.4', 'gpt-4o'],
      'gpt-5.2': ['gpt-5.2', 'gpt-5', 'gpt-5.4', 'openrouter:openai/gpt-5.2', 'gpt-4o'],
      'gpt-5-mini': ['gpt-5-mini', 'gpt-5.4-mini', 'gpt-4o-mini'],
      'o3-mini': ['o3-mini', 'openrouter:openai/o3-mini', 'o1-mini'],
      'gpt-4o': ['gpt-4o', 'openrouter:openai/gpt-4o'],
      'deepseek-r1': ['deepseek-r1', 'openrouter:deepseek/deepseek-r1', 'deepseek-reasoner'],
      'deepseek-chat': ['deepseek-chat', 'deepseek-v3', 'openrouter:deepseek/deepseek-chat'],
      'deepseek-coder': ['deepseek-coder', 'deepseek-coder-v2', 'deepseek-chat', 'openrouter:deepseek/deepseek-coder'],
      'gemini-3.1-flash-lite': ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest', 'openrouter:google/gemini-3.1-flash-lite'],
      'gemini-3.5-flash': ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'openrouter:google/gemini-3.5-flash'],
      'gemini-flash-latest': ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'],
      'gemini-3.7-flash': ['gemini-3.7-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'],
      'gemini-3.6-flash': ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'],
      'gemini-3.8-flash': ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3.7-flash'],
      'gemini-3.1-pro-preview': ['gemini-3.1-pro-preview', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'],
      'gemini-pro-latest': ['gemini-pro-latest', 'gemini-3.1-pro-preview', 'gemini-3.5-flash'],
      'groq:openai/gpt-oss-120b': ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'],
      'groq:openai/gpt-oss-20b': ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b'],
      'groq:qwen/qwen3.8-27b': ['qwen/qwen3.8-27b', 'qwen/qwen3.6-27b', 'openai/gpt-oss-120b'],
      'groq:qwen/qwen3.6-27b': ['qwen/qwen3.6-27b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'],
      'groq:canopylabs/orpheus-arabic-saudi': ['canopylabs/orpheus-arabic-saudi', 'openai/gpt-oss-120b'],
      'groq:canopylabs/orpheus-v1-english': ['canopylabs/orpheus-v1-english', 'openai/gpt-oss-120b'],
      'groq:llama-3.3-70b-versatile': ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'],
      'groq:deepseek-r1-distill-llama-70b': ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'],
      'groq:mixtral-8x7b-32768': ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
      'groq:minimaxai/minimax-m2.7': ['minimaxai/minimax-m2.7', 'openai/gpt-oss-120b'],
      'groq:llama-3.1-8b-instant': ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'],
    };

    const alternatives = mapping[modelId] || [];
    for (const alt of alternatives) {
      if (list.includes(alt)) return alt;
    }

    // 4. Fuzzy includes
    const cleanId = modelId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const found = list.find((item: string) => {
      const cleanItem = item.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return cleanItem.includes(cleanId) || cleanId.includes(cleanItem);
    });

    if (found) return found;
  }

  // Direct fallback mapping
  switch (modelId) {
    case 'claude-haiku-4-5':
      return 'claude-haiku-4-5-20251001';
    case 'claude-sonnet-4-6':
      return 'claude-sonnet-4-6';
    case 'claude-sonnet-5':
      return 'claude-sonnet-5';
    case 'claude-opus-5':
    case 'claude-opus-5-fast':
      return 'claude-opus-4-6';
    case 'claude-fable-5-1':
      return 'claude-sonnet-4-6';
    case 'claude-sonnet-4-5-20250929':
      return 'claude-sonnet-4-5-20250929';
    case 'gpt-5.4':
      return 'gpt-5.4';
    case 'gpt-5.2':
      return 'gpt-5.2';
    case 'gpt-5-mini':
      return 'gpt-5-mini';
    case 'o3-mini':
      return 'o3-mini';
    case 'gpt-4o':
      return 'gpt-4o';
    case 'deepseek-r1':
      return 'deepseek-r1';
    case 'deepseek-chat':
      return 'deepseek-chat';
    case 'deepseek-coder':
      return 'deepseek-coder';
    case 'gemini-3.1-flash-lite':
      return 'gemini-3.1-flash-lite';
    case 'gemini-3.5-flash':
      return 'gemini-3.5-flash';
    case 'gemini-3.6-flash':
      return 'gemini-3.6-flash';
    case 'gemini-flash-latest':
      return 'gemini-flash-latest';
    case 'gemini-3.7-flash':
      return 'gemini-3.7-flash';
    case 'gemini-3.8-flash':
    case 'gemini-2.5-flash':
      return 'gemini-3.1-flash-lite';
    case 'gemini-3.1-pro-preview':
    case 'gemini-2.5-pro':
      return 'gemini-3.5-flash';
    case 'gemini-pro-latest':
      return 'gemini-pro-latest';
    default:
      return modelId;
  }
}
