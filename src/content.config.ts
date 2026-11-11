import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const encuentros = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/encuentros' }),
	schema: z.object({
		title: z.string().optional(),
		summary: z.string().optional(),
		eventbrite: z.object({
			id: z.string(),
			title: z.string(),
			url: z.url(),
			startsAt: z.iso.datetime({ offset: true }),
			endsAt: z.iso.datetime({ offset: true }),
			timezone: z.string(),
			venue: z.string().nullable(),
			phase: z.enum(['upcoming', 'past', 'hidden']),
		}),
	}),
});

export const collections = { encuentros };
