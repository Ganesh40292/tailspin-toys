import type { APIRoute } from 'astro';
import { getDatabase } from '../lib/db';
import { getAllGames } from '../lib/games';

const siteUrl = 'https://tailspin-toys.example.com';

const escapeXml = (value: string): string =>
  value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character] ?? character);

export const GET: APIRoute = async () => {
  const games = await getAllGames(getDatabase());
  const items = games.map((game) => `<item>
<title>${escapeXml(game.title)}</title>
<link>${siteUrl}/game/${game.id}</link>
<guid>${siteUrl}/game/${game.id}</guid>
<description>${escapeXml(game.description)}</description>
</item>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Tailspin Toys campaigns</title><link>${siteUrl}</link>
<description>Developer-themed tabletop campaigns.</description>
${items}
</channel></rss>`, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
