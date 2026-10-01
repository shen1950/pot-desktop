import { unregister, isRegistered } from '@tauri-apps/api/globalShortcut';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { CardBody } from '@nextui-org/react';
import { Button } from '@nextui-org/react';
import { Input } from '@nextui-org/react';
import { Card } from '@nextui-org/react';
import React from 'react';

import { useConfig } from '../../../../hooks/useConfig';
import { useToastStyle } from '../../../../hooks';
import { osType } from '../../../../utils/env';
import { invoke } from '@tauri-apps/api';

const keyMap = {
    Backquote: '`',
    Backslash: '\\',
    BracketLeft: '[',
    BracketRight: ']',
    Comma: ',',
    Equal: '=',
    Minus: '-',
    Plus: 'PLUS',
    Period: '.',
    Quote: "'",
    Semicolon: ';',
    Slash: '/',
    Backspace: 'Backspace',
    CapsLock: 'Capslock',
    ContextMenu: 'Contextmenu',
    Space: 'Space',
    Tab: 'Tab',
    Convert: 'Convert',
    Delete: 'Delete',
    End: 'End',
    Help: 'Help',
    Home: 'Home',
    PageDown: 'Pagedown',
    PageUp: 'Pageup',
    Escape: 'Esc',
    PrintScreen: 'Printscreen',
    ScrollLock: 'Scrolllock',
    Pause: 'Pause',
    Insert: 'Insert',
    Suspend: 'Suspend',
};

export default function Hotkey() {
    const [selectionTranslate, setSelectionTranslate] = useConfig('hotkey_selection_translate', '');
    const [selectionTranslateNewWindow, setSelectionTranslateNewWindow] = useConfig(
        'hotkey_selection_translate_new_window',
        'Ctrl+Shift+]'
    );
    const [inputTranslate, setInputTranslate] = useConfig('hotkey_input_translate', '');
    const [inputTranslateNewWindow, setInputTranslateNewWindow] = useConfig('hotkey_input_translate_new_window', '');
    const [ocrRecognize, setOcrRecognize] = useConfig('hotkey_ocr_recognize', '');
    const [ocrTranslate, setOcrTranslate] = useConfig('hotkey_ocr_translate', '');
    const [ocrTranslateNewWindow, setOcrTranslateNewWindow] = useConfig('hotkey_ocr_translate_new_window', '');

    const { t } = useTranslation();
    const toastStyle = useToastStyle();

    function keyDown(e, setKey) {
        e.preventDefault();
        if (e.keyCode === 8) {
            setKey('');
        } else {
            let newValue = '';
            if (e.ctrlKey) {
                newValue = 'Ctrl';
            }
            if (e.shiftKey) {
                newValue = `${newValue}${newValue.length > 0 ? '+' : ''}Shift`;
            }
            if (e.metaKey) {
                newValue = `${newValue}${newValue.length > 0 ? '+' : ''}${osType === 'Darwin' ? 'Command' : 'Super'}`;
            }
            if (e.altKey) {
                newValue = `${newValue}${newValue.length > 0 ? '+' : ''}Alt`;
            }
            let code = e.code;
            if (code.startsWith('Key')) {
                code = code.substring(3);
            } else if (code.startsWith('Digit')) {
                code = code.substring(5);
            } else if (code.startsWith('Numpad')) {
                code = 'Num' + code.substring(6);
            } else if (code.startsWith('Arrow')) {
                code = code.substring(5);
            } else if (code.startsWith('Intl')) {
                code = code.substring(4);
            } else if (/F\d+/.test(code)) {
            } else if (keyMap[code] !== undefined) {
                code = keyMap[code];
            } else {
                code = '';
            }
            setKey(`${newValue}${newValue.length > 0 && code.length > 0 ? '+' : ''}${code}`);
        }
    }

    function registerHandler(name, key) {
        if (key === '') return;
        isRegistered(key).then((res) => {
            if (res) {
                toast.error(t('config.hotkey.is_register'), { style: toastStyle });
            } else {
                invoke('register_shortcut_by_frontend', {
                    name: name,
                    shortcut: key,
                }).then(
                    () => {
                        toast.success(t('config.hotkey.success'), { style: toastStyle });
                    },
                    (e) => {
                        toast.error(e, { style: toastStyle });
                    }
                );
            }
        });
    }

    const renderHotkeyInput = (name, value, setValue, label) =>
        value !== null && (
            <Input
                type='hotkey'
                variant='bordered'
                value={value}
                label={label}
                className='min-w-0'
                onKeyDown={(e) => {
                    keyDown(e, setValue);
                }}
                onFocus={() => {
                    if (value !== '') {
                        void unregister(value);
                    }
                    setValue('');
                }}
                endContent={
                    <Button
                        size='sm'
                        variant='flat'
                        className={`${value === '' && 'hidden'}`}
                        onPress={() => {
                            registerHandler(name, value);
                        }}
                    >
                        {t('common.ok')}
                    </Button>
                }
            />
        );

    const hotkeyGroups = [
        {
            label: t('config.hotkey.selection_translate'),
            show: ['hotkey_selection_translate', selectionTranslate, setSelectionTranslate],
            create: [
                'hotkey_selection_translate_new_window',
                selectionTranslateNewWindow,
                setSelectionTranslateNewWindow,
            ],
        },
        {
            label: t('config.hotkey.input_translate'),
            show: ['hotkey_input_translate', inputTranslate, setInputTranslate],
            create: ['hotkey_input_translate_new_window', inputTranslateNewWindow, setInputTranslateNewWindow],
        },
        {
            label: t('config.hotkey.ocr_translate'),
            show: ['hotkey_ocr_translate', ocrTranslate, setOcrTranslate],
            create: ['hotkey_ocr_translate_new_window', ocrTranslateNewWindow, setOcrTranslateNewWindow],
        },
    ];

    return (
        <Card>
            <Toaster />
            <CardBody>
                {hotkeyGroups.map((group) => (
                    <div
                        className='config-item items-center gap-4'
                        key={group.label}
                    >
                        <h3 className='my-auto shrink-0'>{group.label}</h3>
                        <div className='grid w-[72%] min-w-0 grid-cols-2 gap-2'>
                            {renderHotkeyInput(...group.show, t('config.hotkey.show_window'))}
                            {renderHotkeyInput(...group.create, t('config.hotkey.new_window'))}
                        </div>
                    </div>
                ))}
                <div className='config-item items-center gap-4'>
                    <h3 className='my-auto shrink-0'>{t('config.hotkey.ocr_recognize')}</h3>
                    <div className='w-[72%]'>
                        {renderHotkeyInput(
                            'hotkey_ocr_recognize',
                            ocrRecognize,
                            setOcrRecognize,
                            t('config.hotkey.set_hotkey')
                        )}
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
