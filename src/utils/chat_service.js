import { store } from './store';
import { getServiceName } from './service_instance';

// Resolve the LLM apiConfig used by the follow-up chat window.
//
// Priority:
//   1. `chat_service_instance` config — explicit user choice in settings
//      (must be an OpenAI-compatible builtin translate instance with apiKey & requestPath)
//   2. the currently active service instance (translate window), when no explicit choice
//   3. the first usable OpenAI-compatible instance in translate_service_list
//
// Returns null when nothing usable exists.
export async function resolveChatLlmConfig(currentInstanceKey = null) {
    const usable = async (key) => {
        if (!key || getServiceName(key) !== 'openai') return null;
        const cfg = (await store.get(key)) ?? {};
        return cfg.apiKey && cfg.requestPath ? cfg : null;
    };

    const preferredKey = await store.get('chat_service_instance');
    let config = null;
    if (preferredKey) {
        config = await usable(preferredKey);
    } else if (currentInstanceKey) {
        config = await usable(currentInstanceKey);
    }
    if (!config) {
        const list = (await store.get('translate_service_list')) ?? [];
        for (const key of list) {
            config = await usable(key);
            if (config) break;
        }
    }
    return config;
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
