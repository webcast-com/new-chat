import React, { useRef, useState } from 'react';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  className?: string;
}

/**
 * Phase 1 — video player upgrade: shows the captured poster frame with a big
 * play button (no video bytes downloaded until the user presses play), then
 * switches to native controls once playing.
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlayClick = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        controls={playing}
        playsInline
        preload="metadata"
        className={className || 'max-h-[32rem] w-full bg-slate-950'}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          const video = videoRef.current;
          if (video && video.currentTime === 0) setPlaying(false);
        }}
        onEnded={() => setPlaying(false)}
      />
      {!playing && (
        <button
          type="button"
          onClick={handlePlayClick}
          aria-label="Play video"
          className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white shadow-xl backdrop-blur-sm transition hover:scale-105 hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <Play className="h-7 w-7 fill-current pl-0.5" />
        </button>
      )}
    </div>
  );
};

export default VideoPlayer;
