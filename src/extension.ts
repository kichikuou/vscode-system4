import * as vscode from 'vscode';
import * as languageclient from 'vscode-languageclient/node';

let client: languageclient.LanguageClient;
const langID = 'system4';
const clientName = 'System4-mode';

export function activate(context: vscode.ExtensionContext) {
    try {
        const lspPath = vscode.workspace.getConfiguration('system4').lspPath;
        const serverOptions = {
            command: lspPath,
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
