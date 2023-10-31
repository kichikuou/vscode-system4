# System4 Extension for Visual Studio Code

This extension adds support for the AliceSoft's System 4 programming language.

## Features

- Syntax highlighting for `.jaf` source files
- Decompiling and compiling `.ain` using AinDecompiler
- Inline error messages
- Hover type information

## Prerequisites

To use all the features of this extension, the following software is required:

- AinDecompiler
- [System4-lsp](https://github.com/kichikuou/system4-lsp)

## Getting Started

Here we explain how to decompile a game and edit the source code using this extension.

1. Download AinDecompiler and [System4-lsp](https://github.com/kichikuou/system4-lsp/releases), and unzip them somewhere on your PC.
2. Install this extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=kichikuou.system4).
3. In VSCode, open the folder containing System4 game data (`.ain` file).
4. The extension will ask you if you want to decompile the game. Click "Yes".
5. The extension will ask you the path to AinDecompiler. Select the path to `AinDecompiler.exe`.
6. AinDecompiler will generate source code in the `src` directory. (It will take some time)
7. The extension will ask you the path to System4-lsp. Select the path to `system4-lsp.exe`.
8. Now you can edit `.jaf` source code in the `src` directory and enjoy the language features.
9. Once you are done, press `Ctrl+Shift+B` (shortcut for "Run Build Task" command).
10. You will see "No build task to run found. Configure Build Task..." message. Press Enter.
11. Select "AinDecompiler: Quick Compile" from the list.
12. VSCode will create `.vscode/tasks.json` file. Close it and back to the `.jaf` file.
13. Press `Ctrl+Shift+B` again. Now AinDecompiler will compile the current `.jaf` file and overwrite the `.ain` file.
14. Run the game and check if it works as expected.
