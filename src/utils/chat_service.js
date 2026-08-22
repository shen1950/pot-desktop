import { store } from './store';
import { getServiceName, INSTANCE_NAME_CONFIG_KEY } from './service_instance';

function isUsableOpenAiInstance(config) {
    return Boolean(config && config.apiKey && config.requestPath);
}

// All usable OpenAI-compatible builtin translate instances, as chat model candidates.
export async function listUsableChatInstances() {
    const list = (await store.get('translate_service_list')) ?? [];
    const options = [];
    for (const key of list) {
        if (getServiceName(key) !== 'openai') continue;
        const cfg = (await store.get(key)) ?? {};
        if (!isUsableOpenAiInstance(cfg)) continue;
        options.push({ key: key, name: cfg[INSTANCE_NAME_CONFIG_KEY], config: cfg });
    }
    return options;
}

// Resolve the follow-up chat service instance.
//
// Priority:
//   1. `chat_service_instance` config — explicit user choice in settings
//      (must be an OpenAI-compatible builtin translate instance with apiKey & requestPath)
//   2. the currently active service instance (translate window), when no explicit choice
//   3. the first usable OpenAI-compatible instance in translate_service_list
//
// Returns { key, config } or null when nothing usable exists.
export async function resolveChatLlmInstance(currentInstanceKey = null) {
    const findInList = async (key) => {
        if (!key || getServiceName(key) !== 'openai') return null;
        const cfg = (await store.get(key)) ?? {};
        return isUsableOpenAiInstance(cfg) ? { key: key, config: cfg } : null;
    };

    const preferredKey = await store.get('chat_service_instance');
    let found = null;
    if (preferredKey) {
        found = await findInList(preferredKey);
    } else if (currentInstanceKey) {
        found = await findInList(currentInstanceKey);
    }
    if (!found) {
        for (const key of (await store.get('translate_service_list')) ?? []) {
            found = await findInList(key);
            if (found) break;
        }
    }
    return found;
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
