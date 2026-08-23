import { readDir, BaseDirectory, readTextFile, exists } from '@tauri-apps/api/fs';
import { appConfigDir, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';
import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Button } from '@nextui-org/react';
import { BsPinFill } from 'react-icons/bs';
import { atom, useAtom } from 'jotai';

import WindowControl from '../../components/WindowControl';
import { store } from '../../utils/store';
import { osType } from '../../utils/env';
import { useConfig } from '../../hooks';
import ControlArea from './ControlArea';
import ImageArea from './ImageArea';
import TextArea from './TextArea';

export const pluginListAtom = atom();

let blurTimeout = null;

// 每个模块实例（含 HMR 热重载后重新生成的实例）持有唯一 token，
// 只有最新实例注册的 blur 监听器才允许触发关窗，旧实例泄漏的监听器直接失效。
const blurListenerToken = Symbol('recognize-blur');
globalThis.__potRecognizeBlurToken = blurListenerToken;
// 配置加载完成之前一律不因失焦关窗，避免窗口刚弹出时焦点被抢导致"闪现即消失"。
let blurCloseEnabled = false;

const listenBlur = () => {
    return listen('tauri://blur', () => {
        if (appWindow.label !== 'recognize') return;
        if (globalThis.__potRecognizeBlurToken !== blurListenerToken) return;
        if (!blurCloseEnabled) return;
        if (blurTimeout) {
            clearTimeout(blurTimeout);
        }
        // 50ms后关闭窗口，因为在 windows 下拖动窗口时会先切换成 blur 再立即切换成 focus
        // 如果直接关闭将导致窗口无法拖动
        blurTimeout = setTimeout(async () => {
            await appWindow.close();
        }, 50);
    });
};

let unlisten = listenBlur();
// 取消 blur 监听
const unlistenBlur = () => {
    unlisten.then((f) => {
        f();
    });
};

// 监听 focus 事件取消 blurTimeout 时间之内的关闭窗口
void listen('tauri://focus', () => {
    if (blurTimeout) {
        clearTimeout(blurTimeout);
    }
});

export default function Recognize() {
    const [pluginList, setPluginList] = useAtom(pluginListAtom);
    const [closeOnBlur] = useConfig('recognize_close_on_blur', false);
    const [pined, setPined] = useState(false);
    const [serviceInstanceList] = useConfig('recognize_service_list', ['system', 'tesseract']);
    const [serviceInstanceConfigMap, setServiceInstanceConfigMap] = useState(null);

    const loadPluginList = async () => {
        let temp = {};
        if (await exists(`plugins/recognize`, { dir: BaseDirectory.AppConfig })) {
            const plugins = await readDir(`plugins/recognize`, { dir: BaseDirectory.AppConfig });
            for (const plugin of plugins) {
                const infoStr = await readTextFile(`plugins/recognize/${plugin.name}/info.json`, {
                    dir: BaseDirectory.AppConfig,
                });
                let pluginInfo = JSON.parse(infoStr);
                if ('icon' in pluginInfo) {
                    const appConfigDirPath = await appConfigDir();
                    const iconPath = await join(
                        appConfigDirPath,
                        `/plugins/recognize/${plugin.name}/${pluginInfo.icon}`
                    );
                    pluginInfo.icon = convertFileSrc(iconPath);
                }
                temp[plugin.name] = pluginInfo;
            }
        }
        setPluginList({ ...temp });
    };
    const loadServiceInstanceConfigMap = async () => {
        const config = {};
        for (const serviceInstanceKey of serviceInstanceList) {
            config[serviceInstanceKey] = (await store.get(serviceInstanceKey)) ?? {};
        }
        setServiceInstanceConfigMap({ ...config });
    };
    useEffect(() => {
        if (serviceInstanceList !== null) {
            loadServiceInstanceConfigMap();
        }
    }, [serviceInstanceList]);

    useEffect(() => {
        loadPluginList();
    }, []);
    // 是否自动关闭窗口：仅在配置加载完成且开启、并且窗口未置顶时才允许失焦关窗
    useEffect(() => {
        if (closeOnBlur === null) return;
        blurCloseEnabled = Boolean(closeOnBlur) && !pined;
    }, [closeOnBlur, pined]);

    return (
        pluginList &&
        serviceInstanceConfigMap !== null && (
            <div
                className={`bg-background h-screen ${
                    osType === 'Linux' && 'rounded-[10px] border-1 border-default-100'
                }`}
            >
                <div
                    data-tauri-drag-region='true'
                    className='fixed top-[5px] left-[5px] right-[5px] h-[30px]'
                />
                <div className={`h-[35px] flex ${osType === 'Darwin' ? 'justify-end' : 'justify-between'}`}>
                    <Button
                        isIconOnly
                        size='sm'
                        variant='flat'
                        disableAnimation
                        className='my-auto mx-[5px] bg-transparent'
                        onPress={() => {
                            if (pined) {
                                appWindow.setAlwaysOnTop(false);
                            } else {
                                appWindow.setAlwaysOnTop(true);
                            }
                            setPined(!pined);
                        }}
                    >
                        <BsPinFill className={`text-[20px] ${pined ? 'text-primary' : 'text-default-400'}`} />
                    </Button>
                    {osType !== 'Darwin' && <WindowControl />}
                </div>
                <div
                    className={`${
                        osType === 'Linux' ? 'h-[calc(100vh-87px)]' : 'h-[calc(100vh-85px)]'
                    } grid grid-cols-2`}
                >
                    <ImageArea />
                    <TextArea serviceInstanceConfigMap={serviceInstanceConfigMap} />
                </div>
                <div className='h-[50px]'>
                    <ControlArea
                        serviceInstanceList={serviceInstanceList}
                        serviceInstanceConfigMap={serviceInstanceConfigMap}
                    />
                </div>
            </div>
        )
    );
}
