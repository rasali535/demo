export const SITE = {
  name: 'mAgri',
  tagline: 'Empowering Farmers with Knowledge That Grows With You',
  description:
    'All-in-one platform for Botswana smallholder farmers: localised courses, farmer insights, blogs and AI-powered crop and livestock diagnostics.',
  url: process.env.NEXT_PUBLIC_BASE_URL || 'https://magri.africa',
  org: {
    name: 'Brastorne Inc.',
    sameAs: ['https://magri.africa'],
  },
};

export function absoluteUrl(path = '/') {
  const base = SITE.url.replace(/\/$/, '');
  if (!path.startsWith('/')) path = '/' + path;
  return base + path;
}
