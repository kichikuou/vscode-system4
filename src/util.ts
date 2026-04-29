import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export const log = vscode.window.createOutputChannel('System4 extension', { log: true });

async function readSjisFile(path: string): Promise<string> {
    const content = await fs.promises.readFile(path);
    return new TextDecoder('shift_jis').decode(content);
}

export interface ProjectInfo {
    pjePath?: string;
    ainPath?: string;
    srcDir?: string;
    srcEncoding?: string;
}

export async function getProjectInfo(): Promise<ProjectInfo> {
    const pje = await readProjectFile();
    return {
        pjePath: pje?.pjePath,
        ainPath: await findAin(pje),
        srcDir: pje?.sourceDir,
        srcEncoding: pje?.encoding,
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
    pjePath?: string;
    sourceDir?: string;
    outputDir?: string;
    encoding?: string;
}

// Parses the first `.pje` file found in the current workspace.
async function readProjectFile(): Promise<Pje | undefined> {
    const pjeFiles = await vscode.workspace.findFiles('**/*.pje', undefined, 1);
    if (pjeFiles.length === 0) return undefined;
    const pjePath = pjeFiles[0].fsPath;
    log.info('Reading project information from ', pjePath);
    const pje = await readSjisFile(pjePath);
    const result : Pje = { pjePath };
    for (const m of pje.matchAll(/^(\w+)\s*=\s*"(.*)"\s*$/gm)) {
        switch (m[1]) {
            case 'SourceDir':
                result.sourceDir = path.join(path.dirname(pjePath), m[2]);
                break;
            case 'OutputDir':
                result.outputDir = path.join(path.dirname(pjePath), m[2]);
                break;
            case 'Encoding':
                result.encoding = m[2];
                break;
        }
    }
    return result;
}

