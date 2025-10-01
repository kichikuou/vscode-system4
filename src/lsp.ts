import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient/node';
import { log, getExePath, ProjectInfo } from './util';

let client: languageclient.LanguageClient | null = null;
const langID = 'system4';
const clientName = 'sys4lsp';

interface InitializationOptions {
    ainPath?: string;
    srcDir?: string;
    srcEncoding?: string;
}

export async function startClient(proj: ProjectInfo) {
    const lspPath = await getExePath('sys4lsp');
    if (!lspPath) {
        log.warn('startClient: could not find sys4lsp.');
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
        log.info('sys4lsp stopped.');
    }
    client = null;
}
