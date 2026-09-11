import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

export interface GameFilters {
  /** Category IDs to include; games matching any selected category are returned. */
  categoryIds?: readonly number[];
  /** Publisher ID to include. */
  publisherId?: number;
}

const gameSelection = {
  id: games.id,
  title: games.title,
  description: games.description,
  starRating: games.starRating,
  categoryId: categories.id,
  categoryName: categories.name,
  publisherId: publishers.id,
  publisherName: publishers.name,
};

type GameSelectionRow = {
  id: number;
  title: string;
  description: string;
  starRating: number | null;
  categoryId: number | null;
  categoryName: string | null;
  publisherId: number | null;
  publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    starRating: row.starRating,
    category:
      row.categoryId !== null && row.categoryName !== null
        ? { id: row.categoryId, name: row.categoryName }
        : null,
    publisher:
      row.publisherId !== null && row.publisherName !== null
        ? { id: row.publisherId, name: row.publisherName }
        : null,
  };
}

function baseGamesQuery(db: Database) {
  return db
    .select(gameSelection)
    .from(games)
    .leftJoin(categories, eq(games.categoryId, categories.id))
    .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/**
 * Returns games matching optional category and publisher filters in title order.
 *
 * @param db Injectable database connection used to query games and relations.
 * @param filters Optional category and publisher constraints.
 * @returns Matching games ordered alphabetically by title.
 */
export async function getAllGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
  const conditions = [];

  if (filters.categoryIds && filters.categoryIds.length > 0) {
    conditions.push(inArray(games.categoryId, filters.categoryIds));
  }

  if (filters.publisherId !== undefined) {
    conditions.push(eq(games.publisherId, filters.publisherId));
  }

  const query = baseGamesQuery(db);
  const rows =
    conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(asc(games.title))
      : await query.orderBy(asc(games.title));

  return rows.map(mapGame);
}

/**
 * Returns all game IDs ordered alphabetically by title.
 *
 * @param db Injectable database connection used to query games.
 * @returns Game IDs in stable title order.
 */
export async function getAllGameIds(db: Database): Promise<number[]> {
  const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
  return rows.map((row) => row.id);
}

/**
 * Finds one game by ID.
 *
 * @param db Injectable database connection used to query the game and relations.
 * @param id Game ID to look up.
 * @returns The matching game, or null when no game exists with that ID.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
  const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
  return row ? mapGame(row) : null;
}
