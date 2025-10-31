# Changelog

## 1.2.0 - 2025-11-01
- Updated bundled sys4lang to v0.6.0.

## 1.1.0 - 2025-10-25
- Updated bundled sys4lang to v0.5.0.

## 1.0.0 - 2025-10-11
This release introduces significant changes to the recommended workflow. Users
of previous versions are encouraged to re-read `README.md`.

- Switched the compiler and decompiler from AinDecompiler to sys4lang. You can
  now decompile, compile, and run with the debugger directly from within VS
  Code.
- Windows: Added a feature to automatically download xsystem4 if it's not found
  when launching the debugger.
- For users of previous versions, the "AinDecompiler: Quick Compile" build task
  is still available but is no longer recommended.

## 0.1.1 - 2025-09-25
- Updated bundled system4-lsp to v0.1.1. This should fix "Hashtbl.add_exn got
  key already present" error on startup.

## 0.1.0 - 2025-08-09
- Added support for debugging with xsystem4 (requres xsystem4
  [ea081e0e](https://github.com/nunuhara/xsystem4/commit/ea081e0eb7c8d9b7cd9a40a4623cb00d587aa353)
  or later)
- Updated bundled system4-lsp to v0.1.0

## 0.0.4 - 2023-11-09
- For Windows, this extension now bundles a prebuilt binary of System4-lsp.
- Now "AinDecompiler: Quick Compile" should appear in the list of build tasks
  shown by `Ctrl+Shift+B`.

## 0.0.3 - 2023-11-05
- Added some logging code for debugging purposes. Users can view logs by
  selecting the "System4 extension" dropdown entry in VSCode's Output panel.

## 0.0.2 - 2023-11-01
- Removed support for decompiling with AinDecompiler (because it didn't work).

## 0.0.1 - 2023-10-31
- Initial release.