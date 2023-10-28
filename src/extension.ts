import * as fs from 'fs';
import * as path from 'path';
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
    const lspPath = getLspPath();
    const ainPath = await findAin();
    const serverOptions = {
        command: await lspPath,
        args: ainPath ? ['--ain', ainPath] : [],
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

async function findAin(): Promise<string | undefined> {
    const wsPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    // Determine the path of the AIN file to be read by several heuristics.
    const possibleDirs = [
        // Workspace root
        Promise.resolve(wsPath),
        // Parent directory of the workspace root
        Promise.resolve(wsPath && path.dirname(wsPath)),
        // `OutputDir` directory of .pje file in the workspace root
        getProjectOutputDir(),
    ];
    for await (const dir of possibleDirs) {
        if (!dir) continue;
        try {
            // Return the ain path written in AliceStart.ini or System40.ini.
            let ini = await Promise.any([
                readSjisFile(`${dir}/AliceStart.ini`),
                readSjisFile(`${dir}/System40.ini`),
            ]);
            const match = ini.match(/^CodeName\s*=\s*"(.*)"\s*$/m);
            return match ? `${dir}/${match[1]}` : undefined;
        } catch (_) {}
    }
    return undefined;
}

// Searches for the first file with a `.pje` extension in the current workspace
// and returns the directory path specified in the `OutputDir` field of the file.
async function getProjectOutputDir(): Promise<string | undefined> {
    const pjeFiles = await vscode.workspace.findFiles('*.pje');
    if (pjeFiles.length === 0) return undefined;
    const pjePath = pjeFiles[0].fsPath;
    const pje = await readSjisFile(pjePath);
    const match = pje.match(/^OutputDir\s*=\s*"(.*)"\s*$/m);
    if (!match) return undefined;
    return path.join(path.dirname(pjePath), match[1]);
}

async function readSjisFile(path: string): Promise<string> {
    const content = await fs.promises.readFile(path);
    return new TextDecoder('shift_jis').decode(content);
}
