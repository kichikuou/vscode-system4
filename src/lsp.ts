import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient/node';
import { getExePath, ProjectPaths } from './util';

let client: languageclient.LanguageClient | null = null;
const langID = 'system4';
const clientName = 'System4-lsp';
const config_lspPath = 'lspPath';

interface InitializationOptions {
    ainPath?: string;
    srcDir?: string;
}

export async function startClient(paths: ProjectPaths) {
    const lspPath = await getExePath('system4-lsp', config_lspPath, paths.ainPath);
    if (!lspPath) return;
    const serverOptions = {
        command: lspPath,
        args: paths.ainPath ? ['--ain', paths.ainPath] : [],  // TODO: Remove this line after a few releases.
    };
    const initializationOptions: InitializationOptions = Object.assign({}, paths);
    const clientOptions = {
        documentSelector: [
            {
                scheme: "file",
                language: langID,
            }
        ],
        initializationOptions
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
