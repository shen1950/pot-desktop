import { useCallback, useEffect } from 'react';
import { listen, emit } from '@tauri-apps/api/event';
import { useGetState } from './useGetState';
import { store } from '../utils/store';
import { debounce } from '../utils';

export const useConfig = (key, defaultValue, options = {}) => {
    const [property, setPropertyState, getProperty] = useGetState(null);
    const { sync = true } = options;

    // 同步到Store (State -> Store)
    const syncToStore = useCallback(
        debounce((v) => {
            store.set(key, v);
            store.save();
            let eventKey = key.replaceAll('.', '_').replaceAll('@', ':');
            emit(`${eventKey}_changed`, v);
        }),
        []
    );

    // 同步到State (Store -> State)
    const syncToState = useCallback((v) => {
        if (v !== null) {
            setPropertyState(v);
        } else {
            // 先 load 再 get：备份恢复等外部替换后确保读到磁盘最新值
            store
                .load()
                .then(() => store.get(key))
                .then((v) => {
                    if (v === null) {
                        setPropertyState(defaultValue);
                        store.set(key, defaultValue);
                        store.save();
                    } else {
                        setPropertyState(v);
                    }
                });
        }
    }, []);

    const setProperty = useCallback((v, forceSync = false) => {
        setPropertyState(v);
        const isSync = forceSync || sync;
        isSync && syncToStore(v);
    }, []);

    // 初始化
    useEffect(() => {
        syncToState(null);
        const eventKey = key.replaceAll('.', '_').replaceAll('@', ':');
        const unlisten = listen(`${eventKey}_changed`, (e) => {
            syncToState(e.payload);
        });
        // 监听全局配置文件变更事件（例如备份恢复时 config.json 被替换），重新从 Store 读取
        const unlistenGlobal = listen('config_file_changed', () => {
            syncToState(null);
        });
        return () => {
            unlisten.then((f) => {
                f();
            });
            unlistenGlobal.then((f) => {
                f();
            });
        };
    }, []);

    return [property, setProperty, getProperty];
};

export const deleteKey = (key) => {
    if (store.has(key)) {
        store.delete(key);
        store.save();
    }
};
