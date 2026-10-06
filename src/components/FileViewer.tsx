import React, { useEffect, useRef, useState } from 'react';
type ViewerFile = {
  id: string;
  title: string;
  type: 'PDF' | 'POWERPOINT' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'LINK';
};

interface FileViewerProps {
  file: ViewerFile;
  isDark: boolean;
  borderColor: string;
  textColor: string;
  onClose: () => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({ file, isDark, borderColor, textColor, onClose }) => {
  const [loading, setLoading] = useState(file.type !== 'AUDIO' && file.type !== 'VIDEO');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState<number | null>(null);
  const [viewUrl, setViewUrl] = useState('');
  const objectUrlRef = useRef('');
  const fileUrl = `/api/files/${file.id}/view`;
  const isPdfViewer = file.type === 'PDF' || file.type === 'POWERPOINT' || file.type === 'DOCUMENT';
  const pdfSrc = viewUrl ? `${viewUrl}#toolbar=0&navpanes=0&scrollbar=0&${zoom === null ? 'view=fith' : `zoom=${Math.round(zoom * 100)}`}` : '';

  useEffect(() => {
    if (!isPdfViewer) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setViewUrl('');
    setZoom(null);
    fetch(fileUrl, { credentials: 'include' })
      .then(async response => {
        if (!response.ok) {
          const message = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}${message ? `: ${message.slice(0, 160)}` : ''}`);
        }
        return response.blob();
      })
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setViewUrl(url);
        setLoading(false);
      })
      .catch(fetchError => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? `نمایش فایل انجام نشد: ${fetchError.message}` : 'نمایش فایل انجام نشد.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }
    };
  }, [file.id, fileUrl, isPdfViewer]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={event => event.stopPropagation()} style={{ width: 'min(1150px, 96vw)', height: 'min(92vh, 1000px)', background: isDark ? '#111318' : '#fff', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,.55)' }}>
        <div style={{ minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 16px', borderBottom: `1px solid ${borderColor}` }}>
          <strong style={{ color: textColor, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.title}</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {isPdfViewer && (
              <>
                <button type="button" aria-label="Zoom out" onClick={() => setZoom(value => Math.max(0.6, Number(((value ?? 1) - 0.1).toFixed(1))))} style={{ border: `1px solid ${borderColor}`, background: isDark ? '#1b1e24' : '#f5f6f8', color: textColor, borderRadius: 8, width: 34, height: 32, cursor: 'pointer', fontSize: 18 }}>−</button>
                <button type="button" aria-label="Fit to width" onClick={() => setZoom(null)} style={{ border: `1px solid ${borderColor}`, background: isDark ? '#1b1e24' : '#f5f6f8', color: textColor, borderRadius: 8, minWidth: 58, height: 32, cursor: 'pointer', fontSize: 12 }}>{zoom === null ? 'عرض کامل' : `${Math.round(zoom * 100)}%`}</button>
                <button type="button" aria-label="Zoom in" onClick={() => setZoom(value => Math.min(2.5, Number(((value ?? 1) + 0.1).toFixed(1))))} style={{ border: `1px solid ${borderColor}`, background: isDark ? '#1b1e24' : '#f5f6f8', color: textColor, borderRadius: 8, width: 34, height: 32, cursor: 'pointer', fontSize: 18 }}>+</button>
              </>
            )}
            <button type="button" onClick={onClose} style={{ border: 'none', background: 'rgba(239,68,68,.1)', color: '#f87171', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontWeight: 800 }}>بستن</button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#202124' }}>
          {file.type === 'AUDIO' ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, boxSizing: 'border-box' }}>
              <audio src={viewUrl} controls controlsList="nodownload" style={{ width: 'min(700px, 100%)' }} />
            </div>
          ) : file.type === 'VIDEO' ? (
            <video src={viewUrl} controls controlsList="nodownload" disablePictureInPicture style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <>
              {loading && <div style={{ color: '#fff', textAlign: 'center', padding: 40 }}>در حال آماده‌سازی نمایش فایل...</div>}
              {error && <div style={{ color: '#f87171', textAlign: 'center', padding: 40 }}>{error}</div>}
              {!loading && !error && viewUrl && (
                <iframe
                  key={pdfSrc}
                  title={file.title}
                  src={pdfSrc}
                  style={{ width: '100%', height: '100%', minHeight: 500, border: 'none', display: 'block', background: '#fff' }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
