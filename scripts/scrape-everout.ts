/**
 * scrape-everout.ts
 *
 * Scrapes the Portland Mercury's Pizza Week 2026 participating restaurants
 * from EverOut, augments each with canonical address + lat/lng + Google
 * Place ID via the Places API (New), and writes the result to
 * data/restaurants.json.
 *
 * Two data sources:
 *   - EverOut (pizza-week-specific): pizza name, ingredients, backstory,
 *     slice/pie, dietary flags, pizza photo, which restaurant is
 *     participating.
 *   - Google Places API (New): canonical address, lat/lng, place id.
 *
 * Run:   npm run scrape
 * Out:   data/restaurants.json       — validated success rows
 *        data/scrape-errors.json     — URLs that failed + why
 */

import { load, type CheerioAPI } from 'cheerio';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  RestaurantListSchema,
  type RestaurantInput,
} from './restaurant-schema';

// ---------- constants ---------------------------------------------------

const EVENT_HUB_URL =
  'https://everout.com/portland/events/the-portland-mercurys-pizza-week-2026/e222744/';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 15_000;
const POLITE_DELAY_MS = 200;

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location';

// ---------- types internal to the scraper ------------------------------

type EventPageData = {
  eventUrl: string;
  pizzaName: string;
  restaurantName: string;
  streetAddress: string | null;
  city: string;
  state: string;
  zip: string | null;
  neighborhood: string | null;
  pizzaIngredients: string;
  pizzaBackstory: string | null;
  servesMeat: boolean;
  servesVegetarian: boolean;
  servesVegan: boolean;
  hasGlutenFreeOption: boolean;
  servesSlice: boolean;
  servesWholePie: boolean;
  imageUrl: string | null;
};

type PlaceLookup = {
  placeId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
};

type ScrapeError = {
  eventUrl: string;
  stage: 'fetch-event' | 'parse-event' | 'places-lookup' | 'validate';
  message: string;
};

// ---------- helpers -----------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

// ---------- EverOut parsing --------------------------------------------

/**
 * Scans the main Pizza Week event hub page and extracts every unique
 * per-pizza event URL that appears under /portland/events/{slug}/e{id}/.
 */
function extractEventUrls(hubHtml: string): string[] {
  const pattern = /\/portland\/events\/[a-z0-9-]+\/e[0-9]+\//g;
  const matches = hubHtml.match(pattern) ?? [];
  // Exclude the hub event itself (e222744).
  const unique = new Set(
    matches
      .filter((path) => !path.includes('/e222744/'))
      .map((path) => new URL(path, 'https://everout.com').toString()),
  );
  return [...unique].sort();
}

/**
 * Parses a per-event page into the EverOut-side restaurant data. Only
 * extracts fields that come from EverOut — address geocoding happens
 * later via the Places API.
 */
function parseEventPage(html: string, eventUrl: string): EventPageData {
  const $ = load(html);

  // Pizza name — the page's main H1 under .item-detail.event
  const pizzaName = normalizeWhitespace(
    $('.item-detail.event > header h1').first().text(),
  );
  if (!pizzaName) {
    throw new Error('Could not find pizza name (h1)');
  }

  // Restaurant name — the location block's anchor
  const locationAnchor = $('.location a[href*="/locations/"]').first();
  const restaurantName = normalizeWhitespace(locationAnchor.text());
  if (!restaurantName) {
    throw new Error('Could not find restaurant name');
  }

  // Neighborhood — muted span next to the location
  const neighborhoodRaw = normalizeWhitespace(
    $('.location .text-muted').first().text(),
  );
  const neighborhood = neighborhoodRaw || null;

  // Full address — in the "Event Location" section near the bottom
  const locationInfo = $('.location-info');
  const { streetAddress, city, state, zip } = parseLocationInfo(locationInfo);

  // Image — first <img> inside .item-image (post-hero, full-res pizza photo)
  const itemImageSrc = $('.item-image img').first().attr('src') ?? null;

  // Answer list — structured Q&A with ingredients, backstory, dietary flags.
  // Keys are normalized (lowercase, alphanumeric+spaces only) so punctuation
  // variations like "What's On It..." and "Whats on it" both resolve.
  const answers = collectAnswers($);

  const ingredientsRaw = answers['whats on it'] ?? null;
  if (!ingredientsRaw) {
    throw new Error(`Could not find "What's On It..." answer`);
  }

  const backstoryRaw = answers['what they say'] ?? null;

  // EverOut lets restaurants check multiple boxes on these fields, so
  // parse the comma-separated value as a tag set rather than doing
  // substring matching (which false-positives "Meat, Vegetarian" as
  // vegetarian when it really means "meat pizza with a veg version").
  const meatVegTags = splitTags(answers['meat or vegetarian'] ?? '');
  const servesMeat = meatVegTags.has('meat');
  const servesVegetarian = meatVegTags.has('vegetarian');
  const servesVegan = meatVegTags.has('vegan');

  // Gluten free: "No" / "Yes" / "Available (with surcharge)"
  const glutenFreeRaw = (answers['gluten free'] ?? '').toLowerCase().trim();
  const hasGlutenFreeOption =
    glutenFreeRaw === 'yes' ||
    glutenFreeRaw.startsWith('yes,') ||
    glutenFreeRaw.startsWith('available');

  const sliceTags = splitTags(answers['by the slice or whole pie'] ?? '');
  const servesSlice = sliceTags.has('by the slice');
  const servesWholePie = sliceTags.has('whole pie');

  return {
    eventUrl,
    pizzaName,
    restaurantName,
    streetAddress,
    city,
    state,
    zip,
    neighborhood,
    pizzaIngredients: ingredientsRaw,
    pizzaBackstory: backstoryRaw,
    servesMeat,
    servesVegetarian,
    servesVegan,
    hasGlutenFreeOption,
    servesSlice,
    servesWholePie,
    imageUrl: itemImageSrc,
  };
}

/**
 * Splits EverOut's comma-separated multi-select values (e.g.
 * "Meat, Vegetarian" or "By the Slice, Whole Pie") into a normalized
 * Set of lowercase tag strings.
 */
function splitTags(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  );
}

/**
 * Reads the "Event Location" block which contains the formatted street
 * address across two text nodes. Structure:
 *
 *   <div class="location-info">
 *     <h4><a>Restaurant Name</a></h4>
 *     8225 N. Denver Ave
 *     Portland, OR 97217
 *   </div>
 */
function parseLocationInfo($loc: ReturnType<CheerioAPI>): {
  streetAddress: string | null;
  city: string;
  state: string;
  zip: string | null;
} {
  if ($loc.length === 0) {
    return { streetAddress: null, city: 'Portland', state: 'OR', zip: null };
  }

  // Strip the anchor/h4 and map, leaving only the text address lines.
  const clone = $loc.clone();
  clone.find('h4, .map, .mt-0 > h4').remove();

  const raw = normalizeWhitespace(clone.text());
  // Expect something like "8225 N. Denver Ave Portland, OR 97217"
  const cityStateZip = raw.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\s*(\d{5})?/);

  if (!cityStateZip) {
    return { streetAddress: raw || null, city: 'Portland', state: 'OR', zip: null };
  }

  const before = raw.slice(0, cityStateZip.index).trim();
  const streetAddress = before.length > 0 ? before : null;

  return {
    streetAddress,
    city: cityStateZip[1].trim(),
    state: cityStateZip[2],
    zip: cityStateZip[3] ?? null,
  };
}

/**
 * Collects the Q&A pairs from the page's answer list into a map keyed
 * by the normalized question text (lowercase, alphanumeric + single
 * spaces only). This way "What's On It..." and "Whats on it" both
 * normalize to "whats on it". Answer values are kept in their original
 * casing so display fields (ingredients, backstory) look right; callers
 * that do matching on the values lowercase them at the use site.
 */
function collectAnswers($: CheerioAPI): Record<string, string> {
  const map: Record<string, string> = {};
  $('.answer-list .answer').each((_, el) => {
    const qRaw = normalizeWhitespace($(el).find('.question-text').text());
    const aRaw = normalizeWhitespace($(el).find('.answer-text').text());
    if (!qRaw || !aRaw) return;
    // Normalize keys: delete apostrophes entirely so "What's On It..."
    // becomes "whats on it" (not "what s on it"), then replace other
    // non-alphanumerics with spaces and collapse.
    const key = qRaw
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    map[key] = aRaw;
  });
  return map;
}

// ---------- Google Places lookup ---------------------------------------

/**
 * Calls Places API Text Search (New) with a minimal field mask so we
 * only pay for the Basic tier. Returns the top match or null.
 *
 * Retries once on transient failures (network errors, 403, 429, 5xx).
 * Persistent 403s usually mean the project hasn't enabled the API or the
 * key's API restrictions don't allow Places (New) — in that case the
 * main loop's consecutive-403 counter will trip and abort.
 */
async function lookupPlace(
  query: string,
  apiKey: string,
): Promise<PlaceLookup | null> {
  const attempt = async (): Promise<PlaceLookup | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(PLACES_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACES_FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: query,
          regionCode: 'US',
          languageCode: 'en',
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Places HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      const json = (await res.json()) as {
        places?: Array<{
          id: string;
          displayName?: { text: string };
          formattedAddress?: string;
          location?: { latitude: number; longitude: number };
        }>;
      };

      const first = json.places?.[0];
      if (!first || !first.location || !first.formattedAddress) {
        return null;
      }

      return {
        placeId: first.id,
        formattedAddress: first.formattedAddress,
        lat: first.location.latitude,
        lng: first.location.longitude,
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    return await attempt();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const transient =
      message.includes('403') ||
      message.includes('429') ||
      /HTTP 5\d\d/.test(message) ||
      message.includes('fetch failed') ||
      message.includes('aborted');
    if (!transient) throw err;
    await sleep(1000);
    return attempt();
  }
}

// ---------- slug collision handling ------------------------------------

/**
 * Produces a unique slug for a restaurant. Base slug is the restaurant
 * name. If that's already taken, append the street number (handles
 * multi-location chains). If still taken, append -2, -3, ...
 */
function uniqueSlug(
  restaurantName: string,
  streetAddress: string | null,
  taken: Set<string>,
): string {
  const base = slugify(restaurantName);
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }

  const streetNumber = streetAddress?.match(/^(\d+)/)?.[1];
  if (streetNumber) {
    const withNumber = `${base}-${streetNumber}`;
    if (!taken.has(withNumber)) {
      taken.add(withNumber);
      return withNumber;
    }
  }

  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  const candidate = `${base}-${n}`;
  taken.add(candidate);
  return candidate;
}

// ---------- main --------------------------------------------------------

async function main(): Promise<void> {
  const apiKey = process.env.GOOGLE_PLACES_SERVER_KEY;
  if (!apiKey) {
    throw new Error(
      'GOOGLE_PLACES_SERVER_KEY is not set. Run with `npm run scrape` ' +
        '(which loads .env.local via --env-file).',
    );
  }

  console.log('[1/4] Fetching Pizza Week event hub…');
  const hubHtml = await fetchText(EVENT_HUB_URL);
  const eventUrls = extractEventUrls(hubHtml);
  console.log(`      found ${eventUrls.length} event URLs`);

  if (eventUrls.length === 0) {
    throw new Error(
      'No event URLs found on the hub page. EverOut may have changed its markup.',
    );
  }

  console.log('[2/4] Fetching and parsing each event page…');
  const eventData: EventPageData[] = [];
  const errors: ScrapeError[] = [];

  for (let i = 0; i < eventUrls.length; i++) {
    const eventUrl = eventUrls[i];
    const label = `(${i + 1}/${eventUrls.length})`;
    try {
      const html = await fetchText(eventUrl);
      const parsed = parseEventPage(html, eventUrl);
      eventData.push(parsed);
      console.log(`      ${label} ${parsed.restaurantName} — ${parsed.pizzaName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`      ${label} FAILED ${eventUrl}: ${message}`);
      errors.push({
        eventUrl,
        stage: 'parse-event',
        message,
      });
    }
    await sleep(POLITE_DELAY_MS);
  }

  console.log(`      parsed ${eventData.length}/${eventUrls.length} events`);

  console.log('[3/4] Looking up each restaurant via Google Places (New)…');
  const restaurants: RestaurantInput[] = [];
  const takenSlugs = new Set<string>();
  let consecutive403s = 0;

  for (let i = 0; i < eventData.length; i++) {
    const row = eventData[i];
    const label = `(${i + 1}/${eventData.length})`;
    const addressHint = [row.streetAddress, row.city, row.state, row.zip]
      .filter(Boolean)
      .join(', ');
    const query = addressHint
      ? `${row.restaurantName}, ${addressHint}`
      : `${row.restaurantName}, Portland OR`;

    try {
      const place = await lookupPlace(query, apiKey);
      consecutive403s = 0;
      if (!place) {
        throw new Error('No Places result');
      }

      const id = uniqueSlug(row.restaurantName, row.streetAddress, takenSlugs);

      const restaurant: RestaurantInput = {
        id,
        name: row.restaurantName,
        address: place.formattedAddress,
        lat: place.lat,
        lng: place.lng,
        neighborhood: row.neighborhood,
        pizzaName: row.pizzaName,
        pizzaIngredients: row.pizzaIngredients,
        pizzaBackstory: row.pizzaBackstory,
        servesMeat: row.servesMeat,
        servesVegetarian: row.servesVegetarian,
        servesVegan: row.servesVegan,
        hasGlutenFreeOption: row.hasGlutenFreeOption,
        servesSlice: row.servesSlice,
        servesWholePie: row.servesWholePie,
        imageUrl: row.imageUrl,
        everoutUrl: row.eventUrl,
        googlePlaceId: place.placeId,
      };

      restaurants.push(restaurant);
      console.log(
        `      ${label} ${restaurant.name} → ${restaurant.lat.toFixed(4)}, ${restaurant.lng.toFixed(4)}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`      ${label} FAILED ${row.restaurantName}: ${message}`);
      errors.push({
        eventUrl: row.eventUrl,
        stage: 'places-lookup',
        message: `${row.restaurantName}: ${message}`,
      });

      // Fail-fast: if Places API is completely blocked (disabled / wrong
      // key restrictions), don't burn 70 × network round-trips before
      // telling the user.
      if (message.includes('403') || message.includes('PERMISSION_DENIED')) {
        consecutive403s++;
        if (consecutive403s >= 3) {
          console.error(
            '\n      ABORT: 3 consecutive 403s from Places API. ' +
              'Enable "Places API (New)" in the GCP console and make sure ' +
              'your GOOGLE_PLACES_SERVER_KEY allows it.',
          );
          break;
        }
      }
    }
    await sleep(POLITE_DELAY_MS);
  }

  console.log('[4/4] Validating + writing data/restaurants.json…');
  const validated = RestaurantListSchema.safeParse(restaurants);
  if (!validated.success) {
    console.error('      Zod validation failed:');
    console.error(validated.error.format());
    errors.push({
      eventUrl: EVENT_HUB_URL,
      stage: 'validate',
      message: JSON.stringify(validated.error.format(), null, 2),
    });
  }

  const outDir = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'data',
  );
  await mkdir(outDir, { recursive: true });

  await writeFile(
    resolve(outDir, 'restaurants.json'),
    JSON.stringify(restaurants, null, 2) + '\n',
  );
  await writeFile(
    resolve(outDir, 'scrape-errors.json'),
    JSON.stringify(errors, null, 2) + '\n',
  );

  console.log();
  console.log('────────────────────────────────────────');
  console.log(`   scraped:  ${restaurants.length} restaurants`);
  console.log(`   errors:   ${errors.length}`);
  console.log(`   output:   data/restaurants.json`);
  if (errors.length > 0) {
    console.log(`   errors:   data/scrape-errors.json`);
  }
  console.log('────────────────────────────────────────');

  if (restaurants.length === 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
