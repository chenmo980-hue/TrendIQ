using System.Text.Json.Serialization;

namespace TrendIQDownloader.Models;

public class VideoFormat
{
    public string FormatId { get; set; } = "";
    public string Ext { get; set; } = "";
    public string? Resolution { get; set; }
    public string? Fps { get; set; }
    public string? Vcodec { get; set; }
    public string? Acodec { get; set; }
    public string? FilesizeText { get; set; }
    public double? Tbr { get; set; }

    [JsonIgnore]
    public bool HasAudio => Acodec is not ("none" or null or "");
    [JsonIgnore]
    public bool HasVideo => Vcodec is not ("none" or null or "");

    public string Display
    {
        get
        {
            var res = string.IsNullOrEmpty(Resolution) ? (HasVideo ? "video" : "audio") : Resolution;
            var fpsS = string.IsNullOrEmpty(Fps) ? "" : $" {Fps}fps";
            var codec = HasVideo ? (Vcodec ?? "").Split('.')[0] : (Acodec ?? "").Split('.')[0];
            if (string.IsNullOrEmpty(codec)) codec = HasAudio ? "audio" : "?";
            var size = string.IsNullOrEmpty(FilesizeText) ? "" : $" · {FilesizeText}";
            return $"{FormatId} · {res}{fpsS} · {codec}{size}";
        }
    }
}

public class VideoInfo
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Uploader { get; set; } = "";
    public string? Thumbnail { get; set; }
    public double? DurationSeconds { get; set; }
    public string? Description { get; set; }
    public string WebpageUrl { get; set; } = "";
    public string ExtractorKey { get; set; } = "";
    public List<VideoFormat> Formats { get; set; } = new();

    public string DurationText => DurationSeconds is > 0
        ? TimeSpan.FromSeconds(DurationSeconds.Value).ToString(@"hh\:mm\:ss")
        : "-";

    public string Site => ExtractorKey;
}

public class DownloadRequest
{
    public required string Url { get; set; }
    public required string OutputDir { get; set; }
    public string FormatArg { get; set; } = "bv*+ba/b";
    public bool AudioOnly { get; set; }
    public string? AudioFormat { get; set; }
    public string? Proxy { get; set; }
    public string? CookieFile { get; set; }
    public string? SubtitleLangs { get; set; }
    public bool WriteThumbnail { get; set; }
    public int? PlaylistLimit { get; set; }
    public bool IsPlaylist { get; set; }
    public string? OutputTemplate { get; set; }
    public bool TranslateToChinese { get; set; }
}

public class DownloadProgress
{
    public string Stage { get; set; } = "";
    public double? Percent { get; set; }
    public string Speed { get; set; } = "";
    public string Eta { get; set; } = "";
    public string Title { get; set; } = "";
    public string Info { get; set; } = "";
}

public class ToolsProgress
{
    public string Name { get; set; } = "";
    public long Current { get; set; }
    public long Total { get; set; }
    public bool Done { get; set; }
}

public class SettingsData
{
    public string OutputDir { get; set; } = "";
    public string Proxy { get; set; } = "";
    public string CookieFile { get; set; } = "";
    public string SubtitleLangs { get; set; } = "";
    public bool WriteThumbnail { get; set; }
    public string AudioFormat { get; set; } = "mp3";
    public int PlaylistLimit { get; set; } = 10;
    public bool Simultaneous { get; set; }
    public bool SkipAutoToolCheck { get; set; }
}
