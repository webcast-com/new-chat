import Image from './Image';

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
  return (
    <Image
      src={src}
      alt={alt}
      variant="custom"
      className={className}
      placeholderClassName={placeholderClassName}
      onLoad={onLoad}
    />
  );
}
