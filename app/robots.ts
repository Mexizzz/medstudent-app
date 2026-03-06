import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/study/', '/library/', '/tutor/', '/chat/', '/friends/', '/profile/'],
      },
    ],
    sitemap: 'https://www.medstudy.space/sitemap.xml',
  };
}
