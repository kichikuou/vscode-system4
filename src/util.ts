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
