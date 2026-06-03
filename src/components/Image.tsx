import { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';

type ImageVariant = 'avatar' | 'cover' | 'post' | 'card' | 'story' | 'banner' | 'custom';
type ObjectFit = 'cover' | 'contain' | 'fill' | 'scale-down';
type Rounded = 'none' | 'sm' | 'md' | 'lg' | 'full';

interface ImageProps {
  src: string;
  alt: string;
  variant?: ImageVariant;
  objectFit?: ObjectFit;
  rounded?: Rounded;
  className?: string;
  placeholderClassName?: string;
  onLoad?: () => void;
}

const VARIANT_CLASSES: Record<ImageVariant, string> = {
  avatar: 'w-10 h-10 object-cover rounded-full',
  cover: 'w-full h-[220px] md:h-[350px] lg:h-[500px]',
  post: 'w-full aspect-square',
  card: 'w-full h-[200px]',
  story: 'w-[120px] h-[220px]',
  banner: 'w-full h-[280px] md:h-[400px]',
  custom: '',
};

const ROUNDED_CLASSES: Record<Rounded, string> = {
  none: 'rounded-none',
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  full: 'rounded-full',
};

const OBJECT_FIT_CLASSES: Record<ObjectFit, string> = {
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  'scale-down': 'object-scale-down',
};

export default function Image({
  src,
  alt,
  variant = 'custom',
  objectFit = 'cover',
  rounded = 'md',
  className = '',
  placeholderClassName = '',
  onLoad,
}: ImageProps) {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isVisible, setIsVisible] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
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
      observer.disconnect();
    };
  }, []);

  // Load image when visible
  useEffect(() => {
    if (!isVisible || !src) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setLoadState('loaded');
      onLoad?.();
    };
    img.onerror = () => {
      setLoadState('error');
    };
    img.src = src;
  }, [isVisible, src, onLoad]);

  // Build className once, memoized
  const finalClassName = useMemo(() => {
    const baseClasses = variant === 'custom' ? className : VARIANT_CLASSES[variant];
    const fitClass = OBJECT_FIT_CLASSES[objectFit];
    const roundClass = variant === 'custom' ? ROUNDED_CLASSES[rounded] : '';

    return `${baseClasses} ${fitClass} ${roundClass}`.trim();
  }, [variant, className, objectFit, rounded]);

  const isLoading = loadState === 'loading';
  const isError = loadState === 'error';

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${finalClassName}`}>
      {isLoading && (
        <div className={`absolute inset-0 flex items-center justify-center bg-slate-100 ${placeholderClassName}`}>
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )}

      {isError && (
        <div className={`absolute inset-0 flex items-center justify-center bg-slate-200 ${placeholderClassName}`}>
          <p className="text-slate-600 text-sm font-medium">Image failed to load</p>
        </div>
      )}

      {imageSrc && <img src={imageSrc} alt={alt} className="w-full h-full object-cover" />}

      {!isVisible && !imageSrc && (
        <div className={`w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 ${placeholderClassName}`} />
      )}
    </div>
  );
}