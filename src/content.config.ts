import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const photo = z.object({
	src: z.string().refine((src) => src.startsWith('/encuentros/fotos/') || src.startsWith('https://www.eventbrite.com.mx/_next/image?')),
	alt: z.string().min(1),
});

const encuentros = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/encuentros' }),
	schema: z.object({
		title: z.string().optional(),
		summary: z.string().optional(),
		hero: photo.optional(),
		gallery: z.array(photo).optional(),
		source: z.object({ label: z.string(), url: z.url() }).optional(),
		historical: z.object({
			date: z.union([z.iso.date(), z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)]),
			venue: z.string().optional(),
			matchEventbrite: z.boolean().optional(),
		}).optional(),
		eventbrite: z.object({
			id: z.string(),
			title: z.string(),
			url: z.url(),
			startsAt: z.iso.datetime({ offset: true }),
			endsAt: z.iso.datetime({ offset: true }),
			timezone: z.string(),
			venue: z.string().nullable(),
			phase: z.enum(['upcoming', 'past', 'hidden']),
		}).optional(),
	}).refine(({ title, historical, eventbrite }) => Boolean(eventbrite || (historical && title)), {
		message: 'Añade datos de Eventbrite o un título y una fecha de archivo.',
	}),
});

export const collections = { encuentros };
