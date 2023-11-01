import * as vscode from 'vscode';
import { startClient, stopClient } from './lsp';
import { CompileTaskProvider } from './task';
import { findAin } from './util';

export async function activate(context: vscode.ExtensionContext) {
    const ainPath = await findAin();

    // This asks the user to set the location of system4-lsp if it is not set.
    await startClient(ainPath);
    context.subscriptions.push(
        vscode.commands.registerCommand('system4.server.restart', async () => {
            await stopClient();
            await startClient(ainPath);
        }),
    );
    // This asks the user to set the location of AinDecompiler if it is not set.
    await CompileTaskProvider.register(context, ainPath);
}

export async function deactivate() {
    await stopClient();
}
