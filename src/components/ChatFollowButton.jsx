import { Button, Tooltip } from '@nextui-org/react';
import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { BsChatDots } from 'react-icons/bs';
import { useTranslation } from 'react-i18next';

import { resolveChatLlmInstance, toChatApiConfig } from '../utils/chat_service';

// Follow-up chat entry button.
// Picks the LLM config automatically: an explicit AI plugin config (pluginConfig prop)
// wins; otherwise the shared resolver honours the `chat_service_instance` setting,
// then the current service instance, then the first usable OpenAI-compatible instance.
// Renders nothing while no usable config exists.
export default function ChatFollowButton({ sourceText, resultText, currentInstanceKey = null, pluginConfig = null }) {
    const [resolved, setResolved] = useState(null);
    const { t } = useTranslation();

    useEffect(() => {
        let cancelled = false;
        const resolve = async () => {
            let next = null;
            if (pluginConfig && pluginConfig.apiKey && pluginConfig.requestPath) {
                next = {
                    key: null,
                    config: {
                        service: 'openai',
                        requestPath: pluginConfig.requestPath,
                        model: pluginConfig.model || 'gpt-4o',
                        apiKey: pluginConfig.apiKey,
                        stream: true,
                    },
                };
            } else {
                next = await resolveChatLlmInstance(currentInstanceKey);
            }
            if (!cancelled) setResolved(next);
        };
        resolve();
        return () => {
            cancelled = true;
        };
    }, [currentInstanceKey, pluginConfig]);

    if (!sourceText || !resolved) return null;

    return (
        <Tooltip content={t('recognize.follow_up')}>
            <Button
                isIconOnly
                variant='light'
                size='sm'
                onPress={() => {
                    invoke('open_chat_window', {
                        context: JSON.stringify({
                            sourceText: sourceText,
                            resultText: resultText,
                            apiConfigKey: resolved.key,
                            apiConfig: toChatApiConfig(resolved.config),
                            initialMessages:
                                resultText === sourceText
                                    ? [{ role: 'user', content: sourceText }]
                                    : [
                                          { role: 'user', content: sourceText },
                                          { role: 'assistant', content: resultText },
                                      ],
                        }),
                    });
                }}
            >
                <BsChatDots className='text-[16px]' />
            </Button>
        </Tooltip>
    );
}
