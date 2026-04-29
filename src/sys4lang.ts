import * as fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import * as path from 'path';
import { unzipSync } from 'fflate';
import * as vscode from 'vscode';
import { log } from './util';
import { getJson, downloadFile } from './xsystem4';

const CONFIG_KEY = 'sys4langPath';
const REPO = 'kichikuou/sys4lang';
const STATE_LAST_UPDATE_CHECK = 'sys4lang.lastUpdateCheck';
const STATE_SKIPPED_VERSION = 'sys4lang.skippedVersion';
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const VERSION_FILE = '.version';
const KNOWN_BINARIES = ['sys4c', 'sys4dc', 'sys4lsp'];

let _context: vscode.ExtensionContext;

export function init(context: vscode.ExtensionContext) {
    _context = context;
}

function getInstallDir(): string {
    return path.join(_context.globalStorageUri.fsPath, 'sys4lang');
}

function getPlatformAssetSuffix(): 'windows-x64' | 'linux-x64' | undefined {
    if (process.arch !== 'x64') return undefined;
    if (process.platform === 'win32') return 'windows-x64';
    if (process.platform === 'linux') return 'linux-x64';
    return undefined;
}

async function getInstalledVersion(): Promise<string | undefined> {
    try {
        const v = await fs.readFile(path.join(getInstallDir(), VERSION_FILE), 'utf-8');
        return v.trim() || undefined;
    } catch {
        return undefined;
    }
}

interface ReleaseAsset {
    tag: string;
    name: string;
    url: string;
}

async function getLatestReleaseForPlatform(): Promise<ReleaseAsset | undefined> {
    const suffix = getPlatformAssetSuffix();
    if (!suffix) return undefined;
    const info = await getJson(`https://api.github.com/repos/${REPO}/releases/latest`);
    const tag: string = info.tag_name;
    const assetSuffix = `-${suffix}.zip`;
    const asset = info.assets?.find((a: any) =>
        typeof a.name === 'string' && a.name.endsWith(assetSuffix));
    if (!asset) return undefined;
    return { tag, name: asset.name, url: asset.browser_download_url };
}

async function downloadAndInstall(release: ReleaseAsset): Promise<void> {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Downloading sys4lang ${release.tag}...`,
        cancellable: false,
    }, async (progress) => {
        log.info(`Downloading sys4lang from ${release.url}`);
        progress.report({ increment: 0, message: 'Downloading...' });

        let lastPercentage = 0;
        const zipBuffer = await downloadFile(release.url, (downloaded, total) => {
            const percentage = Math.floor((downloaded / total) * 100);
            const increment = percentage - lastPercentage;
            if (increment > 0) {
                progress.report({ increment });
                lastPercentage = percentage;
            }
        });
        progress.report({ increment: 100 - lastPercentage });

        progress.report({ message: 'Extracting...' });
        const unzipped = unzipSync(zipBuffer);

        const installDir = getInstallDir();
        const tmpDir = installDir + '.new';
        await fs.rm(tmpDir, { recursive: true, force: true });
        await fs.mkdir(tmpDir, { recursive: true });

        // Detect a single top-level directory in the zip and strip it,
        // so that binaries land directly under installDir.
        const fileEntries = Object.entries(unzipped).filter(
            ([key, data]) => !(key.endsWith('/') && data.length === 0));
        const topSegments = new Set(fileEntries.map(([key]) => key.split('/')[0]));
        const stripPrefix =
            topSegments.size === 1 && fileEntries.every(([key]) => key.includes('/'))
                ? [...topSegments][0] + '/'
                : '';

        for (const [relativePath, data] of Object.entries(unzipped)) {
            let stripped = relativePath;
            if (stripPrefix && stripped.startsWith(stripPrefix)) {
                stripped = stripped.slice(stripPrefix.length);
            }
            if (!stripped) continue;
            const fullPath = path.join(tmpDir, stripped);
            if (data.length === 0 && relativePath.endsWith('/')) {
                await fs.mkdir(fullPath, { recursive: true });
            } else {
                await fs.mkdir(path.dirname(fullPath), { recursive: true });
                await fs.writeFile(fullPath, data);
            }
        }

        if (process.platform !== 'win32') {
            for (const name of KNOWN_BINARIES) {
                for (const ext of ['', '.exe']) {
                    try {
                        await fs.chmod(path.join(tmpDir, name + ext), 0o755);
                    } catch {}
                }
            }
        }

        await fs.writeFile(path.join(tmpDir, VERSION_FILE), release.tag);

        await fs.rm(installDir, { recursive: true, force: true });
        await fs.rename(tmpDir, installDir);

        log.info(`sys4lang ${release.tag} installed to ${installDir}`);
        progress.report({ message: 'Completed!' });
    });
}

async function promptManualLocation(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('system4');
    const pick = 'Set sys4lang location';
    const cmd = await vscode.window.showWarningMessage('Cannot find sys4lang.', pick);
    if (cmd !== pick) return undefined;
    const picked = await vscode.window.showOpenDialog({
        title: 'Select a directory containing sys4c, sys4dc, and sys4lsp',
        canSelectFiles: false,
        canSelectFolders: true,
    });
    if (!picked) return undefined;
    const configuredPath = picked[0].fsPath;
    await config.update(CONFIG_KEY, configuredPath, vscode.ConfigurationTarget.Global);
    return configuredPath;
}

export async function getExePath(name: string): Promise<string | undefined> {
    const dir = await getSys4langDir();
    if (!dir) return undefined;

    for (const ext of ['', '.exe']) {
        const fullPath = path.join(dir, name + ext);
        try {
            await fs.access(fullPath, fsConstants.X_OK);
            return fullPath;
        } catch {}
    }
    vscode.window.showErrorMessage(`Cannot find ${name} executable in ${dir}.`);
    return undefined;
}

export async function getSys4langDir(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('system4');
    const configuredPath = config.get(CONFIG_KEY) as string | undefined;
    if (configuredPath) return configuredPath;

    if (await getInstalledVersion()) return getInstallDir();

    const platform = getPlatformAssetSuffix();
    if (platform) {
        const choice = await vscode.window.showInformationMessage(
            'sys4lang is not installed. Do you want to download the latest version from GitHub?',
            'Yes', 'No');
        if (choice === 'Yes') {
            try {
                const release = await getLatestReleaseForPlatform();
                if (!release) {
                    vscode.window.showErrorMessage(
                        `No sys4lang release found for ${platform}.`);
                } else {
                    await downloadAndInstall(release);
                    return getInstallDir();
                }
            } catch (e: any) {
                log.error(e);
                vscode.window.showErrorMessage(
                    `Failed to download sys4lang: ${e.message}`);
            }
        }
    }

    return await promptManualLocation();
}

export interface UpdateLifecycle {
    onBeforeInstall: () => Promise<void>;
    onAfterInstall: () => Promise<void>;
}

export async function checkForUpdates(lifecycle: UpdateLifecycle): Promise<void> {
    const config = vscode.workspace.getConfiguration('system4');
    if (config.get(CONFIG_KEY)) return;
    if (!getPlatformAssetSuffix()) return;

    const current = await getInstalledVersion();
    if (!current) return;

    const lastCheck = _context.globalState.get<number>(STATE_LAST_UPDATE_CHECK, 0);
    if (Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) return;

    let latest: ReleaseAsset | undefined;
    try {
        latest = await getLatestReleaseForPlatform();
    } catch (e: any) {
        log.warn(`sys4lang update check failed: ${e.message}`);
        return;
    }
    await _context.globalState.update(STATE_LAST_UPDATE_CHECK, Date.now());

    if (!latest || latest.tag === current) return;

    const skipped = _context.globalState.get<string>(STATE_SKIPPED_VERSION);
    if (skipped === latest.tag) return;

    const choice = await vscode.window.showInformationMessage(
        `A new version of sys4lang is available: ${current} → ${latest.tag}. Update now?`,
        'Update', 'Skip this version', 'Later');

    if (choice === 'Update') {
        await lifecycle.onBeforeInstall();
        try {
            await downloadAndInstall(latest);
        } catch (e: any) {
            log.error(e);
            vscode.window.showErrorMessage(`Failed to update sys4lang: ${e.message}`);
        }
        await lifecycle.onAfterInstall();
    } else if (choice === 'Skip this version') {
        await _context.globalState.update(STATE_SKIPPED_VERSION, latest.tag);
    }
}
