import * as vscode from 'vscode';
import { activateDebugger } from './debugger';
import { startClient, stopClient } from './lsp';
import { CompileTaskProvider } from './task';
import { log, getProjectPaths } from './util';

export async function activate(context: vscode.ExtensionContext) {
    log.info('Activating System4 extension...');

    const paths = await getProjectPaths();
    log.info('Project information:', paths);

    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider('xsystem4', new Xsystem4ConfigurationProvider()),
    );
    activateDebugger(context);
    // This asks the user to set the location of system4-lsp if it is not set.
    await startClient(paths);
    context.subscriptions.push(
        vscode.commands.registerCommand('system4.server.restart', async () => {
            await stopClient();
            await startClient(paths);
        }),
    );
    // This asks the user to set the location of AinDecompiler if it is not set.
    await CompileTaskProvider.register(context, paths.ainPath);

    if (paths.srcDir) {
        offerEncodingConfigChange();
    }
}

export async function deactivate() {
    await stopClient();
}

function offerEncodingConfigChange() {
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

class Xsystem4ConfigurationProvider implements vscode.DebugConfigurationProvider {
	resolveDebugConfiguration(
		folder: vscode.WorkspaceFolder | undefined,
		config: vscode.DebugConfiguration,
		token?: vscode.CancellationToken
	): vscode.ProviderResult<vscode.DebugConfiguration> {
		// If config is empty (no launch.json), copy initialConfigurations from our package.json.
		if (Object.keys(config).length === 0) {
			const packageJSON = vscode.extensions.getExtension('kichikuou.system4')?.packageJSON;
			if (packageJSON) {
				Object.assign(config, packageJSON.contributes.debuggers[0].initialConfigurations[0]);
			}
		}
		return config;
	}
}
