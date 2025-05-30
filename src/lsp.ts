import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient/node';
import { log, getExePath, ProjectInfo } from './util';

let client: languageclient.LanguageClient | null = null;
const langID = 'system4';
const clientName = 'System4-lsp';
const config_lspPath = 'lspPath';

interface InitializationOptions {
    ainPath?: string;
    srcDir?: string;
    srcEncoding?: string;
}

export async function startClient(proj: ProjectInfo) {
    const lspPath = await getExePath('system4-lsp', config_lspPath, proj.ainPath);
    if (!lspPath) {
        log.warn('startClient: could not find system4-lsp.');
        return;
    }
    const serverOptions = { command: lspPath };
    const initializationOptions: InitializationOptions = Object.assign({}, proj);
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
        log.info(`${lspPath} started.`);
    } catch (e) {
        vscode.window.showErrorMessage(`Failed to start ${clientName}.\n${e}`);
        log.error(e as Error);
    }
}

export async function stopClient() {
    if (client && client.state !== languageclient.State.Stopped) {
        await client.stop();
        log.info('system4-lsp stopped.');
    }
    client = null;
}
