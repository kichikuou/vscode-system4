# System4 Extension for Visual Studio Code

This extension adds support for the AliceSoft's System 4 programming language.

## Features

- Syntax highlighting for `.jaf` source files
- Compiling `.jaf` file with AinDecompiler
- Inline error messages
- Hover type information
- Jump to definition

## Prerequisites

To use all the features of this extension, the following software is required:

- AinDecompiler
- [Sys4lang](https://github.com/kichikuou/sys4lang)
  - For Windows, you don't need to install this separately because the extension bundles a prebuilt binary.

## Getting Started

Assume you have installed Sengoku Rance at `C:\Games\AliceSoft\戦国ランス` and you want to edit the source code of the game.

Some setup steps are required before you can use this extension:

1. Download [AinDecompiler](https://www.mediafire.com/file/i5zbm2qhins3kp6/AinDecompiler.zip/file) and unzip it somewhere.
2. Decompile the game using AinDecompiler.
   1. Select "File" -> "Open Ain File" from the menu.
   2. Select `C:\Games\AliceSoft\戦国ランス\戦国ランス.ain`.
   3. Select "File" -> "Decompile Code..." from the menu.
   4. Create a new folder named `src` under `C:\Games\AliceSoft\戦国ランス`, select that folder, and click "Save".
   5. Once AinDecompiler finishes decompiling, close it.

Now your filesystem should look like this:

```
C:\
    Games\
        AliceSoft\
            戦国ランス\
                System40.ini
                戦国ランス.ain
                src\
                    戦国ランス.pje
                    classes.jaf
                    globals.jaf
                    ...
                ...
```

You are ready to use this extension.

1. Install [Visual Studio Code](https://code.visualstudio.com/).
2. Install this extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=kichikuou.system4).
3. In VSCode, open the `C:\Games\AliceSoft\戦国ランス\src` folder.
4. The extension asks you the path to AinDecompiler. Select the path to `AinDecompiler.exe`.
5. The extension asks you whether to set text encoding to Shift-JIS. Click "Yes". (Otherwise you'll see garbled text.)
6. Open a `.jaf` source file and edit it as you like.
7. Once you are done, press `Ctrl+Shift+B` (shortcut for "Run Build Task" command).
8. Select "AinDecompiler: Quick Compile" from the list. AinDecompiler will compile the current `.jaf` file and overwrite the `.ain` file.
9. Run the game and check if it works as expected.
