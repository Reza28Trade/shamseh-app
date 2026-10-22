# Protected course content rollout checklist

This change adds authenticated HLS delivery for internally stored video files and page-by-page PDF rendering. It has **not** been deployed.

## Important security boundary

HLS is not DRM. A student who is authorized to watch a video can still capture the playback or retrieve the HLS segments. The implementation requires an authenticated session and checks course access for the playlist and every segment, uses private/no-store response headers, encrypts HLS segments with AES-128, authenticates every playlist/segment/key request, and keeps generated files under a private cache directory rather than serving them as static files. The AES key is served only through the authenticated backend route. The viewer watermark is a deterrent, not a guarantee against copying.

## Test-VPS prerequisites

The current test VPS inspection found LibreOffice but did not find FFmpeg, ffprobe, pdftoppm, or pdfinfo in PATH. The HLS endpoint will return a controlled service-unavailable response until FFmpeg is installed at `/usr/bin/ffmpeg` or `FFMPEG_PATH` is configured.

Before installing anything, check the branch and current backups. Do not run these steps on the production server without explicit approval.

Read-only verification:
```bash
command -v ffmpeg || true
test -x /usr/bin/ffmpeg && /usr/bin/ffmpeg -version | head -n 2 || true
df -h /
du -sh /opt/shamseh-app/storage/files 2>/dev/null || true
```

If and only if installation is approved for the test VPS, install the Ubuntu repository package:
```bash
sudo apt-get update
sudo apt-get install -y ffmpeg
/usr/bin/ffmpeg -version | head -n 2
```

This installs a free system package; it does not add a paid service. HLS conversion consumes CPU and disk, and the first request for each video may take time because the HLS version is generated on demand. The backend intentionally limits first-time transcodes to one at a time to reduce load on the small test VPS. Generated segments are cached under `$FILE_STORAGE_PATH/.hls-cache/<course-file-id>` (default `/opt/shamseh-app/storage/files/.hls-cache`) and are removed when the corresponding course file is deleted. Monitor cache size and disk space during testing.

## Safe test sequence

1. Keep this PR unmerged and do not deploy to production.
2. Install FFmpeg only on the approved test VPS.
3. Build frontend and backend from this branch.
4. Test one small, non-sensitive MP4 attached to a test course, with one enrolled test student.
5. Confirm a permitted student can play, pause, seek, and replay the video.
6. Confirm an authenticated user without course access receives 403 for both the playlist and a segment.
7. Confirm a logged-out request receives 401.
8. Confirm a non-video file cannot be served through the HLS endpoint.
9. Confirm the PDF viewer can navigate pages, zoom, and show the student watermark; test both native PDFs and office documents converted by LibreOffice.
10. Review audit logs, CPU use, conversion latency, cache growth, and errors before considering rollout.

Do not test with real student content until the test sequence passes. Do not merge or deploy without explicit approval.
