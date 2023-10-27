import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient/node';

let client: languageclient.LanguageClient;
const langID = 'system4';
const clientName = 'System4-lsp';

export function activate(context: vscode.ExtensionContext) {
    try {
        const serverOptions = {
            command: getLspPath(),
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
        context.subscriptions.push(client.start());
    } catch (e) {
        vscode.window.showErrorMessage(`${clientName} couldn't be started.`);
    }
}

export function deactivate() {
    if (client) return client.stop();
}

function getLspPath(): string {
    const configPath = vscode.workspace.getConfiguration('system4').lspPath;
    if (configPath) return configPath;
    const folder = vscode.workspace.workspaceFolders?.[0];
    return folder ? `${folder.uri.fsPath}/system4-lsp/system4-lsp.exe` : 'system4-lsp.exe';
}
