import * as path from "path";
import * as vscode from "vscode";
import * as child_process from "child_process";

let commandOutputChannel: vscode.OutputChannel;
let binaryPath: string;

interface CommandContext {
    workspacePath: string;
}

function callBinary(verb: string, commandLineArgs: string[], workspacePath: string) {
    commandOutputChannel.clear();

    commandOutputChannel.appendLine(`Executing command "${verb}" ...`);
    commandOutputChannel.appendLine("");

    const buildProcess = child_process.spawn("dotnet", [
        binaryPath,
        verb,
        "--verbose",
        ...commandLineArgs
    ], {
        cwd: workspacePath
    });

    buildProcess.stdout.on("data", chunk => {
        commandOutputChannel.append(chunk.toString());
    });

    buildProcess.stderr.on("data", chunk => {
        commandOutputChannel.append(chunk.toString());
    });

    buildProcess.on("exit", (code, signal) => {
        if (code !== 0) {
            commandOutputChannel.show(true);

            vscode.window.showErrorMessage("X Mod Packager: Command failed");
        }
    });
}

async function getCommandContext(): Promise<CommandContext | undefined> {
    const workspaces = vscode.workspace.workspaceFolders;

    if (!workspaces) {
        vscode.window.showErrorMessage("X Mod Packager: You must have a folder open to run this command");
        return;
    }

    let workspacePath: string;
    if (workspaces.length > 1) {
        const choiceResponse = await vscode.window.showWorkspaceFolderPick();

        if (!choiceResponse) {
            return;
        }

        workspacePath = choiceResponse.uri.fsPath;
    } else {
        workspacePath = workspaces[0].uri.fsPath;
    }

    if (workspacePath) {
        return {
            workspacePath: workspacePath
        };
    }
}

async function getBuildMethodChoice(): Promise<string | undefined> {
    interface BuildMethodChoice extends vscode.QuickPickItem {
        buildMethod: string;
    }

    const choice = await vscode.window.showQuickPick<BuildMethodChoice>([
        {
            label: "(use config)",
            buildMethod: "default"
        },
        {
            label: "Archive",
            buildMethod: "archive"
        },
        {
            label: "Catalogs",
            buildMethod: "cat"
        },
        {
            label: "Loose Files",
            buildMethod: "loose"
        },
    ]);

    if (choice) {
        return choice.buildMethod;
    }

    return undefined;
}

export function activate(context: vscode.ExtensionContext) {
    commandOutputChannel = vscode.window.createOutputChannel("X Mod Packager");
    binaryPath = path.join(context.extensionPath, "lib/XModPackager.dll");

    context.subscriptions.push(vscode.commands.registerCommand("xmodpackager.build", async () => {
        const context = await getCommandContext();

        if (!context) {
            return;
        }

        const buildMethod = await getBuildMethodChoice();

        if (!buildMethod) {
            return;
        }

        const commandLineArgs: string[] = [];

        if (buildMethod !== "default") {
            commandLineArgs.push("--method", buildMethod);
        }

        callBinary("build", commandLineArgs, context.workspacePath);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("xmodpackager.clean", async () => {
        const context = await getCommandContext();

        if (!context) {
            return;
        }

        callBinary("clean", [], context.workspacePath);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("xmodpackager.import", async () => {
        const context = await getCommandContext();

        if (!context) {
            return;
        }

        callBinary("import", [], context.workspacePath);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("xmodpackager.init", async () => {
        const context = await getCommandContext();

        if (!context) {
            return;
        }

        callBinary("init", [], context.workspacePath);
    }));
}
