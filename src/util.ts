import * as fs from 'fs';
import * as path from 'path';

export const isWindows = process.platform === "win32";

export async function readSjisFile(path: string): Promise<string> {
    const content = await fs.promises.readFile(path);
    return new TextDecoder('shift_jis').decode(content);
}

export async function getAinPath(dir: string): Promise<string | undefined> {
    try {
        // Return the ain file specified in AliceStart.ini or System40.ini.
        let ini = await Promise.any([
            readSjisFile(path.join(dir, 'AliceStart.ini')),
            readSjisFile(path.join(dir, 'System40.ini')),
        ]);
        const match = ini.match(/^CodeName\s*=\s*"(.*)"\s*$/m);
        return match ? path.join(dir, match[1]) : undefined;
    } catch (_) {}
    return undefined;
}
