import * as vscode from 'vscode';
import { decompileWorkspace } from './decompile';
import { activateDebugger } from './debugger';
import { startClient, stopClient, gotoEntryPoint } from './lsp';
import { registerCompileTaskProviders } from './compile';
import { getXsystem4Path } from './xsystem4';
import { log, getProjectInfo, ProjectInfo } from './util';

export async function activate(context: vscode.ExtensionContext) {
    log.info('Activating System4 extension...');

    const proj = await getProjectInfo();
    log.info('Project information:', proj);

    activateDebugger(context);
    // This asks the user to set the location of sys4lsp if it is not set.
    await startClient(proj);
    context.subscriptions.push(
        vscode.commands.registerCommand('system4.decompile', async () => {
            if (await decompileWorkspace(proj)) {
                await restartClient(proj);
                await gotoEntryPoint();
            }
        }),
        vscode.commands.registerCommand('system4.server.restart', () => restartClient(proj)),
        vscode.commands.registerCommand('system4.getXsystem4Path', getXsystem4Path),
    );
    await registerCompileTaskProviders(context, proj);

    if (proj.srcDir) {
        offerEncodingConfigChange(proj.srcEncoding);
    }
}

async function restartClient(proj: ProjectInfo) {
    await stopClient();
    await startClient(proj);
}

export async function deactivate() {
    await stopClient();
}

function offerEncodingConfigChange(projEncoding: string | undefined) {
    if (projEncoding?.toLowerCase() === 'utf-8') return;
    const filesConfig = vscode.workspace.getConfiguration('files');
    if (filesConfig.get('encoding') === 'shiftjis' || filesConfig.get('autoGuessEncoding')) return;

    // TODO: Add "Don't ask again" option.
    vscode.window.showInformationMessage(
        'Set the text encoding of this workspace to Shift-JIS?',
        'Yes', 'No').then((choice) => {
            if (choice === 'Yes') {
                filesConfig.update(
                    'encoding', 'shiftjis', vscode.ConfigurationTarget.Workspace);
            }
        });
}
