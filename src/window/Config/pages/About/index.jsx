import { Divider, Button } from '@nextui-org/react';
import { appLogDir, appConfigDir } from '@tauri-apps/api/path';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/api/shell';
import { invoke } from '@tauri-apps/api';
import React from 'react';
import { appVersion } from '../../../../utils/env';
import { PROJECT_NAME, PROJECT_URL, ISSUES_URL, UPSTREAM_URL } from '../../../../utils/project';

export default function About() {
    const { t } = useTranslation();
    return (
        <div className='h-full w-full overflow-auto py-12 px-6 sm:px-12'>
            <img
                src='icon.png'
                alt={PROJECT_NAME}
                className='mx-auto h-[100px] mb-2'
                draggable={false}
            />
            <div className='max-w-xl mx-auto space-y-4 text-center'>
                <h1 className='font-bold text-2xl'>{PROJECT_NAME}</h1>
                <p className='text-sm text-default-500'>v{appVersion}</p>
                <p>{t('config.about.fork_description')}</p>
                <Divider />
                <div className='flex flex-wrap justify-center gap-2'>
                    <Button
                        variant='flat'
                        onPress={() => open(PROJECT_URL)}
                    >
                        {t('config.about.github')}
                    </Button>
                    <Button
                        variant='flat'
                        onPress={() => open(ISSUES_URL)}
                    >
                        {t('config.about.feedback')}
                    </Button>
                    <Button
                        color='primary'
                        onPress={() => invoke('updater_window')}
                    >
                        {t('config.about.releases')}
                    </Button>
                </div>
                <p className='text-sm text-default-500'>{t('config.about.manual_updates')}</p>
                <Divider />
                <div className='flex flex-wrap justify-center gap-2'>
                    <Button
                        variant='light'
                        onPress={async () => open(await appLogDir())}
                    >
                        {t('config.about.view_log')}
                    </Button>
                    <Button
                        variant='light'
                        onPress={async () => open(await appConfigDir())}
                    >
                        {t('config.about.view_config')}
                    </Button>
                    <Button
                        variant='light'
                        onPress={() => open(UPSTREAM_URL)}
                    >
                        {t('config.about.upstream')}
                    </Button>
                </div>
                <p className='text-sm text-default-500'>{t('config.about.attribution')}</p>
            </div>
        </div>
    );
}
