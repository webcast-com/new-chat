import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { getImageClasses } from '../lib/imageSizes';

type ImageSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
type ImageVariant = 'avatar' | 'cover' | 'post' | 'card' | 'story' | 'banner' | 'custom';
type ObjectFit = 'cover' | 'contain' | 'fill' | 'scale-down';
type Rounded = 'none' | 'sm' | 'md' | 'lg' | 'full';

interface ImageProps {
  src: string;
  alt: string;
  variant?: ImageVariant;
  size?: ImageSize;
  objectFit?: ObjectFit;
  rounded?: Rounded;
  className?: string;
  placeholderClassName?: string;
  onLoad?: () => void;
}

export default function Image({
  src,
  alt,
  variant = 'custom',
  size = 'md',
  objectFit = 'cover',
  rounded = 'md',
  className = '',
  placeholderClassName = '',
  onLoad,
}: ImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
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
    };
  }, []);

  // Load image when visible
  useEffect(() => {
    if (!isVisible || !src) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      setError(false);
      onLoad?.();
    };
    img.onerror = () => {
      setIsLoading(false);
      setError(true);
    };
    img.src = src;
  }, [isVisible, src, onLoad]);

  // Variant-specific sizing
  const variantClasses: Record<ImageVariant, string> = {
    avatar: 'w-10 h-10 rounded-full',
    cover: 'w-full h-[220px] md:h-[350px] lg:h-[500px]',
    post: 'w-full aspect-square',
    card: 'w-full h-[200px]',
    story: 'w-[120px] h-[220px]',
    banner: 'w-full h-[280px] md:h-[400px]',
    custom: className,
  };

  const sizeClasses: Record<ImageSize, string> = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    full: 'w-full h-full',
  };

  const roundedClasses: Record<Rounded, string> = {
    none: 'rounded-none',
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  };

  const objectFitClasses: Record<ObjectFit, string> = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    'scale-down': 'object-scale-down',
  };

  const baseClasses =
    variant === 'custom' ? className : variantClasses[variant];
  const finalClassName = `${baseClasses} ${objectFitClasses[objectFit]} ${roundedClasses[rounded]}`;

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${finalClassName}`}>
      {/* Loading state */}
      {isLoading && !error && (
        <div className={`absolute inset-0 flex items-center justify-center bg-slate-100 ${placeholderClassName}`}>
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className={`absolute inset-0 flex items-center justify-center bg-slate-200 ${placeholderClassName}`}>
          <div className="text-center">
            <p className="text-slate-600 text-sm font-medium">Image failed to load</p>
          </div>
        </div>
      )}

      {/* Loaded image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className="w-full h-full object-cover"
        />
      )}

      {/* Placeholder before visible */}
      {!isVisible && !imageSrc && (
        <div className={`w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 ${placeholderClassName}`} />
      )}
    </div>
  );
}
