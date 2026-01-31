import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
}

/**
 * Custom hook to update document meta tags for SEO/Open Graph
 * Note: For full SSR support, you'd need a backend to serve these tags to crawlers
 */
export const useSEO = ({
  title,
  description,
  image,
  url,
  type = 'website'
}: SEOProps) => {
  useEffect(() => {
    // Update title
    if (title) {
      document.title = `${title} | DelhiPulse`;
    }

    // Helper to update or create meta tag
    const updateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    const updateMetaName = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update Open Graph tags
    if (title) {
      updateMeta('og:title', title);
      updateMetaName('twitter:title', title);
    }
    if (description) {
      updateMeta('og:description', description);
      updateMetaName('description', description);
      updateMetaName('twitter:description', description);
    }
    if (image) {
      updateMeta('og:image', image);
      updateMetaName('twitter:image', image);
    }
    if (url) {
      updateMeta('og:url', url);
    }
    updateMeta('og:type', type);
    updateMetaName('twitter:card', 'summary_large_image');

    // Cleanup on unmount - restore defaults
    return () => {
      document.title = 'DelhiPulse — Fest Feed';
    };
  }, [title, description, image, url, type]);
};

/**
 * Generate a dynamic OG image URL using a service like og-image.vercel.app
 * or your own OG image generator
 */
export const generateOGImage = (title: string, organizer: string): string => {
  // Using a simple text-based OG image service
  // You can replace this with your own OG image generator
  const params = new URLSearchParams({
    title: title.substring(0, 60),
    subtitle: organizer,
    theme: 'dark',
    md: '1',
    fontSize: '100px'
  });
  
  // Fallback to a static image or use og-image service
  // For now, return a placeholder that can be replaced with a real service
  return `https://og-image.vercel.app/${encodeURIComponent(title)}.png?theme=dark&md=1&fontSize=75px&images=https%3A%2F%2Fassets.vercel.com%2Fimage%2Fupload%2Ffront%2Fassets%2Fdesign%2Fvercel-triangle-white.svg`;
};
