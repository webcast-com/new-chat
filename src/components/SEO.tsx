import { useEffect } from 'react';

const APP_NAME = 'Hyperlink Social Connect';
const DEFAULT_DESCRIPTION = 'Connect with friends, share moments, discover people, and build community with Hyperlink Social Connect.';

const VIEW_META: Record<string, { title: string; description?: string }> = {
  feed: { title: `Community Feed | ${APP_NAME}` },
  people: { title: `Discover People | ${APP_NAME}` },
  friends: { title: `Friends | ${APP_NAME}` },
  messages: { title: `Messages | ${APP_NAME}` },
  trending: { title: `Trending Conversations | ${APP_NAME}` },
  dashboard: { title: `Your Dashboard | ${APP_NAME}` },
  profile: { title: `Your Profile | ${APP_NAME}` },
  game: { title: `Snakes & Ladders | ${APP_NAME}` },
  movies: { title: `Movies | ${APP_NAME}` },
  'live-scores': { title: `Live Scores | ${APP_NAME}` },
  tools: { title: `Community Tools | ${APP_NAME}` },
  about: { title: `About the Creator | ${APP_NAME}` },
};

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

interface SEOProps {
  view?: string;
  profileName?: string;
}

export default function SEO({ view = 'feed', profileName }: SEOProps) {
  useEffect(() => {
    const meta = VIEW_META[view] || VIEW_META.feed;
    const title = view === 'profile' && profileName
      ? `${profileName} | ${APP_NAME}`
      : meta.title;
    const description = meta.description || DEFAULT_DESCRIPTION;

    document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', window.location.href);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
  }, [profileName, view]);

  return null;
}
