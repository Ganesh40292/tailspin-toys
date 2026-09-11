import type { APIRoute } from 'astro';
import { getDatabase } from '../lib/db';
import { getAllGameIds } from '../lib/games';

const siteUrl = 'https://tailspin-toys.example.com';

export const GET: APIRoute = async () => {
  const ids = await getAllGameIds(getDatabase());
  const urls = ['/', '/about', ...ids.map((id) => `/game/${id}`), '/rss.xml'];
  const body = urls
    .map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`)
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
