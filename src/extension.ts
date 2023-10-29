import * as vscode from 'vscode';
import { startClient, stopClient } from './lsp';

export async function activate(context: vscode.ExtensionContext) {
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
