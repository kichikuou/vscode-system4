import * as fs from 'fs';
import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient/node';

let client: languageclient.LanguageClient | null = null;
const langID = 'system4';
const clientName = 'System4-lsp';
const isWindows = process.platform === "win32";

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

async function startClient() {
    const serverOptions = {
        command: await getLspPath(),
        args: []
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

async function stopClient() {
    if (client && client.state !== languageclient.State.Stopped) {
        await client.stop();
    }
    client = null;
}

async function getLspPath(): Promise<string> {
    // If system4.lspPath configuration is set, return it.
    const configPath = vscode.workspace.getConfiguration('system4').lspPath;
    if (configPath) return configPath;

    // If ${workspaceFolder}/system4-lsp/system4-lsp exists, return it.
    const exeName = isWindows ? 'system4-lsp.exe' : 'system4-lsp';
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (folder) {
        let path = `${folder.uri.fsPath}/system4-lsp/${exeName}`;
        try {
            await fs.promises.access(path, fs.constants.X_OK);
            return path;
        } catch (_) {}
    }

    // Otherwise, return "system4-lsp" hoping it is in PATH.
    return exeName;
}
