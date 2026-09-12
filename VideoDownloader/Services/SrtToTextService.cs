using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace TrendIQDownloader.Services;

public static partial class SrtToTextService
{
    [GeneratedRegex(@"^\d+$")]
    private static partial Regex IndexLineRegex();

    [GeneratedRegex(@"^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->")]
    private static partial Regex TimeLineRegex();

    /// <summary>把 srt/vtt 字幕转成纯文本。可选保留时间戳（[mm:ss] 形式）。</summary>
    public static string Convert(string subPath, bool withTimestamps = false)
    {
        var lines = File.ReadAllLines(subPath, Encoding.UTF8);
        var sb = new StringBuilder();
        var lastText = "";
        var currentTime = "";

        foreach (var raw in lines)
        {
            var line = raw.Trim('\uFEFF', '\r', ' ');
            if (line.Length == 0) continue;
            if (line.StartsWith("WEBVTT", StringComparison.OrdinalIgnoreCase)) continue;
            if (line.StartsWith("NOTE", StringComparison.OrdinalIgnoreCase) && !TimeLineRegex().IsMatch(line)) continue;
            if (line.StartsWith("Kind:", StringComparison.OrdinalIgnoreCase) || line.StartsWith("Language:", StringComparison.OrdinalIgnoreCase)) continue;
            if (IndexLineRegex().IsMatch(line)) { currentTime = ""; continue; }
            if (TimeLineRegex().IsMatch(line))
            {
                if (withTimestamps)
                {
                    var m = Regex.Match(line, @"(\d{2}):(\d{2}):(\d{2})");
                    if (m.Success)
                    {
                        var totalMin = int.Parse(m.Groups[1].Value) * 60 + int.Parse(m.Groups[2].Value);
                        currentTime = $"[{totalMin:D2}:{m.Groups[3].Value}] ";
                    }
                }
                continue;
            }
            var text = line.Trim();
            if (text.Length == 0) continue;
            // YouTube 机翻字幕经常把句子切碎重复，跳过与上一条完全相同的行
            if (text == lastText) continue;
            lastText = text;
            sb.Append(currentTime).AppendLine(text);
        }
        return sb.ToString();
    }

    /// <summary>在视频文件旁生成 同名.zh.txt。返回生成的 txt 路径，没找到字幕返回 null。</summary>
    public static string? GenerateTextForVideo(string videoFilePath)
    {
        if (string.IsNullOrEmpty(videoFilePath)) return null;
        var dir = Path.GetDirectoryName(videoFilePath)!;
        var baseName = Path.GetFileNameWithoutExtension(videoFilePath);
        // 找同目录下该视频的字幕文件（srt/vtt）：优先中文，其次任意
        var candidates = Directory.GetFiles(dir, baseName + ".*")
            .Where(f => f.EndsWith(".srt", StringComparison.OrdinalIgnoreCase)
                     || f.EndsWith(".vtt", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(IsChineseSubtitle)
            .ThenBy(f => f.Length)
            .ToList();
        var sub = candidates.FirstOrDefault();
        if (sub is null) return null;
        var text = Convert(sub, withTimestamps: false);
        if (text.Length == 0) return null;
        var txtPath = Path.Combine(dir, baseName + ".zh.txt");
        File.WriteAllText(txtPath, text, new UTF8Encoding(true));
        return txtPath;
    }

    private static bool IsChineseSubtitle(string filePath)
    {
        var name = Path.GetFileName(filePath);
        return name.Contains("zh-Hans", StringComparison.OrdinalIgnoreCase)
            || name.Contains(".zh.", StringComparison.OrdinalIgnoreCase)
            || name.Contains("zh-CN", StringComparison.OrdinalIgnoreCase)
            || name.Contains(".zh-", StringComparison.OrdinalIgnoreCase);
    }
}
