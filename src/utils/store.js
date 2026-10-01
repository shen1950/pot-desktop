import { Store } from 'tauri-plugin-store-api';
import { appConfigDir, join } from '@tauri-apps/api/path';
import { watch } from 'tauri-plugin-fs-watch-api';
import { invoke } from '@tauri-apps/api';

export let store = new Store();

export async function initStore() {
    const appConfigDirPath = await appConfigDir();
    const appConfigPath = await join(appConfigDirPath, 'config.json');
    store = new Store(appConfigPath);
    const _ = await watch(appConfigPath, async () => {
        // 配置文件在磁盘上变化时刷新内存 Store 与 Rust 侧缓存；
        // 注意：不要在这里 emit config_file_changed，应用自身保存也会触发 watch，
        // 会导致输入字体等场景下组件被反复重挂载。恢复备份的事件由 Rust 端单独发出。
        await store.load();
        await invoke('reload_store');
    });
}
