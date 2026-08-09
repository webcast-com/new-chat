'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import NextImage from 'next/image';
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
  sizes?: string;
  priority?: boolean;
}

const VARIANT_CLASSES: Record<ImageVariant, string> = {
  avatar: 'w-10 h-10 rounded-full overflow-hidden',
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

const VARIANT_SIZES: Record<ImageVariant, string> = {
  avatar: '48px',
  cover: '100vw',
  post: '(min-width: 1024px) 672px, (min-width: 640px) 640px, calc(100vw - 24px)',
  card: '(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw',
  story: '120px',
  banner: '100vw',
  custom: '100vw',
};

const VARIANT_DIMENSIONS: Record<ImageVariant, { width: number; height: number }> = {
  avatar: { width: 48, height: 48 },
  cover: { width: 1200, height: 500 },
  post: { width: 672, height: 672 },
  card: { width: 320, height: 200 },
  story: { width: 120, height: 220 },
  banner: { width: 1200, height: 400 },
  custom: { width: 800, height: 600 },
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
  sizes,
  priority = false,
}: ImageProps) {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading (skip if priority)
  useEffect(() => {
    if (priority) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: '100px' }
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
  }, [priority]);

  useEffect(() => {
    setLoadState('loading');
  }, [src]);

  const finalClassName = useMemo(() => {
    const baseClasses = variant === 'custom' ? className : VARIANT_CLASSES[variant];
    const fitClass = OBJECT_FIT_CLASSES[objectFit];
    const roundClass = variant === 'custom' ? ROUNDED_CLASSES[rounded] : '';

    return `${baseClasses} ${fitClass} ${roundClass}`.trim();
  }, [variant, className, objectFit, rounded]);

  const isLoading = loadState === 'loading';
  const isError = loadState === 'error';
  const dimensions = VARIANT_DIMENSIONS[variant];
  const isExternal = src.startsWith('http') && !src.includes('localhost');

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

      {isVisible && !isError && (
        <>
          {/* Use next/image for optimization when possible, fallback to <img> for external unoptimized */}
          {variant === 'avatar' || variant === 'post' || isExternal ? (
            // For avatars/posts and external URLs, use optimized next/image with unoptimized fallback
            <NextImage
              src={src}
              alt={alt}
              width={dimensions.width}
              height={dimensions.height}
              sizes={sizes || VARIANT_SIZES[variant]}
              priority={priority}
              unoptimized={isExternal}
              onLoad={() => {
                setLoadState('loaded');
                onLoad?.();
              }}
              onError={() => setLoadState('error')}
              className="h-full w-full object-cover transition-opacity duration-300"
              style={{ objectFit }}
            />
          ) : (
            <img
              src={src}
              alt={alt}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              sizes={sizes || VARIANT_SIZES[variant]}
              onLoad={() => {
                setLoadState('loaded');
                onLoad?.();
              }}
              onError={() => setLoadState('error')}
              className="h-full w-full object-cover transition-opacity duration-300"
            />
          )}
        </>
      )}

      {!isVisible && (
        <div className={`h-full w-full bg-gradient-to-br from-slate-100 to-slate-200 ${placeholderClassName}`} />
      )}
    </div>
  );
}
