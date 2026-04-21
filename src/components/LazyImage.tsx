import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  onLoad?: () => void;
}

export default function LazyImage({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  onLoad,
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !src) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      onLoad?.();
    };
    img.onerror = () => {
      setIsLoading(false);
    };
    img.src = src;
  }, [isVisible, src, onLoad]);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-slate-100 ${placeholderClassName}`}>
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )}
      {imageSrc && (
        <img src={imageSrc} alt={alt} className="w-full h-full object-cover" />
      )}
      {!isVisible && !imageSrc && (
        <div className={`w-full h-full bg-slate-100 ${placeholderClassName}`} />
      )}
    </div>
  );
}
