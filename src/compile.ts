import * as vscode from 'vscode';
import { log, getExePath, ProjectInfo } from './util';

export async function registerCompileTaskProviders(context: vscode.ExtensionContext, proj: ProjectInfo) {
    await Sys4cTaskProvider.register(context, proj);
    await AinDecompilerTaskProvider.register(context, proj.ainPath);
}

class Sys4cTaskProvider implements vscode.TaskProvider {
    static taskType = 'system4-compile';

    static async register(context: vscode.ExtensionContext, proj: ProjectInfo) {
        context.subscriptions.push(
            vscode.tasks.registerTaskProvider(
                Sys4cTaskProvider.taskType, new Sys4cTaskProvider(proj)));
        log.info('Sys4cTaskProvider registered.');
    }

    constructor(private proj: ProjectInfo) {}

    async provideTasks() {
        const task = await this.createTask({ type: Sys4cTaskProvider.taskType });
        return task ? [task] : [];
    }

    resolveTask(task: vscode.Task, token: vscode.CancellationToken) {
        return this.createTask(task.definition);
    }

    private async createTask(definition: vscode.TaskDefinition) {
        if (!this.proj.pjePath) return;
        const compilerPath = await getExePath('sys4c');
        if (!compilerPath) {
            log.warn('Sys4cTaskProvider: could not find sys4c.');
            return;
        }
        const execution = new vscode.ShellExecution(compilerPath, ['build', '--output-dir=.', this.proj.pjePath])

        const task = new vscode.Task(
            definition,
            vscode.TaskScope.Workspace,
            'compile',
            'system4',
            execution,
            '$sys4c'
        );
        task.group = vscode.TaskGroup.Build;
        return task;
    }
}

export class AinDecompilerTaskProvider implements vscode.TaskProvider {
    static taskType = 'system4-aindecompiler-compile';

    static async register(context: vscode.ExtensionContext, ainPath: string | undefined) {
        if (process.platform !== 'win32') return;
        if (!ainPath) return;
        const decompilerPath = vscode.workspace.getConfiguration('system4').get('decompilerPath') as string | undefined;
        if (!decompilerPath) {
            return;
        }
        context.subscriptions.push(
            vscode.tasks.registerTaskProvider(
                AinDecompilerTaskProvider.taskType, new AinDecompilerTaskProvider(ainPath, decompilerPath)));
        log.info('AinDecompilerTaskProvider registered.');
    }

    constructor(private ainPath: string, private decompilerPath: string) {}

    async provideTasks() {
        const task = this.createTask({ type: AinDecompilerTaskProvider.taskType });
        return task ? [task] : [];
    }

    resolveTask(task: vscode.Task, token: vscode.CancellationToken) {
        return this.createTask(task.definition);
    }

    private createTask(definition: vscode.TaskDefinition) {
        let jafPath = vscode.window.activeTextEditor?.document.uri.fsPath;
        // AinDecompiler doesn't like upper-case .JAF extension.
        jafPath = jafPath?.replace(/\.JAF$/, '.jaf');
        if (!jafPath?.endsWith('.jaf')) return;
        log.info('AinDecompilerTaskProvider: creating task for', jafPath);
        const execution = new vscode.ProcessExecution(this.decompilerPath, [this.ainPath, jafPath, this.ainPath]);

        const task = new vscode.Task(
            definition,
            vscode.TaskScope.Workspace,
            'Quick Compile',
            'AinDecompiler',
            execution,
        );
        task.group = vscode.TaskGroup.Build;
        return task;
    }
}
