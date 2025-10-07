# System4 Extension for Visual Studio Code

This extension adds support for AliceSoft's System 4 programming language.

## Features

This extension provides the following features:

- Language features for `.jaf` source files:
  - Syntax highlighting
  - Inline error messages
  - Hover type information
  - Jump to definition
- Decompiling `.ain` files and compiling `.jaf` files.
- Debugging with xsystem4:
  - [Breakpoints](https://code.visualstudio.com/docs/editor/debugging#_breakpoints)
  - [Step-through execution](https://code.visualstudio.com/docs/editor/debugging#_debug-actions)
  - [Data inspection](https://code.visualstudio.com/docs/editor/debugging#_data-inspection)

## Prerequisites

To use all features of this extension, the following software is required:

- [Sys4lang](https://github.com/kichikuou/sys4lang) for decompiling, compiling, and providing language features.
  - For Windows, you don't need to install this separately because the extension bundles prebuilt binaries.
- [xsystem4](https://github.com/nunuhara/xsystem4) for debugging.
  - For Windows, this extension can download and install xsystem4 automatically.

On non-Windows platforms, you need to install these tools manually. Please refer to their respective repositories for installation instructions.

## Getting Started

### Decompiling

**Note:** `.ain` files created with AinDecompiler may fail to decompile or recompile. It is recommended to start with the original `.ain` files.

For example, if you have installed Sengoku Rance at `C:\Games\AliceSoft\戦国ランス`:

1. Install [Visual Studio Code](https://code.visualstudio.com/).
2. Install this extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=kichikuou.system4).
3. In VSCode, open the `C:\Games\AliceSoft\戦国ランス` folder.
4. Open the command palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> or <kbd>F1</kbd>), type `system4`, and select `System4: Decompile`.
5. Decompiled source files will be saved in the `src` folder, and the extension will automatically open a `.jaf` file.

### Compiling

Once you have decompiled the game, you can edit the source files and compile them back into `.ain` files.

1. Edit `.jaf` source files as you like.
2. When you are done, press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> (the shortcut for the "Run Build Task" command).
3. Select `system4: compile` from the list. This will overwrite the original `.ain` file.

### Debugging

1. Make sure a `debug_info.json` file exists in the `src` folder. The `System4: Decompile` and `system4: compile` commands generate this file automatically.
2. Open a `.jaf` file and press <kbd>F5</kbd> to start debugging.
   - On Windows, if you haven't installed xsystem4, the extension will prompt you to download and install it. It will be installed in an `xsystem4-<version>` folder in the workspace root.
3. The game will start in a new xsystem4 window. You can pause execution, step through code, and set breakpoints in the VSCode window.

## Configuration

You can customize the extension's behavior with the following settings:

- `system4.xsystem4Path`: Path to the xsystem4 executable. If not set, the extension searches for `xsystem4*\xsystem4.exe` in the workspace folder on Windows.
- `system4.sys4langPath`: Directory containing the `sys4c`, `sys4dc`, and `sys4lang` executables. On Windows, this path takes precedence over the bundled version.
