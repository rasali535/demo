import { notFound } from 'next/navigation';
import { getDb } from '@/lib/mongo';
import { SITE, absoluteUrl } from '@/lib/seo';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getPost(slug) {
  const db = await getDb();
  return db.collection('blogs').findOne({ slug });
}

export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  if (!post) return { title: 'Not found' };
  const canonical = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: absoluteUrl(canonical),
      type: 'article',
      images: post.thumbnail ? [post.thumbnail] : [],
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.thumbnail ? [post.thumbnail] : [],
    },
  };
}

export default async function BlogPostPage({ params }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.thumbnail,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: SITE.org.name,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/favicon.ico') },
    },
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    keywords: (post.tags || []).join(', '),
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b bg-gradient-to-b from-emerald-50 to-white">
        <div className="container py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🌱</span>
            <span className="font-bold text-emerald-800 text-xl">mAgri</span>
          </Link>
          <Link href="/?view=blog" className="text-sm text-emerald-700 hover:underline">← All blogs</Link>
        </div>
      </header>

      <article className="container max-w-3xl py-10">
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-3">
            {(post.tags || []).map(t => (
              <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800">{t}</span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{post.title}</h1>
          <p className="text-muted-foreground">{post.excerpt}</p>
          <p className="text-xs text-muted-foreground mt-2">By {post.author} · {new Date(post.published_at).toLocaleDateString()}</p>
        </div>
        {post.thumbnail && (
          <img src={post.thumbnail} alt={post.title} className="w-full rounded-lg mb-8 aspect-[16/9] object-cover" />
        )}
        <div className="prose prose-emerald max-w-none prose-headings:scroll-mt-20 prose-a:text-emerald-700 prose-a:underline prose-table:block prose-table:overflow-x-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body_md}</ReactMarkdown>
        </div>
      </article>

      <footer className="border-t mt-16 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE.org.name} — mAgri
      </footer>
    </div>
  );
}
