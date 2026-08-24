import { appWindow, PhysicalSize } from '@tauri-apps/api/window';
import { BrowserRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { warn } from 'tauri-plugin-log-api';
import React, { useEffect, Suspense } from 'react';
import { useTheme } from 'next-themes';

import { invoke } from '@tauri-apps/api/tauri';
import ErrorBoundary from './components/ErrorBoundary';
import Screenshot from './window/Screenshot';
import Translate from './window/Translate';
import Recognize from './window/Recognize';
import Updater from './window/Updater';
import { store } from './utils/store';
import Config from './window/Config';
import { useConfig } from './hooks';
import './style.css';
import './i18n';

const Chat = React.lazy(() => import('./window/Chat'));

const windowMap = {
    translate: <ErrorBoundary><Translate /></ErrorBoundary>,
    screenshot: <Screenshot />,
    recognize: <Recognize />,
    config: <Config />,
    updater: <Updater />,
};

const isTranslateWindow = (label) => label === 'translate' || label.startsWith('translate-');
const isChatWindow = (label) => label.startsWith('chat');

// Restore the config window size only once per process, so later
// effect re-runs (theme/font changes) don't snap the window back.
let configSizeRestored = false;

export default function App() {
    const [devMode] = useConfig('dev_mode', false);
    const [appTheme] = useConfig('app_theme', 'system');
    const [appLanguage] = useConfig('app_language', 'en');
    const [appFont] = useConfig('app_font', 'default');
    const [appFallbackFont] = useConfig('app_fallback_font', 'default');
    const [appFontSize] = useConfig('app_font_size', 16);
    const { setTheme } = useTheme();
    const { i18n } = useTranslation();

    useEffect(() => {
        store.load();
    }, []);

    useEffect(() => {
        if (devMode !== null && devMode) {
            document.addEventListener('keydown', async (e) => {
                let allowKeys = ['c', 'v', 'x', 'a', 'z', 'y'];
                if (e.ctrlKey && !allowKeys.includes(e.key.toLowerCase())) {
                    e.preventDefault();
                }
                if (e.key === 'F12') {
                    await invoke('open_devtools');
                }
                if (e.key.startsWith('F') && e.key.length > 1) {
                    e.preventDefault();
                }
                if (e.key === 'Escape') {
                    await appWindow.close();
                }
            });
        } else {
            document.addEventListener('keydown', async (e) => {
                let allowKeys = ['c', 'v', 'x', 'a', 'z', 'y'];
                if (e.ctrlKey && !allowKeys.includes(e.key.toLowerCase())) {
                    e.preventDefault();
                }
                if (e.key.startsWith('F') && e.key.length > 1) {
                    e.preventDefault();
                }
                if (e.key === 'Escape') {
                    await appWindow.close();
                }
            });
        }
    }, [devMode]);

    useEffect(() => {
        if (appTheme !== null) {
            if (appTheme !== 'system') {
                setTheme(appTheme);
            } else {
                try {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        setTheme('dark');
                    } else {
                        setTheme('light');
                    }
                    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                        if (e.matches) {
                            setTheme('dark');
                        } else {
                            setTheme('light');
                        }
                    });
                } catch {
                    warn("Can't detect system theme.");
                }
            }
        }
    }, [appTheme]);

    useEffect(() => {
        if (appLanguage !== null) {
            i18n.changeLanguage(appLanguage);
        }
    }, [appLanguage]);

    useEffect(() => {
        if (appFont !== null && appFallbackFont !== null) {
            document.documentElement.style.fontFamily = `"${appFont === 'default' ? 'sans-serif' : appFont}","${
                appFallbackFont === 'default' ? 'sans-serif' : appFallbackFont
            }"`;
        }
        if (appFontSize !== null) {
            document.documentElement.style.fontSize = `${appFontSize}px`;
        }
    }, [appFont, appFallbackFont, appFontSize]);

    // Show windows only after every UI side-effect above (theme,
    // language, fonts) has been applied, so the language/value loading
    // sequence is never visible. Effects run top-to-bottom within a
    // component, hence this being declared last. The timeout in Config
    // is a safety net against config store failures.
    useEffect(() => {
        if (
            appWindow.label !== 'config' ||
            devMode === null ||
            appTheme === null ||
            appLanguage === null ||
            appFont === null ||
            appFallbackFont === null ||
            appFontSize === null
        ) {
            return;
        }
        let cancelled = false;
        (async () => {
            // Restore the remembered window size (or a text-scale aware
            // default) before showing. Windows text scaling zooms web
            // content, so the fixed logical default must grow with
            // devicePixelRatio to keep the CSS viewport constant.
            if (!configSizeRestored) {
                configSizeRestored = true;
                try {
                    const dpr = window.devicePixelRatio;
                    const saved = await store.get('config_window_size');
                    const size =
                        saved && saved.w > 0 && saved.h > 0
                            ? new PhysicalSize(saved.w, saved.h)
                            : new PhysicalSize(Math.round(800 * dpr), Math.round(600 * dpr));
                    await appWindow.setSize(size);
                    await appWindow.setMinSize(
                        new PhysicalSize(Math.round(800 * dpr), Math.round(400 * dpr))
                    );
                    await appWindow.center();
                } catch (e) {
                    warn(`Restore config window size failed: ${e}`);
                }
            }
            if (cancelled) return;
            requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                    appWindow.show();
                })
            );
        })();
        return () => {
            cancelled = true;
        };
    }, [devMode, appTheme, appLanguage, appFont, appFallbackFont, appFontSize]);

    let content;
    if (isTranslateWindow(appWindow.label)) {
        content = windowMap.translate;
    } else if (isChatWindow(appWindow.label)) {
        content = (
            <Suspense fallback={null}>
                <Chat />
            </Suspense>
        );
    } else {
        content = windowMap[appWindow.label];
    }
    return <BrowserRouter>{content}</BrowserRouter>;
}
