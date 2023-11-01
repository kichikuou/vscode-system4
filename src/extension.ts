import * as vscode from 'vscode';
import { startClient, stopClient } from './lsp';
import { CompileTaskProvider } from './task';
import { getAinPath } from './util';

export async function activate(context: vscode.ExtensionContext) {
    const wsPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (wsPath) {
        const ainPath = await getAinPath(wsPath);
        if (ainPath) {
            CompileTaskProvider.register(context, ainPath);
        }
    }
    context.subscriptions.push(
        vscode.commands.registerCommand('system4.server.restart', async () => {
            await stopClient();
            await startClient();
        }),
    );
    await startClient();
}

export async function deactivate() {
    await stopClient();
}
