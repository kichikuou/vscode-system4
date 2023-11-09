import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export const isWindows = process.platform === "win32";
export const log = vscode.window.createOutputChannel('System4 extension', { log: true });

async function readSjisFile(path: string): Promise<string> {
    const content = await fs.promises.readFile(path);
    return new TextDecoder('shift_jis').decode(content);
}

export interface ProjectPaths {
    ainPath?: string;
    srcDir?: string;
}

export async function getProjectPaths(): Promise<ProjectPaths> {
    const pje = await readProjectFile();
    return {
        ainPath: await findAin(pje),
        srcDir: pje?.sourceDir,
    }
}

async function findAin(pje: Pje | undefined): Promise<string | undefined> {
    const wsPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    // Determine the path of the AIN file to be read by several heuristics.
    const possibleDirs = [
        // Workspace root
        Promise.resolve(wsPath),
        // Parent directory of the workspace root
        Promise.resolve(wsPath && path.dirname(wsPath)),
        // `OutputDir` directory of .pje file
        pje?.outputDir,
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
    log.warn('Cannot find AIN file.');
    return undefined;
}

interface Pje {
    sourceDir?: string;
    outputDir?: string;
}

// Parses the first `.pje` file found in the current workspace.
async function readProjectFile(): Promise<Pje | undefined> {
    const pjeFiles = await vscode.workspace.findFiles('**/*.pje', undefined, 1);
    if (pjeFiles.length === 0) return undefined;
    const pjePath = pjeFiles[0].fsPath;
    log.info('Reading project information from ', pjePath);
    const pje = await readSjisFile(pjePath);
    const result : Pje = {};
    for (const m of pje.matchAll(/^(\w+)\s*=\s*"(.*)"\s*$/gm)) {
        switch (m[1]) {
            case 'SourceDir':
                result.sourceDir = path.join(path.dirname(pjePath), m[2]);
                break;
            case 'OutputDir':
                result.outputDir = path.join(path.dirname(pjePath), m[2]);
                break;
        }
    }
    return result;
}

export async function getExePath(name: string, configName: string, ainPath: string | undefined): Promise<string | undefined> {
    // If the path is configured, use it.
    const config = vscode.workspace.getConfiguration('system4');
    let configuredPath = config.get(configName) as string | undefined;
    if (configuredPath) return configuredPath;

    const exeName = isWindows ?  name + '.exe' : name;

    // If the bundled `${name}/${exeName}` exists, use it.
    const bundledPath = path.join(__dirname, '..', name, exeName);
    try {
        await fs.promises.access(bundledPath, fs.constants.X_OK);
        return bundledPath;
    } catch (_) {}

    // If `${ainDir}/${name}/${exeName}` exists, use it.
    if (ainPath) {
        const exePath = path.join(path.dirname(ainPath), name, exeName);
        try {
            await fs.promises.access(exePath, fs.constants.X_OK);
            return exePath;
        } catch (_) {}
    }

    // Prompt the user to set the path.
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
