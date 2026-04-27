import { getDb } from '@/lib/mongo';
import { SITE } from '@/lib/seo';

export default async function sitemap() {
  const base = SITE.url.replace(/\/$/, '');
  const staticRoutes = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/?view=courses`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/?view=blog`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/?view=diagnose`, changeFrequency: 'monthly', priority: 0.7 },
  ];
  let blogRoutes = [];
  try {
    const db = await getDb();
    const posts = await db.collection('blogs').find({}).project({ slug: 1, updated_at: 1 }).toArray();
    blogRoutes = posts.map(p => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updated_at || new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
  } catch (e) {
    blogRoutes = [];
  }
  return [...staticRoutes, ...blogRoutes];
}
