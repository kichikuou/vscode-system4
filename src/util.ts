import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export const isWindows = process.platform === "win32";

async function readSjisFile(path: string): Promise<string> {
    const content = await fs.promises.readFile(path);
    return new TextDecoder('shift_jis').decode(content);
}

export async function findAin(): Promise<string | undefined> {
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
            // Return the ain file specified in AliceStart.ini or System40.ini.
            let ini = await Promise.any([
                readSjisFile(path.join(dir, 'AliceStart.ini')),
                readSjisFile(path.join(dir, 'System40.ini')),
            ]);
            const match = ini.match(/^CodeName\s*=\s*"(.*)"\s*$/m);
            if (match) return path.join(dir, match[1]);
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

export async function getExePath(name: string, configName: string, ainPath: string | undefined): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('system4');
    let configuredPath = config.get(configName) as string | undefined;
    if (configuredPath) return configuredPath;

    const exeName = isWindows ?  name + '.exe' : name;
    // If `${ainDir}/system4-lsp/${exeName}` exists, use it.
    if (ainPath) {
        const exePath = path.join(path.dirname(ainPath), name, exeName);
        try {
            await fs.promises.access(exePath, fs.constants.X_OK);
            return exePath;
        } catch (_) {}
    }

    const msg = `Cannot find ${exeName}.`;
    const pick = `Set ${name} location`;
    const cmd = await vscode.window.showWarningMessage(msg, pick);
    if (cmd !== pick) return;
    const opts: vscode.OpenDialogOptions = { title: pick };
    if (isWindows) opts.filters = { Executable: ['exe'] };
    const picked = await vscode.window.showOpenDialog(opts);
    if (!picked) return;
    configuredPath = picked[0].fsPath;
    config.update(configName, configuredPath, vscode.ConfigurationTarget.Global);
    return configuredPath;
}
