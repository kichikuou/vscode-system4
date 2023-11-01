import * as vscode from 'vscode';
import { isWindows } from './util';

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
        if (!await getDecompilerPath()) return [];
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

async function getDecompilerPath(): Promise<string | undefined> {
    const config = vscode.workspace.getConfiguration('system4');
    let decompilerPath = config.get(config_decompilerPath) as string | undefined;
    if (!decompilerPath) {
        const msg = 'Location of AinDecompiler.exe is not set.';
        const pick = 'Set AinDecompiler location';
        const cmd = await vscode.window.showWarningMessage(msg, pick);
        if (cmd !== pick) return;
        const picked = await vscode.window.showOpenDialog({
            title: 'Set AinDecompiler location',
            filters: { Executable: ['exe'] }
        });
        if (!picked) return;
        decompilerPath = picked[0].fsPath;
        config.update(config_decompilerPath, decompilerPath, vscode.ConfigurationTarget.Global);
    }
    return decompilerPath;
}
