import { readDir, BaseDirectory, readTextFile, exists } from '@tauri-apps/api/fs';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { appWindow, currentMonitor } from '@tauri-apps/api/window';
import { appConfigDir, join } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { Spacer, Button, Tooltip } from '@nextui-org/react';
import { AiFillCloseCircle } from 'react-icons/ai';
import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { BsPinFill } from 'react-icons/bs';
import { MdUnfoldMore, MdUnfoldLess, MdFilter1, MdPause, MdPlayArrow } from 'react-icons/md';

import LanguageArea from './components/LanguageArea';
import SourceArea from './components/SourceArea';
import TargetArea from './components/TargetArea';
import { osType } from '../../utils/env';
import { useConfig } from '../../hooks';
import { store } from '../../utils/store';
import { info } from 'tauri-plugin-log-api';

let blurTimeout = null;
let resizeTimeout = null;
let moveTimeout = null;

// 每个模块实例（含 HMR 热重载后重新生成的实例）持有唯一 token，
// 只有最新实例注册的 blur 监听器才允许触发关窗，旧实例泄漏的监听器直接失效。
const blurListenerToken = Symbol('translate-blur');
globalThis.__potTranslateBlurToken = blurListenerToken;
// 配置加载完成之前一律不因失焦关窗，避免窗口刚弹出时焦点被抢导致"闪现即消失"。
let blurCloseEnabled = false;

const listenBlur = () => {
    return listen('tauri://blur', () => {
        if (appWindow.label !== 'translate') return;
        if (globalThis.__potTranslateBlurToken !== blurListenerToken) return;
        if (!blurCloseEnabled) return;
        if (blurTimeout) {
            clearTimeout(blurTimeout);
        }
        info('Blur');
        // 100ms后关闭窗口，因为在 windows 下拖动窗口时会先切换成 blur 再立即切换成 focus
        // 如果直接关闭将导致窗口无法拖动
        blurTimeout = setTimeout(async () => {
            info('Confirm Blur');
            await appWindow.close();
        }, 100);
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
    info('Focus');
    if (blurTimeout) {
        info('Cancel Close');
        clearTimeout(blurTimeout);
    }
});
// 监听 move 事件取消 blurTimeout 时间之内的关闭窗口
void listen('tauri://move', () => {
    info('Move');
    if (blurTimeout) {
        info('Cancel Close');
        clearTimeout(blurTimeout);
    }
});

export default function Translate() {
    const [closeOnBlur] = useConfig('translate_close_on_blur', true);
    const [alwaysOnTop] = useConfig('translate_always_on_top', false);
    const [windowPosition] = useConfig('translate_window_position', 'mouse');
    const [rememberWindowSize] = useConfig('translate_remember_window_size', false);
    const [translateServiceInstanceList, setTranslateServiceInstanceList] = useConfig('translate_service_list', [
        'deepl',
        'bing',
        'lingva',
        'yandex',
        'google',
        'ecdict',
    ]);
    const [recognizeServiceInstanceList] = useConfig('recognize_service_list', ['system', 'tesseract']);
    const [ttsServiceInstanceList] = useConfig('tts_service_list', ['lingva_tts']);
    const [collectionServiceInstanceList] = useConfig('collection_service_list', []);
    const [hideLanguage] = useConfig('hide_language', false);
    const [pined, setPined] = useState(false);
    const [pluginList, setPluginList] = useState(null);
    const [serviceInstanceConfigMap, setServiceInstanceConfigMap] = useState(null);
    const [pausedServices, setPausedServices] = useState([]);
    const [collapsedServices, setCollapsedServices] = useState(null);
    const [hasInitializedCollapse, setHasInitializedCollapse] = useState(false);

    const validPausedServices = (pausedServices ?? []).filter((key) =>
        (translateServiceInstanceList ?? []).includes(key)
    );

    useEffect(() => {
        if (
            !hasInitializedCollapse &&
            translateServiceInstanceList !== null &&
            serviceInstanceConfigMap !== null
        ) {
            const enabledKeys = translateServiceInstanceList.filter((key) => {
                const config = serviceInstanceConfigMap[key] ?? {};
                return config['enable'] ?? true;
            });
            if (enabledKeys.length > 1) {
                setCollapsedServices(enabledKeys.slice(1));
            } else {
                setCollapsedServices([]);
            }
            setHasInitializedCollapse(true);
        }
    }, [translateServiceInstanceList, serviceInstanceConfigMap, hasInitializedCollapse]);

    const validCollapsedServices = (collapsedServices ?? []).filter((key) =>
        (translateServiceInstanceList ?? []).includes(key)
    );

    const toggleCollapseService = (serviceInstanceKey) => {
        if (validCollapsedServices.includes(serviceInstanceKey)) {
            setCollapsedServices(validCollapsedServices.filter((k) => k !== serviceInstanceKey));
        } else {
            setCollapsedServices([...validCollapsedServices, serviceInstanceKey]);
        }
    };
    const expandAllServices = () => setCollapsedServices([]);
    const collapseAllServices = () => {
        const enabledKeys = translateServiceInstanceList.filter((key) => {
            const config = serviceInstanceConfigMap[key] ?? {};
            return config['enable'] ?? true;
        });
        setCollapsedServices(enabledKeys);
    };
    const focusFirstService = () => {
        const enabledKeys = translateServiceInstanceList.filter((key) => {
            const config = serviceInstanceConfigMap[key] ?? {};
            return config['enable'] ?? true;
        });
        if (enabledKeys.length > 1) {
            setCollapsedServices(enabledKeys.slice(1));
        } else {
            setCollapsedServices([]);
        }
    };
    const togglePauseService = (serviceInstanceKey) => {
        if (validPausedServices.includes(serviceInstanceKey)) {
            setPausedServices(validPausedServices.filter((k) => k !== serviceInstanceKey));
        } else {
            setPausedServices([...validPausedServices, serviceInstanceKey]);
        }
    };

    // 启用的翻译服务列表（配置未加载时默认全部视为启用；暂停到禁用项无副作用）
    const enabledServiceKeys = (translateServiceInstanceList ?? []).filter((key) => {
        if (!serviceInstanceConfigMap) return true;
        const config = serviceInstanceConfigMap[key] ?? {};
        return config['enable'] ?? true;
    });

    // 默认暂停策略：每次触发新翻译时只有第一个启用的服务翻译，其余等待手动恢复
    const resetPauseDefaults = () => {
        setPausedServices(enabledServiceKeys.slice(1));
    };
    const pauseAllServices = () => {
        setPausedServices(enabledServiceKeys);
    };
    const resumeAllServices = () => {
        setPausedServices([]);
    };

    const reorder = (list, startIndex, endIndex) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const items = reorder(translateServiceInstanceList, result.source.index, result.destination.index);
        setTranslateServiceInstanceList(items);
    };
    // 是否自动关闭窗口：仅在配置加载完成且开启、并且窗口未置顶时才允许失焦关窗
    useEffect(() => {
        if (closeOnBlur === null) return;
        blurCloseEnabled = Boolean(closeOnBlur) && !pined;
    }, [closeOnBlur, pined]);
    // 是否默认置顶
    useEffect(() => {
        if (alwaysOnTop !== null && alwaysOnTop) {
            appWindow.setAlwaysOnTop(true);
            setPined(true);
        }
    }, [alwaysOnTop]);
    // 保存窗口位置
    useEffect(() => {
        if (windowPosition !== null && windowPosition === 'pre_state') {
            const unlistenMove = listen('tauri://move', async () => {
                if (moveTimeout) {
                    clearTimeout(moveTimeout);
                }
                moveTimeout = setTimeout(async () => {
                    if (appWindow.label === 'translate') {
                        let position = await appWindow.outerPosition();
                        const monitor = await currentMonitor();
                        const factor = monitor.scaleFactor;
                        position = position.toLogical(factor);
                        await store.set('translate_window_position_x', parseInt(position.x));
                        await store.set('translate_window_position_y', parseInt(position.y));
                        await store.save();
                    }
                }, 100);
            });
            return () => {
                unlistenMove.then((f) => {
                    f();
                });
            };
        }
    }, [windowPosition]);
    // 保存窗口大小
    useEffect(() => {
        if (rememberWindowSize !== null && rememberWindowSize) {
            const unlistenResize = listen('tauri://resize', async () => {
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                resizeTimeout = setTimeout(async () => {
                    if (appWindow.label === 'translate') {
                        let size = await appWindow.outerSize();
                        const monitor = await currentMonitor();
                        const factor = monitor.scaleFactor;
                        size = size.toLogical(factor);
                        await store.set('translate_window_height', parseInt(size.height));
                        await store.set('translate_window_width', parseInt(size.width));
                        await store.save();
                    }
                }, 100);
            });
            return () => {
                unlistenResize.then((f) => {
                    f();
                });
            };
        }
    }, [rememberWindowSize]);

    const loadPluginList = async () => {
        const serviceTypeList = ['translate', 'tts', 'recognize', 'collection'];
        let temp = {};
        for (const serviceType of serviceTypeList) {
            temp[serviceType] = {};
            if (await exists(`plugins/${serviceType}`, { dir: BaseDirectory.AppConfig })) {
                const plugins = await readDir(`plugins/${serviceType}`, { dir: BaseDirectory.AppConfig });
                for (const plugin of plugins) {
                    const infoStr = await readTextFile(`plugins/${serviceType}/${plugin.name}/info.json`, {
                        dir: BaseDirectory.AppConfig,
                    });
                    let pluginInfo = JSON.parse(infoStr);
                    if ('icon' in pluginInfo) {
                        const appConfigDirPath = await appConfigDir();
                        const iconPath = await join(
                            appConfigDirPath,
                            `/plugins/${serviceType}/${plugin.name}/${pluginInfo.icon}`
                        );
                        pluginInfo.icon = convertFileSrc(iconPath);
                    }
                    temp[serviceType][plugin.name] = pluginInfo;
                }
            }
        }
        setPluginList({ ...temp });
    };

    useEffect(() => {
        loadPluginList();
        if (!unlisten) {
            unlisten = listen('reload_plugin_list', loadPluginList);
        }
    }, []);

    const loadServiceInstanceConfigMap = async () => {
        const config = {};
        for (const serviceInstanceKey of translateServiceInstanceList) {
            config[serviceInstanceKey] = (await store.get(serviceInstanceKey)) ?? {};
        }
        for (const serviceInstanceKey of recognizeServiceInstanceList) {
            config[serviceInstanceKey] = (await store.get(serviceInstanceKey)) ?? {};
        }
        for (const serviceInstanceKey of ttsServiceInstanceList) {
            config[serviceInstanceKey] = (await store.get(serviceInstanceKey)) ?? {};
        }
        for (const serviceInstanceKey of collectionServiceInstanceList) {
            config[serviceInstanceKey] = (await store.get(serviceInstanceKey)) ?? {};
        }
        setServiceInstanceConfigMap({ ...config });
    };
    useEffect(() => {
        if (
            translateServiceInstanceList !== null &&
            recognizeServiceInstanceList !== null &&
            ttsServiceInstanceList !== null &&
            collectionServiceInstanceList !== null
        ) {
            loadServiceInstanceConfigMap();
        }
    }, [
        translateServiceInstanceList,
        recognizeServiceInstanceList,
        ttsServiceInstanceList,
        collectionServiceInstanceList,
    ]);

    return (
        pluginList && (
            <div
                className={`bg-background h-screen w-screen ${
                    osType === 'Linux' && 'rounded-[10px] border-1 border-default-100'
                }`}
            >
                <div
                    className='fixed top-[5px] left-[5px] right-[5px] h-[30px]'
                    data-tauri-drag-region='true'
                />
                <div className={`h-[35px] w-full flex ${osType === 'Darwin' ? 'justify-end' : 'justify-between'}`}>
                    <Button
                        isIconOnly
                        size='sm'
                        variant='flat'
                        disableAnimation
                        className='my-auto bg-transparent'
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
                    <Button
                        isIconOnly
                        size='sm'
                        variant='flat'
                        disableAnimation
                        className={`my-auto ${osType === 'Darwin' && 'hidden'} bg-transparent`}
                        onPress={() => {
                            void appWindow.close();
                        }}
                    >
                        <AiFillCloseCircle className='text-[20px] text-default-400' />
                    </Button>
                </div>
                <div className={`${osType === 'Linux' ? 'h-[calc(100vh-37px)]' : 'h-[calc(100vh-35px)]'} px-[8px]`}>
                    <div className='h-full overflow-y-auto'>
                        <div>
                            {serviceInstanceConfigMap !== null && (
                                <SourceArea
                                    pluginList={pluginList}
                                    serviceInstanceConfigMap={serviceInstanceConfigMap}
                                    onNewText={resetPauseDefaults}
                                />
                            )}
                        </div>
                        {/* Language area with toolbar buttons in the same card */}
                        <div className={`${hideLanguage && 'hidden'} mb-1`}>
                            <LanguageArea
                                toolbarButtons={
                                    collapsedServices !== null ? (
                                        <>
                                            <Tooltip content='仅展开首条'>
                                                <Button
                                                    size='sm'
                                                    isIconOnly
                                                    variant='light'
                                                    className='h-[24px] w-[24px] min-w-0'
                                                    onPress={focusFirstService}
                                                >
                                                    <MdFilter1 className='text-[14px] text-default-500' />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip content='全部展开'>
                                                <Button
                                                    size='sm'
                                                    isIconOnly
                                                    variant='light'
                                                    className='h-[24px] w-[24px] min-w-0'
                                                    onPress={expandAllServices}
                                                >
                                                    <MdUnfoldMore className='text-[14px] text-default-500' />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip content='全部收起'>
                                                <Button
                                                    size='sm'
                                                    isIconOnly
                                                    variant='light'
                                                    className='h-[24px] w-[24px] min-w-0'
                                                    onPress={collapseAllServices}
                                                >
                                                    <MdUnfoldLess className='text-[14px] text-default-500' />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip content='全部暂停'>
                                                <Button
                                                    size='sm'
                                                    isIconOnly
                                                    variant='light'
                                                    className='h-[24px] w-[24px] min-w-0'
                                                    onPress={pauseAllServices}
                                                >
                                                    <MdPause className='text-[14px] text-default-500' />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip content='全部开始'>
                                                <Button
                                                    size='sm'
                                                    isIconOnly
                                                    variant='light'
                                                    className='h-[24px] w-[24px] min-w-0'
                                                    onPress={() => {
                                                        resumeAllServices();
                                                        expandAllServices();
                                                    }}
                                                >
                                                    <MdPlayArrow className='text-[14px] text-default-500' />
                                                </Button>
                                            </Tooltip>
                                        </>
                                    ) : null
                                }
                            />
                        </div>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable
                                droppableId='droppable'
                                direction='vertical'
                            >
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                    >
                                        {translateServiceInstanceList !== null &&
                                            serviceInstanceConfigMap !== null &&
                                            translateServiceInstanceList.map((serviceInstanceKey, index) => {
                                                const config = serviceInstanceConfigMap[serviceInstanceKey] ?? {};
                                                const enable = config['enable'] ?? true;

                                                return enable ? (
                                                    <Draggable
                                                        key={serviceInstanceKey}
                                                        draggableId={serviceInstanceKey}
                                                        index={index}
                                                    >
                                                        {(provided) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                            >
                                                                <TargetArea
                                                                    {...provided.dragHandleProps}
                                                                    index={index}
                                                                    name={serviceInstanceKey}
                                                                    translateServiceInstanceList={
                                                                        translateServiceInstanceList
                                                                    }
                                                                    pluginList={pluginList}
                                                                    serviceInstanceConfigMap={serviceInstanceConfigMap}
                                                                    isPaused={validPausedServices.includes(serviceInstanceKey)}
                                                                    onTogglePause={togglePauseService}
                                                                    isCollapsed={collapsedServices !== null && validCollapsedServices.includes(serviceInstanceKey)}
                                                                    onToggleCollapse={toggleCollapseService}
                                                                />
                                                                <Spacer y={2} />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ) : (
                                                    <></>
                                                );
                                            })}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                </div>
            </div>
        )
    );
}
