import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient/node';
import { isWindows } from './util';

let client: languageclient.LanguageClient | null = null;
const langID = 'system4';
const clientName = 'System4-lsp';
const config_lspPath = 'lspPath';

export async function startClient(ainPath: string | undefined) {
    const lspPath = await getLspPath();
    if (!lspPath) return;
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
