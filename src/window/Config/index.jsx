import { useLocation, useRoutes } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { Card, Divider } from '@nextui-org/react';
import { useTranslation } from 'react-i18next';

import WindowControl from '../../components/WindowControl';
import SideBar from './components/SideBar';
import { osType } from '../../utils/env';
import { useConfig } from '../../hooks';
import { store } from '../../utils/store';
import routes from './routes';
import './style.css';

export default function Config() {
    const [transparent] = useConfig('transparent', true);
    const { t } = useTranslation();
    const location = useLocation();
    const page = useRoutes(routes);
    const [sidebarWidth, setSidebarWidth] = useState(230);

    // The window is shown by App.jsx once theme/language/fonts are
    // applied. This is only a safety net if the config store hangs.
    useEffect(() => {
        const fallback = setTimeout(() => {
            if (appWindow.label === 'config') {
                appWindow.show();
            }
        }, 3000);
        return () => clearTimeout(fallback);
    }, []);

    // Restore the sidebar width chosen by dragging the divider.
    useEffect(() => {
        if (appWindow.label !== 'config') return;
        store
            .load()
            .then(() => store.get('config_sidebar_width'))
            .then((v) => {
                if (typeof v === 'number' && v >= 150 && v <= 400) {
                    setSidebarWidth(v);
                }
            });
    }, []);

    // Drag the divider to resize the sidebar (150-400px); double-click
    // resets it. The width is persisted on mouse up.
    function onDividerDragStart(e) {
        e.preventDefault();
        document.body.style.userSelect = 'none';
        const onMove = (ev) => {
            setSidebarWidth(Math.min(400, Math.max(150, ev.clientX)));
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            document.body.style.userSelect = '';
            setSidebarWidth((w) => {
                store.set('config_sidebar_width', w);
                store.save();
                return w;
            });
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }

    function onDividerReset() {
        setSidebarWidth(230);
        store.set('config_sidebar_width', 230);
        store.save();
    }

    // Persist window size so reopening from the tray keeps the user's
    // own size instead of resetting to the default.
    useEffect(() => {
        if (appWindow.label !== 'config') return;
        let timer;
        const unlisten = appWindow.onResized(async () => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                try {
                    const size = await appWindow.outerSize();
                    await store.set('config_window_size', { w: size.width, h: size.height });
                    await store.save();
                } catch (e) {
                    console.error(e);
                }
            }, 500);
        });
        return () => {
            clearTimeout(timer);
            unlisten.then((f) => f());
        };
    }, []);

    return (
        <>
            <Card
                shadow='none'
                style={{ width: sidebarWidth }}
                className={`${transparent ? 'bg-background/90' : 'bg-content1'} float-left h-screen rounded-none ${
                    osType === 'Linux' && 'rounded-l-[10px] border-1'
                } border-r-1 border-default-100 select-none cursor-default`}
            >
                <div className='h-[35px] p-[5px]'>
                    <div
                        className='w-full h-full'
                        data-tauri-drag-region='true'
                    />
                </div>
                <div className='p-[5px]'>
                    <div data-tauri-drag-region='true'>
                        <img
                            alt='pot logo'
                            src='icon.svg'
                            className='h-[3.75rem] w-[3.75rem] m-auto mb-[1.875rem]'
                            draggable={false}
                        />
                    </div>
                </div>
                <SideBar />
            </Card>
            <div
                style={{ marginLeft: sidebarWidth }}
                className={`bg-background h-screen select-none cursor-default ${
                    osType === 'Linux' && 'rounded-r-[10px] border-1 border-l-0 border-default-100'
                }`}
            >
                <div
                    data-tauri-drag-region='true'
                    style={{ left: sidebarWidth + 5 }}
                    className='top-[5px] right-[5px] h-[30px] fixed'
                />
                <div className='h-[35px] flex justify-between'>
                    <div className='flex'>
                        <h2 className='m-auto ml-[10px]'>
                            {location.pathname !== '/' && t(`config.${location.pathname.slice(1)}.title`)}
                        </h2>
                    </div>

                    <div className='flex'>{osType !== 'Darwin' && <WindowControl />}</div>
                </div>
                <Divider />
                <div
                    className={`p-[10px] overflow-y-auto ${
                        osType === 'Linux' ? 'h-[calc(100vh-38px)]' : 'h-[calc(100vh-36px)]'
                    }`}
                >
                    {page}
                </div>
            </div>
            <div
                style={{ left: sidebarWidth - 3 }}
                className='fixed top-0 h-screen w-[6px] z-50 cursor-col-resize'
                onMouseDown={onDividerDragStart}
                onDoubleClick={onDividerReset}
            />
        </>
    );
}
