import { Button, Tooltip } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';
import { IoMdSend } from 'react-icons/io';
import { MdStopCircle } from 'react-icons/md';
import React, { useRef } from 'react';

export default function InputArea({ onSend, onStop, isLoading }) {
    const inputRef = useRef(null);
    const { t } = useTranslation();

    const handleSend = () => {
        const text = inputRef.current?.value?.trim();
        if (!text || isLoading) return;
        onSend(text);
        inputRef.current.value = '';
        inputRef.current.style.height = 'auto';
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        // Enter sends, Shift+Enter inserts a newline
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = () => {
        const el = inputRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
        }
    };

    return (
        <div className='flex items-end gap-2 p-3 border-t border-default-200'>
            <textarea
                ref={inputRef}
                rows={1}
                className='flex-1 resize-none bg-default-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary'
                placeholder={t('chat.placeholder')}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
            />
            {isLoading ? (
                <Tooltip content={t('chat.stop')}>
                    <Button
                        isIconOnly
                        size='sm'
                        color='warning'
                        onPress={onStop}
                    >
                        <MdStopCircle className='text-[16px]' />
                    </Button>
                </Tooltip>
            ) : (
                <Button
                    isIconOnly
                    size='sm'
                    color='primary'
                    onPress={handleSend}
                >
                    <IoMdSend className='text-[16px]' />
                </Button>
            )}
        </div>
    );
}
