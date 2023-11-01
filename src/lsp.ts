import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient/node';
import { getExePath } from './util';

let client: languageclient.LanguageClient | null = null;
const langID = 'system4';
const clientName = 'System4-lsp';
const config_lspPath = 'lspPath';

export async function startClient(ainPath: string | undefined) {
    const lspPath = await getExePath('system4-lsp', config_lspPath, ainPath);
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
