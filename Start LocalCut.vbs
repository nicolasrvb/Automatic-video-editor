Set fs = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = fs.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = folder
command = Chr(34) & fs.BuildPath(folder, "Start LocalCut.cmd") & Chr(34)
code = shell.Run(command, 0, True)
If code <> 0 Then MsgBox "LocalCut could not start. Check that the bundled runtime is installed and review data\logs\launcher.log.", 48, "LocalCut startup"
