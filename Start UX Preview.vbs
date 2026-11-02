Set fs = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = fs.GetParentFolderName(WScript.ScriptFullName)
code = shell.Run(Chr(34) & folder & "\Start UX Preview.cmd" & Chr(34), 0, True)
If code <> 0 Then MsgBox "LocalCut preview could not start. Check the local installation and data\logs\server.log.", 48, "LocalCut"
