# Changelog

## 0.1.1
- Updated bundled system4-lsp to v0.1.1. This should fix "Hashtbl.add_exn got
  key already present" error on startup.

## 0.1.0
- Added support for debugging with xsystem4 (requres xsystem4
  [ea081e0e](https://github.com/nunuhara/xsystem4/commit/ea081e0eb7c8d9b7cd9a40a4623cb00d587aa353)
  or later)
- Updated bundled system4-lsp to v0.1.0

## 0.0.4
- For Windows, this extension now bundles a prebuilt binary of System4-lsp.
- Now "AinDecompiler: Quick Compile" should appear in the list of build tasks
  shown by `Ctrl+Shift+B`.

## 0.0.3
- Added some logging code for debugging purposes. Users can view logs by
  selecting the "System4 extension" dropdown entry in VSCode's Output panel.

## 0.0.2
- Removed support for decompiling with AinDecompiler (because it didn't work).

## 0.0.1
- Initial release.
