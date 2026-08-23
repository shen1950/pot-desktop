import { store } from './store';
import {
    getServiceName,
    getServiceSouceType,
    ServiceSourceType,
    INSTANCE_NAME_CONFIG_KEY,
} from './service_instance';

function isUsableOpenAiConfig(config) {
    return Boolean(config && config.apiKey && config.requestPath);
}

// Human-readable display name for a candidate instance.
// Returns null for builtin services when no custom name is set — callers fall
// back to their own localized default title.
export function chatInstanceDisplayName(option) {
    const customName = option.config[INSTANCE_NAME_CONFIG_KEY];
    if (customName) return customName;
    if (!option.isPlugin) return null;
    // Strip the boilerplate prefix of potext plugin ids,
    // e.g. plugin.com.pot-app.openai_recognize -> openai_recognize
    return option.key.split('@')[0].replace(/^plugin\.com\.[^.]+\./, '');
}

// All usable chat model candidates:
//   - builtin "openai" (OpenAI-compatible) translate instances
//   - external plugin instances that expose an apiKey + requestPath
//     (AI-style recognize/translate plugins), called directly in OpenAI format
// Collected from BOTH the translate and recognize service lists.
export async function listUsableChatInstances() {
    const [translateList, recognizeList] = await Promise.all([
        store.get('translate_service_list'),
        store.get('recognize_service_list'),
    ]);
    const keys = [...new Set([...(translateList ?? []), ...(recognizeList ?? [])])];

    const options = [];
    for (const key of keys) {
        const cfg = (await store.get(key)) ?? {};
        if (!isUsableOpenAiConfig(cfg)) continue;
        const isPlugin = getServiceSouceType(key) === ServiceSourceType.PLUGIN;
        if (!isPlugin && getServiceName(key) !== 'openai') continue;
        options.push({
            key: key,
            name: chatInstanceDisplayName({ key: key, config: cfg }),
            isPlugin: isPlugin,
            config: isPlugin
                ? {
                      service: 'openai',
                      requestPath: cfg.requestPath,
                      model: cfg.model || 'gpt-4o',
                      apiKey: cfg.apiKey,
                      stream: true,
                  }
                : cfg,
        });
    }
    return options;
}

// Resolve the follow-up chat service instance.
//
// Priority:
//   1. `chat_service_instance` config — explicit user choice (settings page or
//      the chat window's model selector)
//   2. the currently active service instance (translate window), when no explicit choice
//   3. the first usable candidate
//
// Returns { key, config } or null when nothing usable exists.
export async function resolveChatLlmInstance(currentInstanceKey = null) {
    const candidates = await listUsableChatInstances();
    const preferredKey = await store.get('chat_service_instance');
    let found = null;
    if (preferredKey) {
        found = candidates.find((item) => item.key === preferredKey) ?? null;
    } else if (currentInstanceKey) {
        found = candidates.find((item) => item.key === currentInstanceKey) ?? null;
    }
    if (!found) found = candidates[0] ?? null;
    return found ? { key: found.key, config: found.config } : null;
}

export function toChatApiConfig(serviceConfig) {
    return {
        service: serviceConfig.service || 'openai',
        requestPath: serviceConfig.requestPath,
        model: serviceConfig.model,
        apiKey: serviceConfig.apiKey,
        stream: serviceConfig.stream ?? true,
        requestArguments: serviceConfig.requestArguments,
    };
}
