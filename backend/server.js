const express = require('express');
const cors = require('cors');
const { spawn, execSync } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Get video info
app.post('/api/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const result = execSync(
      `yt-dlp --dump-json --no-playlist "${url}"`,
      { timeout: 30000, encoding: 'utf8' }
    );
    const info = JSON.parse(result);

    const formats = (info.formats || [])
      .filter(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.ext && f.height)
      .map(f => ({
        format_id: f.format_id,
        ext: f.ext,
        quality: f.height ? `${f.height}p` : f.format_note || f.format_id,
        height: f.height || 0,
        filesize: f.filesize || f.filesize_approx || null,
      }))
      .filter((f, idx, arr) => arr.findIndex(x => x.height === f.height) === idx)
      .sort((a, b) => b.height - a.height);

    // Add audio-only option
    const audioFormats = [{ format_id: 'bestaudio/best', ext: 'mp3', quality: 'Audio Only (MP3)', height: -1, filesize: null }];

    res.json({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      uploader: info.uploader,
      view_count: info.view_count,
      formats: [...formats, ...audioFormats],
    });
  } catch (err) {
    res.status(400).json({ error: 'Could not fetch video info. Check the URL.' });
  }
});

// Download video
app.get('/api/download', (req, res) => {
  const { url, format_id, title } = req.query;
  if (!url || !format_id) return res.status(400).json({ error: 'Missing params' });

  const isAudio = format_id === 'bestaudio/best';
  const ext = isAudio ? 'mp3' : 'mp4';
  const filename = `${(title || 'video').replace(/[^a-z0-9]/gi, '_')}.${ext}`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');

  const args = isAudio
    ? ['-x', '--audio-format', 'mp3', '-o', '-', url]
    : ['-f', format_id, '--merge-output-format', 'mp4', '-o', '-', url];

  const proc = spawn('yt-dlp', args);
  proc.stdout.pipe(res);

  proc.stderr.on('data', (data) => {
    console.error('yt-dlp:', data.toString());
  });

  proc.on('error', (err) => {
    console.error('spawn error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
  });

  req.on('close', () => proc.kill());
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
