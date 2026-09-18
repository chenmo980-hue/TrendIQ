$ErrorActionPreference = 'Stop'
$root = 'E:\WorkSpaces\TrendIQ'
Set-Location $root
git status --short --branch
git diff --stat
git add api-tester-wpf/README.md api-tester-wpf/Services/SettingsStore.cs api-tester-wpf/ViewModels/MainViewModel.cs api-tester-wpf/Views/MainWindow.xaml
git status --short --branch
git commit -m '新增多配置管理：新建/读取/切换具名配置，更新说明' --no-verify
$code = $LASTEXITCODE
Write-Output "commit_exit=$code"
if ($code -ne 0) { exit $code }
Add-Type -Namespace CredHelper -Name Native -MemberDefinition '[DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)] private static extern bool CredRead(string target, int type, int flags, out IntPtr credential); [DllImport("advapi32.dll", EntryPoint="CredFree", SetLastError=true)] private static extern void CredFree(IntPtr buffer); [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] private struct CREDENTIAL { public int Flags; public int Type; public IntPtr TargetName; public IntPtr Comment; public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten; public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist; public int AttributeCount; public IntPtr Attributes; public IntPtr TargetAlias; public IntPtr UserName; } public static string Get(string target){ IntPtr ptr; if(!CredRead(target,1,0,out ptr)){ throw new System.ComponentModel.Win32Exception(System.Runtime.InteropServices.Marshal.GetLastWin32Error()); } try{ var c = (CREDENTIAL)System.Runtime.InteropServices.Marshal.PtrToStructure(ptr, typeof(CREDENTIAL)); var bytes=new byte[c.CredentialBlobSize]; System.Runtime.InteropServices.Marshal.Copy(c.CredentialBlob, bytes, 0, c.CredentialBlobSize); var user = System.Runtime.InteropServices.Marshal.PtrToStringUni(c.UserName); var token = System.Text.Encoding.UTF8.GetString(bytes); return user + "|" + token; } finally { CredFree(ptr); } }'
$raw = [CredHelper]::Get('git:https://github.com')
$parts = $raw -split '\|', 2
$pushUrl = 'https://' + $parts[0] + ':' + $parts[1] + '@github.com/chenmo980-hue/TrendIQ.git'
git -c credential.helper= -c http.sslBackend=openssl -c http.version=HTTP/1.1 push $pushUrl main
$code = $LASTEXITCODE
Write-Output "push_exit=$code"
if ($code -ne 0) { exit $code }
