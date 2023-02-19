# vz-view-plugin

Custom parser to get quick preview of varies VZ200/VZ300 Basic and binary files.

Parser is created to use from [**"Binary File Viewer"**](https://github.com/maziac/binary-file-viewer) by **maziac** VS Code (most likely along with **DeZog** debugger).

VZ BASIC file view
![VZ BASIC file view](docs/vz-preview-1.png)

VZ mixed BASIC and Binary file view
![VZ mixed BASIC and Binary file view](docs/vz-preview-2.png)

## Supported files

Files are recognized by File Description Header - 4 bytes at the begining of file commonly used as signature since DOS (like 'RIFF' for *.WAV etc)

As for now Parser Plugin supports files:
- *.VZ with 'VZF0' [56 5A 46 30] file description header.
- *.VZ with 'VZFO' [56 5A 46 4F] file description header (possibly mistaken change from '0' to 'O').
- *.VZ with '  \0\0' [20 20 00 00] file description header (generated with z88dk tools)

## Supported file content types

VZ Snapshot file header:

| Offset  | Size     | Description                         |
|---------|----------|-------------------------------------|
|  0      | 4 bytes  | File Description header (see above) |
|  4      | 16 chars | Internal Program Name               |
|  20     | 1 byte   | Text terminator (always 0)          |
|  21     | 1 byte   | Content Type (see below)            |
|  22     | 2 bytes  | 16-bit address to load rest of file |

Content Type byte determines what kind of data are in file starting at offset +24.

As for now Parser supports Content Types:
- 0xf0 BASIC Program 
- 0xf0 BASIC Program/Loader with following binary code 
- 0xf1 Binary program from start to end


 ## Install

1. Copy 'vzf0.js' file to chosen folder (e.g.: C:\repos\vz-view-plugin\)
2. Install [**"Binary File Viewer"**](https://github.com/maziac/binary-file-viewer) through Visual Studio Code Marketplace.
3. Open Extension Settings and add Parsers Folder where is 'vzf0.js' file (e.g.: C:\repos\vz-view-plugin\)
4. (optional) Install **Hot Coco** font from fonts/hotcoco.zip file.

## Usage

1. In the vscode explorer right-click the binary file.
2. Choose 'Open with Binary File Viewer'.

To use the 'Binary File Viewer' as default for some file extension:
1. In the vscode explorer right-click the binary file.
2. Choose 'Open With...'.
3. If there is more than 1 viewer registered for the file type all viewers will show up, e.g.:
![](https://github.com/maziac/binary-file-viewer/blob/main/assets/remote/viewer_selection.jpg)
4. Choose 'Configure default editor for ...'
5. In the next window select the 'Binary File Viewer'.
6. The next time you select a file of the same type it is immediately opened by the 'Binary File Viewer'.


## Acknowledgements

This Parser works only as part of [**"Binary File Viewer"**](https://github.com/maziac/binary-file-viewer) 

