import React, { useEffect, useRef } from 'react'

import {
  scrollFrameAspectRatio,
  scrollFrameCount,
  scrollFrameUrls,
} from '../../data/landing/generated/scrollFrames'

const TARGET_ASPECT_RATIO = scrollFrameAspectRatio || 2.39

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function ScrollFrameSection() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const frameImagesRef = useRef([])
  const rafRef = useRef(0)
  const hasLoadedAllFramesRef = useRef(false)
  const pendingFrameIndexRef = useRef(0)
  const renderedFrameIndexRef = useRef(-1)

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current

    if (!section || !canvas || !scrollFrameCount) {
      return undefined
    }

    const context = canvas.getContext('2d', { alpha: false, desynchronized: true })

    if (!context) {
      return undefined
    }

    let cancelled = false

    const paintBlack = () => {
      context.fillStyle = '#000'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }

    const syncCanvasSize = () => {
      const bounds = canvas.getBoundingClientRect()
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const nextWidth = Math.max(1, Math.round(bounds.width * pixelRatio))
      const nextHeight = Math.max(1, Math.round(bounds.height * pixelRatio))

      if (canvas.width === nextWidth && canvas.height === nextHeight) {
        return
      }

      canvas.width = nextWidth
      canvas.height = nextHeight
    }

    const requestDraw = () => {
      if (rafRef.current) {
        return
      }

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = 0

        if (!hasLoadedAllFramesRef.current) {
          return
        }

        const image = frameImagesRef.current[pendingFrameIndexRef.current]

        if (!image) {
          return
        }

        syncCanvasSize()
        paintBlack()

        const canvasWidth = canvas.width
        const canvasHeight = canvas.height
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

        // Match the cinematic target aspect without stretching the source frames.
        if (sourceAspectRatio > TARGET_ASPECT_RATIO) {
          sourceWidth = image.naturalHeight * TARGET_ASPECT_RATIO
          sourceX = (image.naturalWidth - sourceWidth) / 2
        } else if (sourceAspectRatio < TARGET_ASPECT_RATIO) {
          sourceHeight = image.naturalWidth / TARGET_ASPECT_RATIO
          sourceY = (image.naturalHeight - sourceHeight) / 2
        }

        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
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
        )

        renderedFrameIndexRef.current = pendingFrameIndexRef.current
      })
    }

    const updateFrameIndex = () => {
      const sectionRect = section.getBoundingClientRect()
      const scrollDistance = scrollFrameCount * 4
      const progress = clamp(-sectionRect.top / scrollDistance, 0, 1)
      const nextFrameIndex = Math.min(scrollFrameCount - 1, Math.floor(progress * scrollFrameCount))

      pendingFrameIndexRef.current = nextFrameIndex

      if (renderedFrameIndexRef.current !== nextFrameIndex || !canvas.width || !canvas.height) {
        requestDraw()
      }
    }

    const preloadFrames = async () => {
      const loadedFrames = await Promise.all(
        scrollFrameUrls.map(
          (frameUrl, index) =>
            new Promise((resolve, reject) => {
              const image = new Image()

              image.decoding = 'async'
              image.fetchPriority = index < 12 ? 'high' : 'auto'
              image.src = frameUrl
              image.onload = () => resolve(image)
              image.onerror = () => reject(new Error(`Failed to load scroll frame: ${frameUrl}`))
            })
        )
      )

      if (cancelled) {
        return
      }

      frameImagesRef.current = loadedFrames
      hasLoadedAllFramesRef.current = true
      renderedFrameIndexRef.current = -1
      requestDraw()
    }

    const handleViewportChange = () => {
      syncCanvasSize()
      updateFrameIndex()
    }

    syncCanvasSize()
    paintBlack()
    updateFrameIndex()

    preloadFrames().catch((error) => {
      console.error(error)
    })

    window.addEventListener('scroll', updateFrameIndex, { passive: true })
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
      hasLoadedAllFramesRef.current = false
      window.removeEventListener('scroll', updateFrameIndex)
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
      style={{ '--scroll-cinema-distance': `${scrollFrameCount * 4}px` }}
      aria-hidden="true"
    >
      <div className="landing-scroll-cinema-sticky">
        <canvas ref={canvasRef} className="landing-scroll-cinema-canvas" />
      </div>
    </section>
  )
}

export default ScrollFrameSection
