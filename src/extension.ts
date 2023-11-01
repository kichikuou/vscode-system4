import * as vscode from 'vscode';
import { startClient, stopClient } from './lsp';
import { CompileTaskProvider } from './task';
import { findAin } from './util';

export async function activate(context: vscode.ExtensionContext) {
    const ainPath = await findAin();
    CompileTaskProvider.register(context, ainPath);
    context.subscriptions.push(
        vscode.commands.registerCommand('system4.server.restart', async () => {
            await stopClient();
            await startClient(ainPath);
        }),
    );
    await startClient(ainPath);
}

export async function deactivate() {
    await stopClient();
}
