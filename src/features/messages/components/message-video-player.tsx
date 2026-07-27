import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

interface MessageVideoPlayerProps {
  filename: string
  /** Trusted pixel height when known; used to reserve aspect before metadata loads. */
  height?: number
  src: string
  width?: number
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const mins = Math.floor(total / 60)
  const secs = total % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Chat video player:
 * - Idle / paused: first frame + center play only
 * - Playing: compact bottom bar (pause, scrub, mute, fullscreen)
 * Wrapper shrink-wraps the video so portrait clips keep their aspect ratio.
 */
export function MessageVideoPlayer({
  filename,
  height = 0,
  src,
  width = 0,
}: MessageVideoPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [frameSize, setFrameSize] = useState(() =>
    width > 0 && height > 0 ? { height, width } : undefined,
  )

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === rootRef.current)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onDurationChange = () => {
      if (Number.isFinite(video.duration)) setDuration(video.duration)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => setPlaying(false)

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
    }
  }, [src])

  const seekToPosterFrame = () => {
    const video = videoRef.current
    if (!video) return
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setFrameSize({ height: video.videoHeight, width: video.videoWidth })
    }
    if (video.currentTime !== 0) return
    const length = Number.isFinite(video.duration) ? video.duration : 0
    video.currentTime = length > 0 ? Math.min(0.1, length / 4) : 0.001
  }

  const togglePlayback = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play()
    } else {
      video.pause()
    }
  }

  const toggleFullscreen = () => {
    const root = rootRef.current
    if (!root) return
    if (document.fullscreenElement === root) {
      void document.exitFullscreen()
      return
    }
    void root.requestFullscreen()
  }

  const onScrubPointer = (event: PointerEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video || !duration) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    video.currentTime = ratio * duration
    setCurrentTime(video.currentTime)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      togglePlayback()
    }
  }

  const progress = duration > 0 ? currentTime / duration : 0
  const aspectRatio =
    !fullscreen && frameSize && frameSize.width > 0 && frameSize.height > 0
      ? `${frameSize.width} / ${frameSize.height}`
      : undefined

  return (
    <div
      ref={rootRef}
      className={
        fullscreen
          ? 'relative flex h-full w-full items-center justify-center overflow-hidden bg-canvas'
          : 'group/video relative inline-block max-h-80 max-w-full overflow-hidden rounded-control border border-line bg-canvas align-top'
      }
      style={aspectRatio ? { aspectRatio } : undefined}
      onKeyDown={onKeyDown}
    >
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        muted={muted}
        playsInline
        aria-label={filename}
        className={
          fullscreen
            ? 'max-h-full max-w-full object-contain'
            : 'block h-full max-h-80 w-auto max-w-full object-contain'
        }
        onLoadedMetadata={seekToPosterFrame}
        onClick={togglePlayback}
      />

      {!playing ? (
        <>
          <button
            type="button"
            aria-label={`Play ${filename}`}
            className="absolute inset-0 grid place-items-center bg-canvas/20 transition hover:bg-canvas/30"
            onClick={togglePlayback}
          >
            <span
              aria-hidden="true"
              className="grid size-12 place-items-center rounded-full border border-line bg-canvas/90 text-sm font-bold text-ink shadow-sm"
            >
              ▶
            </span>
          </button>
          {fullscreen ? (
            <button
              type="button"
              aria-label={`Exit fullscreen ${filename}`}
              className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-control border border-line bg-canvas/90 text-ink shadow-sm transition hover:bg-surface-hover"
              onClick={toggleFullscreen}
            >
              <FullscreenIcon />
            </button>
          ) : null}
        </>
      ) : (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-canvas/90 via-canvas/50 to-transparent px-2 pt-10 pb-2">
          <div className="mx-auto flex min-w-0 max-w-3xl items-center gap-1.5 rounded-control bg-canvas/80 px-1.5 py-1">
            <button
              type="button"
              aria-label={`Pause ${filename}`}
              className="grid size-7 shrink-0 place-items-center rounded-control text-xs font-bold text-ink transition hover:bg-surface-hover"
              onClick={togglePlayback}
            >
              ❚❚
            </button>
            <div
              role="slider"
              tabIndex={0}
              aria-label={`Seek ${filename}`}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(currentTime)}
              aria-valuetext={`${formatClock(currentTime)} of ${formatClock(duration)}`}
              className="h-1.5 min-w-0 flex-1 cursor-pointer rounded-full bg-line"
              onPointerDown={onScrubPointer}
            >
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              />
            </div>
            <button
              type="button"
              aria-label={muted ? `Unmute ${filename}` : `Mute ${filename}`}
              aria-pressed={muted}
              className="grid size-7 shrink-0 place-items-center rounded-control text-ink transition hover:bg-surface-hover"
              onClick={() => setMuted((value) => !value)}
            >
              <MuteIcon muted={muted} />
            </button>
            <button
              type="button"
              aria-label={fullscreen ? `Exit fullscreen ${filename}` : `Fullscreen ${filename}`}
              className="grid size-7 shrink-0 place-items-center rounded-control text-ink transition hover:bg-surface-hover"
              onClick={toggleFullscreen}
            >
              <FullscreenIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Seek slightly so browsers paint a decoded frame instead of a blank poster. */
export function VideoFramePreview({
  className,
  filename,
  src,
}: {
  className?: string
  filename: string
  src: string
}) {
  return (
    <video
      src={src}
      preload="metadata"
      muted
      playsInline
      aria-label={filename}
      className={className}
      onLoadedMetadata={(event) => {
        const video = event.currentTarget
        if (video.currentTime === 0) {
          const length = Number.isFinite(video.duration) ? video.duration : 0
          video.currentTime = length > 0 ? Math.min(0.1, length / 4) : 0.001
        }
      }}
    />
  )
}

function MuteIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 6.5h2.2L8 3.5v9L4.7 9.5H2.5z" />
      {muted ? (
        <path d="M10.5 6.5l3 3m0-3l-3 3" />
      ) : (
        <>
          <path d="M10 6.2a2.4 2.4 0 0 1 0 3.6" />
          <path d="M11.6 4.4a4.4 4.4 0 0 1 0 7.2" />
        </>
      )}
    </svg>
  )
}

function FullscreenIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6V3h3M10 3h3v3M13 10v3h-3M6 13H3v-3" />
    </svg>
  )
}
