import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const tauri = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo = read('src-tauri/Cargo.toml');
const lock = read('src-tauri/Cargo.lock');
const cargoVersion = cargo.match(/^version = "([^"]+)"/m)?.[1];
const lockedVersion = lock.match(/\[\[package\]\]\s+name = "pot"\s+version = "([^"]+)"/)?.[1];
assert.equal(pkg.name, 'pot-guling');
assert.equal(tauri.package.productName, 'pot-guling');
assert.equal(tauri.tauri.bundle.identifier, 'com.guling.pot');
for (const version of [tauri.package.version, cargoVersion, lockedVersion]) {
    assert.equal(version, pkg.version, 'Project versions must agree');
}
assert.equal(tauri.tauri.updater.active, false, 'Signed fork updates are not configured');
assert.equal(tauri.tauri.updater.endpoints?.length ?? 0, 0, 'Do not use upstream update endpoints');
for (const file of readdirSync(new URL('../src-tauri/', import.meta.url))) {
    if (!/^(tauri.*|webview.*)\.json$/.test(file)) continue;
    const updater = JSON.parse(read('src-tauri/' + file)).tauri?.updater;
    if (!updater) continue;
    assert.equal(updater.active, false, `${file} must not reactivate automatic updates`);
    assert.equal(updater.endpoints?.length ?? 0, 0, `${file} must not supply update endpoints`);
}
assert.ok(cargo.includes('repository = "https://github.com/shen1950/pot-desktop"'));
console.log(`pot-guling ${pkg.version}: metadata and manual-update configuration verified`);
