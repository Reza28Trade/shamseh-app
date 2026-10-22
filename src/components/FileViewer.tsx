import React, { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import Hls from 'hls.js';

GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
type ViewerFile = {
  id: string;
  title: string;
  type: 'PDF' | 'POWERPOINT' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'LINK';
  mimeType?: string | null;
  storageKey?: string | null;
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
  const [textContent, setTextContent] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileUrl = `/api/files/${file.id}/view`;
  const fileExtension = (file.storageKey || file.title).toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
  const mimeType = String(file.mimeType || '').toLowerCase();
  const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
  const isImageViewer = mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
  const isTextViewer = mimeType.startsWith('text/') || ['txt', 'md', 'csv', 'json', 'xml', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'log'].includes(fileExtension);
  const isOfficeMime = mimeType.includes('msword') || mimeType.includes('wordprocessingml') || mimeType.includes('ms-excel') || mimeType.includes('spreadsheetml') || mimeType.includes('ms-powerpoint') || mimeType.includes('presentationml') || mimeType.includes('opendocument');
  const isPdfViewer = mimeType === 'application/pdf' || fileExtension === 'pdf' || file.type === 'PDF' || file.type === 'POWERPOINT' || officeExtensions.includes(fileExtension) || isOfficeMime || (file.type === 'DOCUMENT' && !file.mimeType && !file.storageKey);

  useEffect(() => {
    if (isPdfViewer) return;
    setError('');
    setLoading(false);
    setTextContent('');
    setViewUrl(file.type === 'VIDEO' ? `/api/files/${file.id}/hls/index.m3u8` : fileUrl);
  }, [file.id, file.type, fileUrl, isPdfViewer]);

  useEffect(() => {
    if (file.type !== 'VIDEO' || !viewUrl || !videoRef.current) return;
    const video = videoRef.current;
    setError('');
    setLoading(true);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        // The first video request may wait for the first encrypted segment to be generated.
        // Retry temporary server responses rather than failing playback immediately.
        manifestLoadingMaxRetry: 30,
        manifestLoadingRetryDelay: 1000,
        manifestLoadingMaxRetryTimeout: 8000,
        levelLoadingMaxRetry: 12,
        levelLoadingRetryDelay: 1000,
        fragLoadingMaxRetry: 12,
        fragLoadingRetryDelay: 1000,
        xhrSetup: (xhr) => { xhr.withCredentials = true; },
      });
      hls.loadSource(viewUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setLoading(false));
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setError('پخش محافظت‌شدهٔ ویدئو آماده نیست یا دسترسی به آن امکان‌پذیر نیست.');
          setLoading(false);
        }
      });
      return () => hls.destroy();
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = viewUrl;
      const onReady = () => setLoading(false);
      const onError = () => {
        setError('پخش ویدئو ناموفق بود. ممکن است ابزار پخش روی سرور آماده نشده باشد.');
        setLoading(false);
      };
      video.addEventListener('loadedmetadata', onReady);
      video.addEventListener('error', onError);
      return () => {
        video.removeEventListener('loadedmetadata', onReady);
        video.removeEventListener('error', onError);
        video.removeAttribute('src');
        video.load();
      };
    }

    setError('مرورگر شما از پخش این نوع ویدئو پشتیبانی نمی‌کند.');
    setLoading(false);
  }, [file.id, file.type, viewUrl]);

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
    if (!isTextViewer || !viewUrl) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setTextContent('');
    fetch(viewUrl, { credentials: 'include' })
      .then(response => {
        if (!response.ok) throw new Error(`درخواست فایل با خطای HTTP ${response.status} مواجه شد.`);
        return response.text();
      })
      .then(content => {
        if (!cancelled) {
          setTextContent(content);
          setLoading(false);
        }
      })
      .catch(fetchError => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? `نمایش فایل انجام نشد: ${fetchError.message}` : 'نمایش فایل متنی ناموفق بود.');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [isTextViewer, viewUrl]);

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
    <div className="shamseh-viewer-backdrop" onClick={onClose}>
      <style>{`
        .shamseh-viewer-backdrop{position:fixed;inset:0;z-index:9999;background:rgba(7,11,16,.78);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:clamp(8px,2vw,24px);animation:shamsehViewerFade .18s ease-out}
        .shamseh-viewer-shell{width:min(1380px,98vw);height:min(94vh,1100px);background:${isDark ? '#101419' : '#f8fafc'};color:${textColor};border:1px solid ${isDark ? 'rgba(255,255,255,.11)' : 'rgba(15,23,42,.12)'};border-radius:20px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 32px 100px rgba(0,0,0,.48);animation:shamsehViewerUp .22s ease-out}
        .shamseh-viewer-header{min-height:68px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 20px;border-bottom:1px solid ${borderColor};background:${isDark ? '#151a21' : '#fff'}}
        .shamseh-viewer-fileinfo{display:flex;align-items:center;gap:12px;min-width:0}
        .shamseh-viewer-fileicon{width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;border-radius:13px;background:${isDark ? 'rgba(70,181,174,.13)' : '#e8f6f4'};color:#42a9a2;font-size:19px;font-weight:800}
        .shamseh-viewer-title{font-size:14px;font-weight:750;line-height:1.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:min(55vw,760px)}
        .shamseh-viewer-subtitle{font-size:11px;color:${isDark ? '#9ba7b5' : '#64748b'};margin-top:2px}
        .shamseh-viewer-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap}
        .shamseh-viewer-btn{height:36px;min-width:36px;padding:0 11px;border:1px solid ${borderColor};border-radius:10px;background:${isDark ? '#202731' : '#f8fafc'};color:${textColor};font:600 12px/1.2 inherit;cursor:pointer;transition:background .15s,border-color .15s,transform .15s}
        .shamseh-viewer-btn:hover:not(:disabled){background:${isDark ? '#293541' : '#edf5f5'};border-color:#4aa9a1}
        .shamseh-viewer-btn:active:not(:disabled){transform:scale(.97)}
        .shamseh-viewer-btn:disabled{opacity:.35;cursor:not-allowed}
        .shamseh-viewer-close{background:rgba(239,68,68,.09);border-color:rgba(239,68,68,.2);color:#f87171;padding:0 14px}
        .shamseh-viewer-stage{flex:1;min-height:0;overflow:auto;background:${isDark ? '#171b21' : '#e9edf2'};position:relative;overscroll-behavior:contain}
        .shamseh-viewer-state{color:${isDark ? '#d6dee8' : '#475569'};text-align:center;padding:48px 20px;font-size:13px}
        .shamseh-viewer-canvas-wrap{min-height:100%;display:flex;justify-content:center;align-items:flex-start;padding:clamp(12px,2vw,28px);box-sizing:border-box}
        .shamseh-viewer-canvas{max-width:100%;height:auto;background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.2);border-radius:2px}
        .shamseh-viewer-text{min-height:100%;padding:clamp(16px,3vw,36px);box-sizing:border-box}
        .shamseh-viewer-text pre{margin:0;color:${isDark ? '#e7edf4' : '#263445'};white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.9 ui-monospace,SFMono-Regular,Consolas,monospace}
        .shamseh-viewer-media{height:100%;min-height:260px;display:flex;align-items:center;justify-content:center;padding:clamp(10px,2vw,24px);box-sizing:border-box}
        .shamseh-viewer-video{width:100%;height:100%;max-height:100%;object-fit:contain;background:#090b0e}
        .shamseh-viewer-audio{width:min(720px,100%);padding:26px;border:1px solid ${isDark ? 'rgba(255,255,255,.1)' : '#dbe3eb'};border-radius:18px;background:${isDark ? '#202731' : '#fff'};box-shadow:0 12px 36px rgba(0,0,0,.12)}
        .shamseh-viewer-audio-label{font-size:13px;font-weight:700;margin:0 0 18px;overflow-wrap:anywhere}
        @keyframes shamsehViewerFade{from{opacity:0}to{opacity:1}}@keyframes shamsehViewerUp{from{opacity:.7;transform:translateY(8px) scale(.99)}to{opacity:1;transform:translateY(0) scale(1)}}
        @media(max-width:680px){.shamseh-viewer-backdrop{padding:0}.shamseh-viewer-shell{width:100vw;height:100dvh;max-height:100dvh;border-radius:0;border:0}.shamseh-viewer-header{min-height:58px;padding:9px 11px;gap:8px}.shamseh-viewer-fileicon{width:34px;height:34px;flex-basis:34px;border-radius:10px;font-size:16px}.shamseh-viewer-fileinfo{gap:8px}.shamseh-viewer-title{font-size:12px;max-width:40vw}.shamseh-viewer-subtitle{font-size:10px}.shamseh-viewer-actions{gap:4px}.shamseh-viewer-btn{height:32px;min-width:31px;padding:0 7px;border-radius:8px;font-size:11px}.shamseh-viewer-close{padding:0 9px}.shamseh-viewer-canvas-wrap{padding:8px}.shamseh-viewer-audio{padding:16px}.shamseh-viewer-text{padding:14px}.shamseh-viewer-text pre{font-size:12px}}
        @media(prefers-reduced-motion:reduce){.shamseh-viewer-backdrop,.shamseh-viewer-shell{animation:none}}
      `}</style>
      <div className="shamseh-viewer-shell" onClick={event => event.stopPropagation()}>
        <header className="shamseh-viewer-header">
          <div className="shamseh-viewer-fileinfo">
            <div className="shamseh-viewer-fileicon" aria-hidden="true">{file.type === 'VIDEO' ? '▶' : file.type === 'AUDIO' ? '♫' : isImageViewer ? '▧' : isTextViewer ? '≡' : '▤'}</div>
            <div style={{minWidth:0}}>
              <div className="shamseh-viewer-title" title={file.title}>{file.title}</div>
              <div className="shamseh-viewer-subtitle">{file.type === 'VIDEO' ? 'ویدئوی آموزشی' : file.type === 'AUDIO' ? 'فایل صوتی' : isImageViewer ? 'نمایش تصویر' : isTextViewer ? 'نمایش متن' : 'نمایش جزوه'} · محیط مطالعهٔ شمسه</div>
            </div>
          </div>
          <div className="shamseh-viewer-actions">
            {isPdfViewer && (
              <>
                <button className="shamseh-viewer-btn" type="button" aria-label="صفحه قبل" disabled={!pdfDocument || pageNumber <= 1} onClick={() => setPageNumber(value => Math.max(1, value - 1))}>قبلی</button>
                <span style={{color:textColor,fontSize:11,whiteSpace:'nowrap',padding:'0 3px'}}>{pdfDocument ? `${pageNumber} / ${pdfDocument.numPages}` : '— / —'}</span>
                <button className="shamseh-viewer-btn" type="button" aria-label="صفحه بعد" disabled={!pdfDocument || pageNumber >= pdfDocument.numPages} onClick={() => setPageNumber(value => Math.min(pdfDocument?.numPages ?? value, value + 1))}>بعدی</button>
                <button className="shamseh-viewer-btn" type="button" aria-label="Zoom out" onClick={() => setZoom(value => Math.max(0.6, Number(((value ?? 1) - 0.1).toFixed(1))))}>−</button>
                <button className="shamseh-viewer-btn" type="button" aria-label="Fit to width" onClick={() => setZoom(null)}>{zoom === null ? 'عرض کامل' : `${Math.round(zoom * 100)}٪`}</button>
                <button className="shamseh-viewer-btn" type="button" aria-label="Zoom in" onClick={() => setZoom(value => Math.min(2.5, Number(((value ?? 1) + 0.1).toFixed(1))))}>+</button>
              </>
            )}
            <button className="shamseh-viewer-btn shamseh-viewer-close" type="button" onClick={onClose}>بستن <span aria-hidden="true">×</span></button>
          </div>
        </header>
        <main className="shamseh-viewer-stage">
          {watermarkLabel && (
            <>
              <style>{`@keyframes shamseh-content-watermark { 0% { transform: translate(-8%, -8%) rotate(-22deg); } 50% { transform: translate(8%, 8%) rotate(-22deg); } 100% { transform: translate(-8%, -8%) rotate(-22deg); } }`}</style>
              <div aria-hidden="true" style={{position:'absolute',inset:0,zIndex:5,overflow:'hidden',pointerEvents:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{color:'rgba(255,255,255,.28)',fontSize:'clamp(14px,2vw,24px)',fontWeight:800,textAlign:'center',textShadow:'0 1px 3px rgba(0,0,0,.55)',whiteSpace:'nowrap',userSelect:'none',animation:'shamseh-content-watermark 24s ease-in-out infinite'}}>شمسه • {watermarkLabel}</div>
              </div>
            </>
          )}
          {file.type === 'VIDEO' && loading && <div className="shamseh-viewer-state">در حال آماده‌سازی پخش محافظت‌شدهٔ ویدئو...</div>}
          {file.type === 'VIDEO' && error && <div className="shamseh-viewer-state" style={{color:'#f87171'}}>{error}</div>}
          {file.type === 'AUDIO' ? (
            <div className="shamseh-viewer-media">
              <div className="shamseh-viewer-audio">
                <p className="shamseh-viewer-audio-label">{file.title}</p>
                <audio src={viewUrl} controls controlsList="nodownload" style={{width:'100%'}} />
              </div>
            </div>
          ) : file.type === 'VIDEO' ? (
            <video ref={videoRef} controls controlsList="nodownload" disablePictureInPicture onError={() => { if (file.type === 'VIDEO') { setError('پخش ویدئو ناموفق بود.'); setLoading(false); } }} className="shamseh-viewer-video" style={{display:error ? 'none' : 'block'}} />
          ) : isImageViewer ? (
            <div className="shamseh-viewer-media">
              {loading && <div className="shamseh-viewer-state">در حال بارگذاری تصویر...</div>}
              {error && <div className="shamseh-viewer-state" style={{color:'#f87171'}}>{error}</div>}
              {!error && <img src={viewUrl} alt={file.title} onLoad={() => setLoading(false)} onError={() => { setError('نمایش تصویر ناموفق بود.'); setLoading(false); }} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain',display:loading ? 'none' : 'block',borderRadius:8,boxShadow:'0 12px 36px rgba(0,0,0,.2)'}} />}
            </div>
          ) : isTextViewer ? (
            <div className="shamseh-viewer-text">
              {loading && <div className="shamseh-viewer-state">در حال بارگذاری متن...</div>}
              {error && <div className="shamseh-viewer-state" style={{color:'#f87171'}}>{error}</div>}
              {!loading && !error && <pre dir="auto">{textContent}</pre>}
            </div>
          ) : (
            <>
              {loading && <div className="shamseh-viewer-state">در حال آماده‌سازی نمایش فایل...</div>}
              {error && <div className="shamseh-viewer-state" style={{color:'#f87171'}}>{error}</div>}
              {!error && pdfDocument && (
                <div className="shamseh-viewer-canvas-wrap">
                  <canvas ref={canvasRef} aria-label={`صفحه ${pageNumber} از ${pdfDocument.numPages}`} className="shamseh-viewer-canvas" />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
