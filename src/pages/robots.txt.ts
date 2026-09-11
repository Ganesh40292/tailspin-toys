import type { APIRoute } from 'astro';

const siteUrl = 'https://tailspin-toys.example.com';

export const GET: APIRoute = () =>
  new Response(`User-agent: *
Allow: /
Sitemap: ${siteUrl}/sitemap.xml
`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
