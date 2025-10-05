import * as vscode from 'vscode';
import { decompileWorkspace } from './decompile';
import { activateDebugger } from './debugger';
import { startClient, stopClient } from './lsp';
import { CompileTaskProvider } from './task';
import { log, getProjectInfo, ProjectInfo } from './util';

export async function activate(context: vscode.ExtensionContext) {
    log.info('Activating System4 extension...');

    const proj = await getProjectInfo();
    log.info('Project information:', proj);

    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider('xsystem4', new Xsystem4ConfigurationProvider()),
    );
    activateDebugger(context);
    // This asks the user to set the location of sys4lsp if it is not set.
    await startClient(proj);
    context.subscriptions.push(
        vscode.commands.registerCommand('system4.decompile', async () => {
            if (await decompileWorkspace(proj)) {
                await restartClient(proj);
            }
        }),
        vscode.commands.registerCommand('system4.server.restart', () => restartClient(proj)),
        vscode.commands.registerCommand('system4.getXsystem4Path', getXsystem4Path),
    );
    // This asks the user to set the location of AinDecompiler if it is not set.
    await CompileTaskProvider.register(context, proj);

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

const config_xsystem4Path = 'xsystem4Path';

async function getXsystem4Path(): Promise<string> {
    const defaultPath = 'xsystem4';  // We need to return something.

    // If the path is configured, use it.
    const config = vscode.workspace.getConfiguration('system4');
    let configuredPath = config.get(config_xsystem4Path) as string | undefined;
    if (configuredPath) {
        return configuredPath;
    }

    // On Windows, search for xsystem4*/xsystem4.exe in the workspace.
    if (process.platform === 'win32') {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            return defaultPath;
        }
        const exeFiles = await vscode.workspace.findFiles('xsystem4*/xsystem4.exe');
        if (exeFiles.length > 0) {
            const exePaths = exeFiles.map(f => f.fsPath);
            exePaths.sort();
            return exePaths[exePaths.length - 1];
        }
    }

    // Prompt the user to select xsystem4 path.
    const exeName = process.platform === 'win32' ? 'xsystem4.exe' : 'xsystem4';
    const selected = await vscode.window.showInformationMessage(
        `Path to xsystem4 is not set. Please select ${exeName}.`,
        { modal: true }, 'Select File');
    if (selected !== 'Select File') {
        return defaultPath;
    }
    const options: vscode.OpenDialogOptions = {
        canSelectMany: false,
        openLabel: `Select ${exeName}`,
    };
    if (process.platform === 'win32') {
        options.filters = { 'Executables': ['exe'] };
    }
    const uris = await vscode.window.showOpenDialog(options);
    if (!uris || uris.length === 0) {
        return defaultPath;
    }
    configuredPath = uris[0].fsPath;
    await config.update(config_xsystem4Path, configuredPath, vscode.ConfigurationTarget.Workspace);
    return configuredPath;
}
