import React, { useEffect, useRef } from 'react'
import flowfexLogo from '../../assets/flowfex-logo-official.png'

import {
  scrollFrameAspectRatio,
  scrollFrameCount,
  scrollFrameUrls,
} from '../../data/landing/generated/scrollFrames'

const TARGET_ASPECT_RATIO = scrollFrameAspectRatio || 2.39
const SCROLL_PIXELS_PER_FRAME = 18
const FRAME_EASE = 0.25

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function ScrollFrameSection() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const offscreenRef = useRef(null)
  const frameImagesRef = useRef([])
  const rafRef = useRef(0)
  const hasLoadedFirstFrameRef = useRef(false)
  const renderedFrameIndexRef = useRef(-1)
  const targetProgressRef = useRef(0)
  const easedProgressRef = useRef(0)
  const scrollDistanceRef = useRef(Math.max(scrollFrameCount * SCROLL_PIXELS_PER_FRAME, 2400))
  const canvasSizeRef = useRef({ w: 0, h: 0 })
  const [isLoaded, setIsLoaded] = React.useState(false)

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current

    if (!section || !canvas || !scrollFrameCount) {
      return undefined
    }

    const context = canvas.getContext('2d', { alpha: false })

    if (!context) {
      return undefined
    }

    // Create offscreen canvas for double-buffering (eliminates flicker)
    const offscreen = document.createElement('canvas')
    const offCtx = offscreen.getContext('2d', { alpha: false })
    offscreenRef.current = { canvas: offscreen, context: offCtx }

    let cancelled = false
    let isAnimating = false

    const syncCanvasSize = () => {
      const bounds = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const nextWidth = Math.max(1, Math.round(bounds.width * pixelRatio))
      const nextHeight = Math.max(1, Math.round(bounds.height * pixelRatio))

      if (canvasSizeRef.current.w === nextWidth && canvasSizeRef.current.h === nextHeight) {
        return false
      }

      canvas.width = nextWidth
      canvas.height = nextHeight
      offscreen.width = nextWidth
      offscreen.height = nextHeight
      canvasSizeRef.current = { w: nextWidth, h: nextHeight }

      // Paint with the branded dark base while frames are loading.
      context.fillStyle = '#0b1118'
      context.fillRect(0, 0, nextWidth, nextHeight)
      offCtx.fillStyle = '#0b1118'
      offCtx.fillRect(0, 0, nextWidth, nextHeight)

      return true
    }

    const loadFrame = (frameUrl, index) =>
      new Promise((resolve, reject) => {
        const image = new Image()

        image.decoding = 'async'
        image.fetchPriority = index < 8 ? 'high' : 'auto'
        image.src = frameUrl
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error(`Failed to load scroll frame: ${frameUrl}`))
      })

    const drawFrameToCanvas = (frameIndex) => {
      const image = frameImagesRef.current[frameIndex]
      if (!image) return

      const { w: canvasWidth, h: canvasHeight } = canvasSizeRef.current
      if (!canvasWidth || !canvasHeight) return

      // Draw to offscreen canvas first (double-buffer)
      offCtx.fillStyle = '#0b1118'
      offCtx.fillRect(0, 0, canvasWidth, canvasHeight)

      const canvasAspectRatio = canvasWidth / canvasHeight
      let drawWidth = canvasWidth
      let drawHeight = Math.round(drawWidth / TARGET_ASPECT_RATIO)

      if (canvasAspectRatio > TARGET_ASPECT_RATIO) {
        drawHeight = canvasHeight
        drawWidth = Math.round(drawHeight * TARGET_ASPECT_RATIO)
      }

      const destinationX = Math.round((canvasWidth - drawWidth) / 2)
      const destinationY = Math.round((canvasHeight - drawHeight) / 2)
      const sourceAspectRatio = image.naturalWidth / image.naturalHeight
      let sourceX = 0
      let sourceY = 0
      let sourceWidth = image.naturalWidth
      let sourceHeight = image.naturalHeight

      if (sourceAspectRatio > TARGET_ASPECT_RATIO) {
        sourceWidth = image.naturalHeight * TARGET_ASPECT_RATIO
        sourceX = (image.naturalWidth - sourceWidth) / 2
      } else if (sourceAspectRatio < TARGET_ASPECT_RATIO) {
        sourceHeight = image.naturalWidth / TARGET_ASPECT_RATIO
        sourceY = (image.naturalHeight - sourceHeight) / 2
      }

      offCtx.imageSmoothingEnabled = true
      offCtx.imageSmoothingQuality = 'high'
      offCtx.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        destinationX,
        destinationY,
        drawWidth,
        drawHeight
      )

      // Swap: copy the fully-rendered offscreen buffer to the visible canvas in one operation
      context.drawImage(offscreen, 0, 0)

      renderedFrameIndexRef.current = frameIndex
    }

    const animationLoop = () => {
      if (cancelled || !hasLoadedFirstFrameRef.current) {
        isAnimating = false
        return
      }

      const delta = targetProgressRef.current - easedProgressRef.current
      const stillMoving = Math.abs(delta) > 0.0003

      if (stillMoving) {
        easedProgressRef.current += delta * FRAME_EASE
      } else {
        easedProgressRef.current = targetProgressRef.current
      }

      const nextFrameIndex = clamp(
        Math.round(easedProgressRef.current * (scrollFrameCount - 1)),
        0,
        scrollFrameCount - 1
      )

      // Only redraw if the frame actually changed
      if (nextFrameIndex !== renderedFrameIndexRef.current) {
        drawFrameToCanvas(nextFrameIndex)
      }

      if (stillMoving) {
        rafRef.current = window.requestAnimationFrame(animationLoop)
      } else {
        isAnimating = false
        rafRef.current = 0
      }
    }

    const startAnimation = () => {
      if (isAnimating) return
      isAnimating = true
      rafRef.current = window.requestAnimationFrame(animationLoop)
    }

    const updateFrameTarget = () => {
      const sectionRect = section.getBoundingClientRect()
      const progress = clamp(-sectionRect.top / scrollDistanceRef.current, 0, 1)

      targetProgressRef.current = progress
      startAnimation()
    }

    const preloadFrames = async () => {
      const firstFramePromise = loadFrame(scrollFrameUrls[0], 0)
        .then((firstFrame) => {
          if (cancelled) {
            return null
          }

          frameImagesRef.current[0] = firstFrame
          hasLoadedFirstFrameRef.current = true
          renderedFrameIndexRef.current = -1
          setIsLoaded(true)

          // Draw the first frame immediately.
          syncCanvasSize()
          drawFrameToCanvas(0)
          updateFrameTarget()

          return firstFrame
        })
        .catch((error) => {
          console.error(error)
          return null
        })

      scrollFrameUrls.slice(1).forEach((frameUrl, index) => {
        loadFrame(frameUrl, index + 1)
          .then((image) => {
            if (cancelled) {
              return;
            }

            frameImagesRef.current[index + 1] = image;
          })
          .catch((error) => {
            console.error(error)
          })
      })

      await firstFramePromise
    }

    const handleViewportChange = () => {
      scrollDistanceRef.current = Math.max(scrollFrameCount * SCROLL_PIXELS_PER_FRAME, window.innerHeight * 2.75)
      syncCanvasSize()

      // Re-render current frame after resize without flicker
      if (hasLoadedFirstFrameRef.current && renderedFrameIndexRef.current >= 0) {
        drawFrameToCanvas(renderedFrameIndexRef.current)
      }

      updateFrameTarget()
    }

    scrollDistanceRef.current = Math.max(scrollFrameCount * SCROLL_PIXELS_PER_FRAME, window.innerHeight * 2.75)
    syncCanvasSize()
    context.fillStyle = '#0b1118'
    context.fillRect(0, 0, canvas.width, canvas.height)

    preloadFrames().catch((error) => {
      console.error(error)
    })

    window.addEventListener('scroll', updateFrameTarget, { passive: true })
    window.addEventListener('resize', handleViewportChange)

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            handleViewportChange()
          })

    if (resizeObserver) {
      resizeObserver.observe(canvas)
    }

    return () => {
      cancelled = true
      isAnimating = false
      hasLoadedFirstFrameRef.current = false
      window.removeEventListener('scroll', updateFrameTarget)
      window.removeEventListener('resize', handleViewportChange)

      if (resizeObserver) {
        resizeObserver.disconnect()
      }

      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  if (!scrollFrameCount) {
    return null
  }

  return (
    <section
      ref={sectionRef}
      className="landing-scroll-cinema"
      style={{ '--scroll-cinema-distance': `${Math.max(scrollFrameCount * SCROLL_PIXELS_PER_FRAME, 2400)}px` }}
      aria-hidden="true"
    >
      <div className="landing-scroll-cinema-sticky">
        {!isLoaded && (
          <div className="landing-scroll-cinema-loading">
            <div className="landing-scroll-cinema-shimmer" />
            <span>Loading preview…</span>
          </div>
        )}
        <canvas ref={canvasRef} className="landing-scroll-cinema-canvas" />

        {/* Flowfex 3D logo centered inside the donut ring - counter-rotates to stay centered */}
        <div className="landing-scroll-cinema-logo" aria-hidden="true">
          <div className="landing-scroll-cinema-logo-3d-wrapper">
            <div className="landing-scroll-cinema-logo-3d-scene">
              <div className="landing-scroll-cinema-logo-glow-core" />
              <div className="landing-scroll-cinema-logo-glow-outer" />
              <div className="landing-scroll-cinema-logo-glow-accent" />
              <div className="landing-scroll-cinema-logo-3d-face">
                <img
                  src={flowfexLogo}
                  alt=""
                  className="landing-scroll-cinema-logo-img"
                  draggable="false"
                />
              </div>
              <div className="landing-scroll-cinema-logo-3d-shine" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ScrollFrameSection
