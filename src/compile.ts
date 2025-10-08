import * as vscode from 'vscode';
import { log, getExePath, ProjectInfo } from './util';

export class CompileTaskProvider implements vscode.TaskProvider {
    static taskType = 'system4-compile';

    static async register(context: vscode.ExtensionContext, proj: ProjectInfo) {
        context.subscriptions.push(
            vscode.tasks.registerTaskProvider(
                CompileTaskProvider.taskType, new CompileTaskProvider(proj)));
        log.info('CompileTaskProvider registered.');
    }

    constructor(private proj: ProjectInfo) {}

    async provideTasks() {
        const task = await this.createTask({ type: CompileTaskProvider.taskType });
        return task ? [task] : [];
    }

    resolveTask(task: vscode.Task, token: vscode.CancellationToken) {
        return this.createTask(task.definition);
    }

    private async createTask(definition: vscode.TaskDefinition) {
        if (!this.proj.pjePath) return;
        const compilerPath = await getExePath('sys4c');
        if (!compilerPath) {
            log.warn('CompileTaskProvider: could not find sys4c.');
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
