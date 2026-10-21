import { catalog, type Entry, type Shelf } from "./catalog";

export type { Entry, Shelf };

/** Every figure in gallery order, across shelves. */
export const entries: Entry[] = catalog.flatMap(shelf => shelf.entries);

/** The URL slug of a figure: its key in lower case, e.g. `signin`, `notfound`. */
export const slugOf = (entry: Entry): string => entry.key.toLowerCase();

export const findEntry = (slug: string): Entry | undefined =>
  entries.find(entry => slugOf(entry) === slug.toLowerCase());

export const shelfOf = (entry: Entry): Shelf => {
  const shelf = catalog.find(s => s.entries.includes(entry));
  if (!shelf) throw new Error(`No shelf for ${entry.key}`);
  return shelf;
};

export const neighbours = (entry: Entry): { prev?: Entry; next?: Entry } => {
  const shelf = shelfOf(entry);
  const i = shelf.entries.indexOf(entry);
  return { prev: shelf.entries[i - 1], next: shelf.entries[i + 1] };
};
