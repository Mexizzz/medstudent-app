import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const appPaths = ['/api/', '/admin/', '/dashboard/', '/study/', '/library/', '/tutor/', '/chat/', '/friends/', '/profile/', '/analytics/', '/goals/', '/insights/', '/usage/', '/support/', '/requests/', '/leaderboard/', '/exam/', '/exam-lab/', '/wrong-answers/', '/study-plan/', '/study-rooms/', '/folders/', '/summaries/', '/lessons/'];

  const aiBots = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-Web', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'CCBot', 'Applebot-Extended', 'cohere-ai', 'Bytespider', 'Amazonbot', 'YouBot', 'Meta-ExternalAgent', 'Diffbot'];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: appPaths },
      ...aiBots.map(bot => ({ userAgent: bot, allow: '/', disallow: appPaths })),
    ],
    sitemap: 'https://www.medstudy.space/sitemap.xml',
    host: 'https://www.medstudy.space',
  };
}
