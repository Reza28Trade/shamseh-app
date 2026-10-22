import React, { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';

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
  watermarkLabel?: string;
}

export const FileViewer: React.FC<FileViewerProps> = ({ file, isDark, borderColor, textColor, onClose, watermarkLabel }) => {
  const [loading, setLoading] = useState(file.type !== 'AUDIO' && file.type !== 'VIDEO');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState<number | null>(null);
  const [viewUrl, setViewUrl] = useState('');
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileUrl = `/api/files/${file.id}/view`;
  const isPdfViewer = file.type === 'PDF' || file.type === 'POWERPOINT' || file.type === 'DOCUMENT';

  useEffect(() => {
    if (isPdfViewer) return;
    setViewUrl(fileUrl);
    setError('');
    setLoading(false);
  }, [file.id, fileUrl, isPdfViewer]);

  useEffect(() => {
    if (!isPdfViewer) {
      setPdfDocument(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    setViewUrl('');
    setPdfDocument(null);
    setPageNumber(1);
    setZoom(null);

    // Use PDF.js directly against the authenticated endpoint. The backend supports
    // HTTP byte ranges so PDF.js can request data as needed instead of eagerly
    // creating a complete Blob URL. This is a deterrent, not DRM.
    const loadingTask = getDocument({
      url: fileUrl,
      withCredentials: true,
      disableAutoFetch: true,
      disableStream: true,
      rangeChunkSize: 65536,
    });
    loadingTask.promise
      .then(document => {
        if (cancelled) {
          void document.destroy();
          return;
        }
        setPdfDocument(document);
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
      void loadingTask.destroy();
    };
  }, [file.id, fileUrl, isPdfViewer]);

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;
    let renderTask: RenderTask | undefined;
    let cancelled = false;
    setLoading(true);
    pdfDocument.getPage(pageNumber)
      .then(page => {
        if (cancelled || !canvasRef.current) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = Math.max(320, Math.min(1000, window.innerWidth * 0.88 - 48));
        const fitScale = containerWidth / baseViewport.width;
        const scale = fitScale * (zoom ?? 1);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('مرورگر امکان نمایش این صفحه را ندارد.');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${Math.ceil(viewport.width)}px`;
        canvas.style.height = `${Math.ceil(viewport.height)}px`;
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        return renderTask.promise;
      })
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch(renderError => {
        if (!cancelled && !(renderError instanceof Error && renderError.name === 'RenderingCancelledException')) {
          setError('نمایش صفحه انجام نشد.');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdfDocument, pageNumber, zoom]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={event => event.stopPropagation()} style={{ width: 'min(1150px, 96vw)', height: 'min(92vh, 1000px)', background: isDark ? '#111318' : '#fff', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,.55)' }}>
        <div style={{ minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0 16px', borderBottom: `1px solid ${borderColor}` }}>
          <strong style={{ color: textColor, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.title}</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {isPdfViewer && (
              <>
                <button type="button" aria-label="صفحه قبل" disabled={!pdfDocument || pageNumber <= 1} onClick={() => setPageNumber(value => Math.max(1, value - 1))} style={{ border: `1px solid ${borderColor}`, background: isDark ? '#1b1e24' : '#f5f6f8', color: textColor, borderRadius: 8, minWidth: 34, height: 32, cursor: 'pointer', fontSize: 12, opacity: !pdfDocument || pageNumber <= 1 ? .45 : 1 }}>قبلی</button>
                <span style={{ color: textColor, fontSize: 11, whiteSpace: 'nowrap' }}>{pdfDocument ? `${pageNumber} / ${pdfDocument.numPages}` : '— / —'}</span>
                <button type="button" aria-label="صفحه بعد" disabled={!pdfDocument || pageNumber >= pdfDocument.numPages} onClick={() => setPageNumber(value => Math.min(pdfDocument?.numPages ?? value, value + 1))} style={{ border: `1px solid ${borderColor}`, background: isDark ? '#1b1e24' : '#f5f6f8', color: textColor, borderRadius: 8, minWidth: 34, height: 32, cursor: 'pointer', fontSize: 12, opacity: !pdfDocument || pageNumber >= pdfDocument.numPages ? .45 : 1 }}>بعدی</button>
                <button type="button" aria-label="Zoom out" onClick={() => setZoom(value => Math.max(0.6, Number(((value ?? 1) - 0.1).toFixed(1))))} style={{ border: `1px solid ${borderColor}`, background: isDark ? '#1b1e24' : '#f5f6f8', color: textColor, borderRadius: 8, width: 34, height: 32, cursor: 'pointer', fontSize: 18 }}>−</button>
                <button type="button" aria-label="Fit to width" onClick={() => setZoom(null)} style={{ border: `1px solid ${borderColor}`, background: isDark ? '#1b1e24' : '#f5f6f8', color: textColor, borderRadius: 8, minWidth: 58, height: 32, cursor: 'pointer', fontSize: 12 }}>{zoom === null ? 'عرض کامل' : `${Math.round(zoom * 100)}%`}</button>
                <button type="button" aria-label="Zoom in" onClick={() => setZoom(value => Math.min(2.5, Number(((value ?? 1) + 0.1).toFixed(1))))} style={{ border: `1px solid ${borderColor}`, background: isDark ? '#1b1e24' : '#f5f6f8', color: textColor, borderRadius: 8, width: 34, height: 32, cursor: 'pointer', fontSize: 18 }}>+</button>
              </>
            )}
            <button type="button" onClick={onClose} style={{ border: 'none', background: 'rgba(239,68,68,.1)', color: '#f87171', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontWeight: 800 }}>بستن</button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#202124', position: 'relative' }}>
          {watermarkLabel && (
            <>
              <style>{`@keyframes shamseh-content-watermark { 0% { transform: translate(-8%, -8%) rotate(-22deg); } 50% { transform: translate(8%, 8%) rotate(-22deg); } 100% { transform: translate(-8%, -8%) rotate(-22deg); } }`}</style>
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 5, overflow: 'hidden', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,.34)', fontSize: 'clamp(14px, 2vw, 24px)', fontWeight: 800, textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,.55)', whiteSpace: 'nowrap', userSelect: 'none', animation: 'shamseh-content-watermark 24s ease-in-out infinite' }}>
                  شمسه • {watermarkLabel}
                </div>
              </div>
            </>
          )}
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
              {!error && pdfDocument && (
                <div style={{ minHeight: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 16, boxSizing: 'border-box' }}>
                  <canvas ref={canvasRef} aria-label={`صفحه ${pageNumber} از ${pdfDocument.numPages}`} style={{ maxWidth: '100%', height: 'auto', background: '#fff', boxShadow: '0 2px 16px rgba(0,0,0,.35)' }} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
