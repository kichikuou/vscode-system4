import * as vscode from 'vscode';
import { log, isWindows, getExePath } from './util';

const config_decompilerPath = 'decompilerPath';
const taskSource = 'AinDecompiler';

export class CompileTaskProvider implements vscode.TaskProvider {
    static taskType = 'system4-compile';

    static async register(context: vscode.ExtensionContext, ainPath: string | undefined) {
        if (!ainPath) return;
        const decompilerPath = await getExePath('AinDecompiler', config_decompilerPath, ainPath);
        if (!decompilerPath) {
            log.warn('CompileTaskProvider: could not find AinDecompiler.');
            return;
        }
        context.subscriptions.push(
            vscode.tasks.registerTaskProvider(
                CompileTaskProvider.taskType, new CompileTaskProvider(ainPath, decompilerPath)));
        log.info('CompileTaskProvider registered.');
    }

    constructor(private ainPath: string, private decompilerPath: string) {}

    async provideTasks() {
        const task = this.createTask({ type: CompileTaskProvider.taskType });
        return task ? [task] : [];
    }

    resolveTask(task: vscode.Task, token: vscode.CancellationToken) {
        return this.createTask(task.definition);
    }

    private createTask(definition: vscode.TaskDefinition) {
        let jafPath = vscode.window.activeTextEditor?.document.uri.fsPath;
        if (!jafPath) return;
        if (isWindows) {
            // AinDecompiler doesn't like upper-case .JAF extension.
            jafPath = jafPath.replace(/\.JAF$/, '.jaf');
        }
        const execution = new vscode.ProcessExecution(this.decompilerPath, [this.ainPath, jafPath, this.ainPath]);

        const task = new vscode.Task(
            definition,
            vscode.TaskScope.Workspace,
            'Quick Compile',
            taskSource,
            execution,
        );
        task.group = vscode.TaskGroup.Build;
        return task;
    }
}
