import { useState } from 'react';

function formatDuration(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}

function formatViews(n) {
  if (!n) return '';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B views`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M views`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K views`;
  return `${n} views`;
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes >= 1e9) return `~${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `~${(bytes / 1e6).toFixed(1)} MB`;
  return `~${(bytes / 1e3).toFixed(0)} KB`;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);

  async function fetchInfo(e) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setInfo(null);
    setSelected(null);
    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setInfo(data);
      if (data.formats?.length) setSelected(data.formats[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!selected || !info) return;
    setDownloading(true);
    const params = new URLSearchParams({
      url: url.trim(),
      format_id: selected.format_id,
      title: info.title || 'video',
    });
    const link = document.createElement('a');
    link.href = `/api/download?${params}`;
    link.click();
    setTimeout(() => setDownloading(false), 3000);
  }

  return (
    <div className="noise min-h-screen relative">
      {/* Glow BG */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,61,90,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16">

        {/* Header */}
        <div className="text-center mb-14">
          <div className="mono inline-block text-xs tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'rgba(255,255,255,0.02)' }}>
            FREE · NO LIMITS · NO ADS
          </div>
          <h1 className="mono text-5xl font-bold mb-3 leading-tight" style={{ letterSpacing: '-2px' }}>
            <span style={{ color: 'var(--accent)' }}>YT</span>
            <span style={{ color: 'var(--text)' }}>GRAB</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            paste a youtube link. pick a quality. done.
          </p>
        </div>

        {/* Input */}
        <form onSubmit={fetchInfo} className="mb-8">
          <div className="glass rounded-2xl p-1.5 flex gap-2">
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 bg-transparent px-4 py-3 text-sm rounded-xl"
              style={{ color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' }}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="shimmer-btn px-6 py-3 rounded-xl mono text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ flexShrink: 0 }}
            >
              {loading ? <span className="loader" /> : 'FETCH'}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="glass rounded-xl p-4 mb-6 animate-fadeUp"
            style={{ borderColor: 'rgba(255,61,90,0.4)', color: '#ff8899' }}>
            <span className="mono text-xs">ERROR — </span>{error}
          </div>
        )}

        {/* Video Info */}
        {info && (
          <div className="animate-fadeUp">
            {/* Thumbnail + meta */}
            <div className="glass rounded-2xl overflow-hidden mb-6">
              <div className="relative">
                <img
                  src={info.thumbnail}
                  alt={info.title}
                  className="w-full object-cover"
                  style={{ maxHeight: '220px', objectPosition: 'center' }}
                />
                {info.duration && (
                  <span className="mono absolute bottom-2 right-2 text-xs px-2 py-1 rounded"
                    style={{ background: 'rgba(0,0,0,0.8)', color: 'var(--text)' }}>
                    {formatDuration(info.duration)}
                  </span>
                )}
              </div>
              <div className="p-5">
                <h2 className="font-semibold text-base mb-1 leading-snug" style={{ color: 'var(--text)' }}>
                  {info.title}
                </h2>
                <div className="flex gap-3 flex-wrap mt-1">
                  {info.uploader && (
                    <span className="mono text-xs" style={{ color: 'var(--muted)' }}>{info.uploader}</span>
                  )}
                  {info.view_count > 0 && (
                    <span className="mono text-xs" style={{ color: 'var(--muted)' }}>{formatViews(info.view_count)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Format selector */}
            <div className="mb-6">
              <p className="mono text-xs mb-3" style={{ color: 'var(--muted)', letterSpacing: '0.1em' }}>
                SELECT FORMAT
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {info.formats.map(f => (
                  <div
                    key={f.format_id}
                    className={`format-card glass rounded-xl p-3 ${selected?.format_id === f.format_id ? 'selected' : ''}`}
                    onClick={() => setSelected(f)}
                    style={{ border: '1px solid var(--border)' }}
                  >
                    <div className="mono font-bold text-sm" style={{ color: selected?.format_id === f.format_id ? 'var(--accent)' : 'var(--text)' }}>
                      {f.quality}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <span className="mono text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                        {f.ext}
                      </span>
                      {f.filesize && (
                        <span className="mono text-xs" style={{ color: 'var(--muted)' }}>
                          {formatSize(f.filesize)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Download button */}
            <button
              onClick={download}
              disabled={!selected || downloading}
              className="w-full py-4 rounded-2xl mono font-bold text-base text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                opacity: downloading ? 0.7 : 1,
                boxShadow: '0 8px 32px rgba(255,61,90,0.3)',
              }}
            >
              {downloading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="loader" /> PREPARING DOWNLOAD...
                </span>
              ) : (
                `↓ DOWNLOAD ${selected?.quality || ''}`
              )}
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="mono text-center text-xs mt-16" style={{ color: 'var(--muted)' }}>
          for personal use only · respect copyright
        </p>
      </div>
    </div>
  );
}
