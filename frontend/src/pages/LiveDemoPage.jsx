import React, { useEffect, useRef, useState } from 'react';
import { scrollFrameAspectRatio, scrollFrameUrls } from '../data/landing/generated/scrollFrames';
import '../styles/demo-page.css';

const TARGET_ASPECT_RATIO = scrollFrameAspectRatio || 2.39;
const PLAYBACK_FPS = 18;

function syncCanvasSize(canvas) {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
  const nextWidth = Math.max(1, Math.round(bounds.width * pixelRatio));
  const nextHeight = Math.max(1, Math.round(bounds.height * pixelRatio));

  if (canvas.width === nextWidth && canvas.height === nextHeight) {
    return;
  }

  canvas.width = nextWidth;
  canvas.height = nextHeight;
}

function drawFrame(context, canvas, image) {
  if (!image) return;

  syncCanvasSize(canvas);
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const canvasAspectRatio = canvas.width / canvas.height;
  let drawWidth = canvas.width;
  let drawHeight = Math.round(drawWidth / TARGET_ASPECT_RATIO);

  if (canvasAspectRatio > TARGET_ASPECT_RATIO) {
    drawHeight = canvas.height;
    drawWidth = Math.round(drawHeight * TARGET_ASPECT_RATIO);
  }

  const destinationX = Math.round((canvas.width - drawWidth) / 2);
  const destinationY = Math.round((canvas.height - drawHeight) / 2);
  const sourceAspectRatio = image.naturalWidth / image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;

  if (sourceAspectRatio > TARGET_ASPECT_RATIO) {
    sourceWidth = image.naturalHeight * TARGET_ASPECT_RATIO;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else if (sourceAspectRatio < TARGET_ASPECT_RATIO) {
    sourceHeight = image.naturalWidth / TARGET_ASPECT_RATIO;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.filter = 'contrast(1.04) saturate(1.06)';
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    destinationX,
    destinationY,
    drawWidth,
    drawHeight
  );
  context.filter = 'none';
}

function LiveDemoPage() {
  const canvasRef = useRef(null);
  const frameImagesRef = useRef([]);
  const rafRef = useRef(0);
  const frameIndexRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scrollFrameUrls.length) {
      return undefined;
    }

    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) {
      return undefined;
    }

    let cancelled = false;

    const render = (time) => {
      if (cancelled) {
        return;
      }

      const frames = frameImagesRef.current;
      if (frames.length) {
        if (!lastFrameTimeRef.current) {
          lastFrameTimeRef.current = time;
        }

        if (time - lastFrameTimeRef.current >= 1000 / PLAYBACK_FPS) {
          frameIndexRef.current = (frameIndexRef.current + 1) % frames.length;
          lastFrameTimeRef.current = time;
        }

        drawFrame(context, canvas, frames[frameIndexRef.current]);
      }

      rafRef.current = window.requestAnimationFrame(render);
    };

    const preloadFrames = async () => {
      const loadedFrames = await Promise.all(
        scrollFrameUrls.map(
          (frameUrl, index) =>
            new Promise((resolve, reject) => {
              const image = new Image();
              image.decoding = 'async';
              image.fetchPriority = index < 12 ? 'high' : 'auto';
              image.src = frameUrl;
              image.onload = () => resolve(image);
              image.onerror = () => reject(new Error(`Failed to load demo frame: ${frameUrl}`));
            })
        )
      );

      if (cancelled) {
        return;
      }

      frameImagesRef.current = loadedFrames;
      frameIndexRef.current = 0;
      setIsReady(true);
      drawFrame(context, canvas, loadedFrames[0]);
    };

    const handleResize = () => {
      syncCanvasSize(canvas);
      if (frameImagesRef.current.length) {
        drawFrame(context, canvas, frameImagesRef.current[frameIndexRef.current]);
      }
    };

    syncCanvasSize(canvas);
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    preloadFrames().catch((error) => {
      console.error(error);
    });

    rafRef.current = window.requestAnimationFrame(render);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  if (!scrollFrameUrls.length) {
    return (
      <main className="live-demo-page">
        <div className="live-demo-loading">Live demo unavailable.</div>
      </main>
    );
  }

  return (
    <main className="live-demo-page" aria-label="Flowfex live demo">
      <canvas ref={canvasRef} className="live-demo-canvas" />
      <div className={`live-demo-loading ${isReady ? 'is-hidden' : ''}`}>Loading live demo…</div>
    </main>
  );
}

export default LiveDemoPage;
