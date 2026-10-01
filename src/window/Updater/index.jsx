import { Button, Card, CardBody } from '@nextui-org/react';
import React, { useEffect } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/api/shell';
import { useTranslation } from 'react-i18next';
import toast, { Toaster } from 'react-hot-toast';
import { useConfig, useToastStyle } from '../../hooks';
import { appVersion } from '../../utils/env';
import { PROJECT_NAME, RELEASES_URL } from '../../utils/project';

export default function Updater() {
    const [transparent] = useConfig('transparent', true);
    const { t } = useTranslation();
    const toastStyle = useToastStyle();
    useEffect(() => {
        if (appWindow.label === 'updater') appWindow.show();
    }, []);
    return (
        <div className={`${transparent ? 'bg-background/90' : 'bg-background'} h-screen flex flex-col p-5 gap-4`}>
            <Toaster />
            <h2
                data-tauri-drag-region='true'
                className='font-semibold select-none'
            >
                {PROJECT_NAME} · {t('config.about.releases')}
            </h2>
            <Card className='flex-1 overflow-auto'>
                <CardBody className='gap-4'>
                    <p>{t('updater.current_version', { version: appVersion })}</p>
                    <p>{t('config.about.manual_updates')}</p>
                </CardBody>
            </Card>
            <div className='flex flex-wrap justify-end gap-3'>
                <Button
                    color='primary'
                    onPress={async () => {
                        try {
                            await open(RELEASES_URL);
                        } catch (error) {
                            toast.error(String(error), { style: toastStyle });
                        }
                    }}
                >
                    {t('config.about.releases')}
                </Button>
                <Button
                    variant='flat'
                    onPress={() => appWindow.close()}
                >
                    {t('updater.cancel')}
                </Button>
            </div>
        </div>
    );
}
