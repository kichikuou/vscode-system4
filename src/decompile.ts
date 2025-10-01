import * as vscode from 'vscode';
import { log, getExePath } from './util';

export async function decompileWorkspace() {
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) {
		vscode.window.showErrorMessage('No workspace folder.');
		return;
	}
	if (await hasMatchingFiles(folder, 'src/*.pje')) {
		const selected = await vscode.window.showWarningMessage(
			'"src" folder already exists. Decompile anyway?', {modal: true}, 'Yes');
		if (selected !== 'Yes') {
			return;
		}
	}
    const ainFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '*.[aA][iI][nN]'));
    if (ainFiles.length === 0) {
        vscode.window.showErrorMessage('No .ain files found in the workspace root.');
        return;
    }
    if (ainFiles.length > 1) {
        vscode.window.showErrorMessage('Multiple .ain files found in the workspace root.');
        return;
    }
    const ainPath = ainFiles[0].fsPath;
    const decompilerPath = await getExePath('sys4dc');
    if (!decompilerPath) {
        log.warn('Could not find sys4dc.');
        return;
    }
    const args = ['-o', 'src', ainPath];
    const execution = new vscode.ShellExecution(decompilerPath, args);
	const task = new vscode.Task(
		{ type: 'system4-decompile' }, vscode.TaskScope.Workspace, 'decompile', 'system4', execution);

	const exitCodePromise = new Promise<number | undefined>(resolve => {
		let disposable = vscode.tasks.onDidEndTaskProcess(e => {
			if (e.execution.task === task) {
				disposable.dispose();
				resolve(e.exitCode);
			}
		});
	});
    vscode.tasks.executeTask(task);
    const exitCode = await exitCodePromise;
    if (exitCode !== 0) {
        vscode.window.showErrorMessage('Decompilation failed. See terminal log for details.');
    }
}

async function hasMatchingFiles(folder: vscode.WorkspaceFolder, pattern: string): Promise<boolean> {
    const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, pattern), null, 1);
    return files.length > 0;
}
