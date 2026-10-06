import React, { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist';

GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(file.type !== 'AUDIO' && file.type !== 'VIDEO');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const viewUrl = `/api/files/${file.id}/view`;
  const isPdfViewer = file.type === 'PDF' || file.type === 'POWERPOINT' || file.type === 'DOCUMENT';

  useEffect(() => {
    if (!isPdfViewer) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setPdf(null);
    setZoom(1);
    let task: ReturnType<typeof getDocument> | null = null;
    let objectUrl = '';
    fetch(viewUrl, { credentials: 'include' })
      .then(async response => {
        if (!response.ok) {
          const message = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}${message ? `: ${message.slice(0, 160)}` : ''}`);
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        task = getDocument({
          url: objectUrl,
          cMapUrl: '/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/standard_fonts/',
          useSystemFonts: true,
          disableFontFace: false,
        });
        return task.promise;
      })
      .then(document => {
        if (!cancelled) {
          setPdf(document);
          setLoading(false);
        } else {
          void document.destroy();
        }
      })
      .catch(error => {
        if (!cancelled) {
          setError(error instanceof Error ? `نمایش فایل انجام نشد: ${error.message}` : 'نمایش فایل انجام نشد.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      if (task) void task.destroy();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id, isPdfViewer, viewUrl]);

  useEffect(() => {
    if (!pdf || !pagesRef.current) return;
    let cancelled = false;
    const container = pagesRef.current;
    const renderPages = async () => {
      container.replaceChildren();
      const availableWidth = Math.max(container.clientWidth - 16, 280);
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        if (cancelled) return;
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale = availableWidth / baseViewport.width;
        const scale = Math.max(0.45, fitScale * zoom);
        const outputScale = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width * outputScale);
        canvas.height = Math.ceil(viewport.height * outputScale);
        canvas.style.display = 'block';
        canvas.style.maxWidth = 'none';
        canvas.style.height = 'auto';
        canvas.style.margin = '0 auto 18px';
        canvas.style.background = '#fff';
        canvas.style.boxShadow = '0 4px 18px rgba(0,0,0,.22)';
        container.appendChild(canvas);
        await page.render({
          canvas,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        }).promise;
      }
    };
    void renderPages().catch(() => {
      if (!cancelled) setError('نمایش صفحات فایل انجام نشد.');
    });
    return () => { cancelled = true; };
  }, [pdf, zoom]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={event => event.stopPropagation()} style={{ width: 'min(1150px, 96vw)', height: 'min(92vh, 1000px)', background: isDark ? '#111318' : '#fff', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,.55)' }}>
        <div style={{ minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 16px', borderBottom: `1px solid ${borderColor}` }}>
          <strong style={{ color: textColor, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.title}</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {isPdfViewer && (
              <>
                <button type="button" aria-label="Zoom out" onClick={() => setZoom(value => Math.max(0.6, Number((value - 0.1).toFixed(1))))} style={{ border: `1px solid ${borderColor}`, background: isDark ? '#1b1e24' : '#f5f6f8', color: textColor, borderRadius: 8, width: 34, height: 32, cursor: 'pointer', fontSize: 18 }}>−</button>
                <span style={{ color: textColor, fontSize: 12, minWidth: 46, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                <button type="button" aria-label="Zoom in" onClick={() => setZoom(value => Math.min(2.5, Number((value + 0.1).toFixed(1))))} style={{ border: `1px solid ${borderColor}`, background: isDark ? '#1b1e24' : '#f5f6f8', color: textColor, borderRadius: 8, width: 34, height: 32, cursor: 'pointer', fontSize: 18 }}>+</button>
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
              <div ref={pagesRef} style={{ padding: '24px max(12px, 3vw)', display: loading || error ? 'none' : 'block', boxSizing: 'border-box' }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
