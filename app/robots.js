import { SITE } from '@/lib/seo';

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/admin'] },
    ],
    sitemap: `${SITE.url.replace(/\/$/, '')}/sitemap.xml`,
    host: SITE.url,
  };
}
