# vz-view-plugin

Parser to use with **Binary File Viewer** by Maziac in order to get quick view of varies binary files fo VZ200/VZ300 Emulator files.

As for now Parser Plugin supports files:
- *.VZ with 'VZF0' file description header.
- *.VZ with 'VZFO' file description header (possibly mistaken change from '0' to 'O').

Parser is created to use by **Binary File Viewer** inside VS Code (most likely along with **DeZog** debugger). In order to use it you must configure VS Code as follows:

## Install

1. Copy 'vzf0.js' file to chosen folder (e.g.: C:\repos\vz-view-plugin\)
2. Install "Binary File Viewer" through Visual Studio Code Marketplace.
3. Open Extension Settings and add Parsers Folder where is 'vzf0.js' file (e.g.: C:\repos\vz-view-plugin\)

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



