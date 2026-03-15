import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/study/', '/library/', '/tutor/', '/chat/', '/friends/', '/profile/', '/analytics/', '/goals/', '/insights/', '/usage/', '/support/', '/requests/', '/leaderboard/', '/exam/', '/exam-lab/', '/wrong-answers/', '/study-plan/', '/study-rooms/', '/folders/', '/summaries/', '/lessons/'],
      },
    ],
    sitemap: 'https://www.medstudy.space/sitemap.xml',
  };
}
