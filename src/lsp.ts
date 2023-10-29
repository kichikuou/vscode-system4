import * as path from 'path';
import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient/node';
import { isWindows, readSjisFile, getAinPath } from './util';

let client: languageclient.LanguageClient | null = null;
const langID = 'system4';
const clientName = 'System4-lsp';
const config_lspPath = 'lspPath';

export async function startClient() {
    const lspPath = await getLspPath();
    if (!lspPath) return;
    const ainPath = await findAin();
    const serverOptions = {
        command: lspPath,
        args: ainPath ? ['--ain', ainPath] : [],
    };
    const clientOptions = {
        documentSelector: [
            {
                scheme: "file",
                language: langID,
            }
        ],
    };
    client = new languageclient.LanguageClient(langID, clientName, serverOptions, clientOptions);
    try {
        await client.start();
    } catch (e) {
        vscode.window.showErrorMessage(`Failed to start ${clientName}.\n${e}`);
    }
}

export async function stopClient() {
    if (client && client.state !== languageclient.State.Stopped) {
        await client.stop();
    }
    client = null;
}

async function getLspPath(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('system4');
    let lspPath = config.get(config_lspPath) as string | undefined;
    if (!lspPath) {
        const exeName = isWindows ? 'system4-lsp.exe' : 'system4-lsp';
        const msg = `Location of ${exeName} is not set.`;
        const pick = 'Set system4-lsp location';
        const cmd = await vscode.window.showWarningMessage(msg, pick);
        if (cmd !== pick) return;
        const opts: vscode.OpenDialogOptions = { title: pick };
        if (isWindows) opts.filters = { Executable: ['exe'] };
        const picked = await vscode.window.showOpenDialog(opts);
        if (!picked) return;
        lspPath = picked[0].fsPath;
        config.update(config_lspPath, lspPath, vscode.ConfigurationTarget.Global);
    }
    return lspPath;
}

async function findAin(): Promise<string | undefined> {
    const wsPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    // Determine the path of the AIN file to be read by several heuristics.
    const possibleDirs = [
        // Workspace root
        Promise.resolve(wsPath),
        // Parent directory of the workspace root
        Promise.resolve(wsPath && path.dirname(wsPath)),
        // `OutputDir` directory of .pje file in the workspace root
        getProjectOutputDir(),
    ];
    for await (const dir of possibleDirs) {
        if (!dir) continue;
        const path = getAinPath(dir);
        if (path) return path;
    }
    return undefined;
}

// Searches for the first file with a `.pje` extension in the current workspace
// and returns the directory path specified in the `OutputDir` field of the file.
async function getProjectOutputDir(): Promise<string | undefined> {
    const pjeFiles = await vscode.workspace.findFiles('*.pje');
    if (pjeFiles.length === 0) return undefined;
    const pjePath = pjeFiles[0].fsPath;
    const pje = await readSjisFile(pjePath);
    const match = pje.match(/^OutputDir\s*=\s*"(.*)"\s*$/m);
    if (!match) return undefined;
    return path.join(path.dirname(pjePath), match[1]);
}
