import { z } from 'zod';

/**
 * Zod schema for a Restaurant document at the scraping/seeding boundary.
 *
 * Keep this in sync with the `Restaurant` TS type in `lib/types.ts`.
 */

export const RestaurantSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, {
      error: 'id must be a lowercase dash-separated slug',
    }),
  name: z.string().min(1),
  address: z.string().min(1),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  neighborhood: z.string().nullable(),
  pizzaName: z.string().min(1),
  pizzaIngredients: z.string().min(1),
  pizzaBackstory: z.string().nullable(),
  servesMeat: z.boolean(),
  servesVegetarian: z.boolean(),
  servesVegan: z.boolean(),
  hasGlutenFreeOption: z.boolean(),
  servesSlice: z.boolean(),
  servesWholePie: z.boolean(),
  imageUrl: z.string().url().nullable(),
  everoutUrl: z.string().url(),
  googlePlaceId: z.string().nullable(),
});

export type RestaurantInput = z.infer<typeof RestaurantSchema>;

export const RestaurantListSchema = z.array(RestaurantSchema);
