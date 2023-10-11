"use strict";
const vscode = require("vscode");
const languageclient = require("vscode-languageclient/node");

let client;
const langID = 'system4';
const clientName = 'System4-mode';

function activate(context) {
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

function deactivate() {
    if (client) return client.stop();
}

module.exports = { activate, deactivate }