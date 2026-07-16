export const imageSizes = {
  // Avatar sizes
  avatar: {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  },

  // Cover images - responsive heights
  cover: {
    sm: 'w-full h-[220px] md:h-[350px] lg:h-[500px]',
    md: 'w-full h-[280px] md:h-[400px] lg:h-[600px]',
    lg: 'w-full h-[320px] md:h-[450px] lg:h-[700px]',
  },

  // Community/banner covers
  communityCover: 'w-full h-[280px] md:h-[350px] lg:h-[400px]',

  // Story images
  story: 'w-[120px] h-[220px]',
  storyFull: 'w-full h-screen md:h-[90vh]',

  // Post images
  post: 'w-full aspect-square',
  postThumbnail: 'w-full h-[300px] md:h-[400px]',
  postGallery: 'w-full h-[280px]',

  // Card images
  card: 'w-full h-[200px]',
  cardCompact: 'w-full h-[160px]',

  // Background images
  hero: 'w-full h-[300px] md:h-[500px] lg:h-[700px]',

  // Profile sections
  profileHeader: 'w-full h-[200px] md:h-[250px]',
  profileCover: 'w-full h-[280px]',
};

export const imageClasses = {
  // Common object-fit classes
  cover: 'object-cover',
  contain: 'object-contain',
  fill: 'object-fill',
  scaleFill: 'object-scale-down',

  // Rounding options
  rounded: {
    none: 'rounded-none',
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  },

  // Common combinations
  avatar: 'w-10 h-10 object-cover rounded-full',
  coverImage: 'w-full h-full object-cover',
  thumbnailImage: 'w-full h-full object-cover rounded-xl',
};
