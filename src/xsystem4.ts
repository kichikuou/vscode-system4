import * as https from 'https';
import * as fs from 'fs/promises';
import * as path from 'path';
import { unzipSync } from 'fflate';
import * as vscode from 'vscode';
import { log } from './util';

const config_xsystem4Path = 'xsystem4Path';

export async function getXsystem4Path(): Promise<string> {
    const defaultPath = 'xsystem4';  // We need to return something.

    // If the path is configured, use it.
    const config = vscode.workspace.getConfiguration('system4');
    let configuredPath = config.get(config_xsystem4Path) as string | undefined;
    if (configuredPath) {
        return configuredPath;
    }

    // On Windows, search for xsystem4*/xsystem4.exe in the workspace.
    if (process.platform === 'win32') {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            return defaultPath;
        }
        const exeFiles = await vscode.workspace.findFiles('xsystem4*/xsystem4.exe');
        if (exeFiles.length > 0) {
            const exePaths = exeFiles.map(f => f.fsPath);
            exePaths.sort();
            return exePaths[exePaths.length - 1];
        }

        const choice = await vscode.window.showInformationMessage(
            'xsystem4.exe is not found in this workspace. Do you want to download the latest version from GitHub?',
            'Yes', 'No'
        );
        if (choice === 'Yes') {
            const newPath = await downloadAndExtractXsystem4(folder.uri.fsPath);
            if (newPath) {
                await config.update(config_xsystem4Path, newPath, vscode.ConfigurationTarget.Workspace);
                return newPath;
            }
        }
    }

    // Prompt the user to select xsystem4 path.
    const exeName = process.platform === 'win32' ? 'xsystem4.exe' : 'xsystem4';
    const selected = await vscode.window.showInformationMessage(
        `Path to xsystem4 is not set. Please select ${exeName}.`,
        { modal: true }, 'Select File');
    if (selected !== 'Select File') {
        return defaultPath;
    }
    const options: vscode.OpenDialogOptions = {
        canSelectMany: false,
        openLabel: `Select ${exeName}`,
    };
    if (process.platform === 'win32') {
        options.filters = { 'Executables': ['exe'] };
    }
    const uris = await vscode.window.showOpenDialog(options);
    if (!uris || uris.length === 0) {
        return defaultPath;
    }
    configuredPath = uris[0].fsPath;
    await config.update(config_xsystem4Path, configuredPath, vscode.ConfigurationTarget.Workspace);
    return configuredPath;
}

async function downloadAndExtractXsystem4(basePath: string): Promise<string | undefined> {
    try {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Downloading xsystem4...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Fetching release info...' });

            log.info('Fetching the latest release from GitHub...');
            const releaseInfo = await getJson('https://api.github.com/repos/nunuhara/xsystem4/releases/latest');
            const asset = releaseInfo.assets?.find((a: any) => a.name.startsWith('xsystem4-') && a.name.endsWith('.zip'));
            if (!asset) {
                throw new Error('No suitable zip asset found in the latest release.');
            }

            log.info(`Downloading from ${asset.browser_download_url}`);
            progress.report({ message: 'Downloading zip...' });

            let lastPercentage = 0;
            const zipBuffer = await downloadFile(asset.browser_download_url, (downloaded, total) => {
                const percentage = Math.floor((downloaded / total) * 100);
                const increment = percentage - lastPercentage;
                if (increment > 0) {
                    progress.report({ increment });
                    lastPercentage = percentage;
                }
            });

            progress.report({ increment: 100 - lastPercentage });

            log.info('Extracting files...');
            progress.report({ message: 'Extracting...' });
            const unzipped = unzipSync(zipBuffer);

            let exePath: string | undefined;
            for (const [relativePath, data] of Object.entries(unzipped)) {
                const fullPath = path.join(basePath, relativePath);
                if (data.length === 0 && relativePath.endsWith('/')) { // Directory
                    await fs.mkdir(fullPath, { recursive: true });
                } else { // File
                    await fs.mkdir(path.dirname(fullPath), { recursive: true });
                    await fs.writeFile(fullPath, data);
                    if (path.basename(fullPath) === 'xsystem4.exe') {
                        exePath = fullPath;
                    }
                }
            }

            if (!exePath) {
                throw new Error('xsystem4.exe not found in the extracted files.');
            }

            log.info(`xsystem4 extracted to ${exePath}`);
            progress.report({ message: 'Completed!' });
            return exePath;
        });
    } catch (e: any) {
        log.error(e);
        vscode.window.showErrorMessage(`Failed to download xsystem4: ${e.message}`);
        return undefined;
    }
}

function getJson(url: string): Promise<any> {
    const options = {
        headers: { 'User-Agent': 'vscode-system4-extension' }
    };
    return new Promise((resolve, reject) => {
        https.get(url, options, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                if (res.headers.location) {
                    resolve(getJson(res.headers.location));
                } else {
                    reject(new Error('Redirected but no location header.'));
                }
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to get JSON: ${res.statusCode} ${res.statusMessage}`));
                return;
            }
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function downloadFile(url: string, onProgress?: (downloaded: number, total: number) => void): Promise<Buffer> {
    const options = {
        headers: { 'User-Agent': 'vscode-system4-extension' }
    };
    return new Promise((resolve, reject) => {
        https.get(url, options, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                if (res.headers.location) {
                    resolve(downloadFile(res.headers.location, onProgress));
                } else {
                    reject(new Error('Redirected but no location header.'));
                }
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error(`Download failed: ${res.statusCode} ${res.statusMessage}`));
                return;
            }
            const total = res.headers['content-length'] ? parseInt(res.headers['content-length'], 10) : 0;
            let downloaded = 0;
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => {
                chunks.push(chunk);
                downloaded += chunk.length;
                if (onProgress && total > 0) {
                    onProgress(downloaded, total);
                }
            });
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}
