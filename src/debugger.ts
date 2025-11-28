import { execFile, ExecFileException } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { log } from './util';

export function activateDebugger(context: vscode.ExtensionContext) {
	context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider('xsystem4', new Xsystem4ConfigurationProvider()),
		vscode.debug.registerDebugAdapterDescriptorFactory('xsystem4', new DebugAdapterFactory()),
		vscode.debug.registerDebugAdapterTrackerFactory('xsystem4', new DebugAdapterTrackerFactory()),
	);
}

class DebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	async createDebugAdapterDescriptor(session: vscode.DebugSession) {
		const config = session.configuration;
		const xsystem4 = config.program;
		const cwd = config.runDir || (path.isAbsolute(xsystem4) ? path.dirname(xsystem4) : undefined);
		const options: any = { cwd };
		if (config.env)
			options.env = config.env;

		// vscode.DebugAdapterExecutable silently fails if it can't launch the program.
		// https://github.com/microsoft/vscode/issues/108145
		// We need to check if the program exists and is executable beforehand.
		let err = await this.checkExecutable(xsystem4, ['--version'], options);
		if (err) {
			vscode.window.showErrorMessage(err);
		}

		return new vscode.DebugAdapterExecutable(xsystem4, config.args, options);
	}

	private checked = new Set<string>();
	checkExecutable(path: string, args: string[], options: any): Promise<string | null> {
		if (this.checked.has(path)) return Promise.resolve(null);
		return new Promise((resolve) => {
			execFile(path, args, options, (error: ExecFileException | null) => {
				if (error) {
					if (error.code === 'ENOENT') {
						resolve(`${path} is not found.`);
					} else {
						resolve(`Error running ${path}. (Code: ${error.code})`);
					}
				}
				this.checked.add(path);
				resolve(null);
			});
		});
	}
}

class DebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
	createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
		const config = session.configuration;
		if (!config.trace) return undefined;
		return {
			onWillReceiveMessage: m => {
				console.log(m);
				log.info('DAP send', m);
			},
			onDidSendMessage: m => {
				console.log(m);
				log.info('DAP recv', m);
			}
		};
	}
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
