import * as path from 'path';
import * as vscode from 'vscode';
import { isWindows, getAinPath } from './util';

const config_decompilerPath = 'decompilerPath';
const taskSource = 'AinDecompiler';

export class CompileTaskProvider implements vscode.TaskProvider {
    static taskType = 'system4-compile';

    static register(context: vscode.ExtensionContext, ainPath: string) {
        context.subscriptions.push(
            vscode.tasks.registerTaskProvider(
                CompileTaskProvider.taskType, new CompileTaskProvider(ainPath)));
    }

    constructor(private ainPath: string) {}

    async provideTasks() {
        const task = this.createTask({ type: CompileTaskProvider.taskType });
        return task ? [task] : [];
    }

    resolveTask(task: vscode.Task, token: vscode.CancellationToken) {
        return this.createTask(task.definition);
    }

    private createTask(definition: vscode.TaskDefinition) {
        const decompilerPath = vscode.workspace.getConfiguration('system4').get(config_decompilerPath) as string;
        if (!decompilerPath) return;
        let jafPath = vscode.window.activeTextEditor?.document.uri.fsPath;
        if (!jafPath) return;
        if (isWindows) {
            // AinDecompiler doesn't like upper-case .JAF extension.
            jafPath = jafPath.replace(/\.JAF$/, '.jaf');
        }
        const execution = new vscode.ProcessExecution(decompilerPath, [this.ainPath, jafPath, this.ainPath]);

        return new vscode.Task(
            definition,
            vscode.TaskScope.Workspace,
            'Quick Compile',
            taskSource,
            execution,
        );
    }
}

// Show a prompt to decompile the ain file, unless src/ folder already exists.
export async function maybeShowDecompilePrompt() {
    const taskType = 'system4-decompile';
    if (!isWindows) return;
    const wsUri = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!wsUri) return;
    const srcExists = await vscode.workspace.fs.stat(vscode.Uri.joinPath(wsUri, 'src')).then(() => true, () => false);
    if (srcExists) return;
    const ainPath = await getAinPath(wsUri.fsPath);
    if (!ainPath) return;
    if (await vscode.window.showInformationMessage(`Decompile ${ainPath}?`, 'Yes', 'No') !== 'Yes') return;

    // Let the user to set the location of AinDecompiler if it is not set.
    const config = vscode.workspace.getConfiguration('system4');
    let decompilerPath = config.get(config_decompilerPath) as string | undefined;
    if (!decompilerPath) {
        const msg = 'Select the location of AinDecompiler.exe.';
        if (await vscode.window.showInformationMessage(msg, { modal: true }, 'OK') !== 'OK') return;
        const picked = await vscode.window.showOpenDialog({
            title: 'Set AinDecompiler location',
            filters: { Executable: ['exe'] }
        });
        if (!picked) return;
        decompilerPath = picked[0].fsPath;
        config.update(config_decompilerPath, decompilerPath, vscode.ConfigurationTarget.Global);
    }

    // Run AinDecompiler.
    const pjePath = path.join(path.dirname(ainPath), 'src', path.basename(ainPath, '.ain') + '.pje');
    const execution = new vscode.ProcessExecution(decompilerPath, [ainPath, pjePath]);
    vscode.tasks.executeTask(new vscode.Task(
        { type: taskType },
        vscode.TaskScope.Workspace,
        'Decompile',
        taskSource,
        execution,
    ));

    // Since AinDecompiler generates files in Shift-JIS, set the encoding of
    // the workspace to Shift-JIS.
    vscode.workspace.getConfiguration('').update(
        'files.encoding', 'shiftjis', vscode.ConfigurationTarget.Workspace, true);
}
