import { getCollection, type CollectionEntry } from 'astro:content';

export type Event = CollectionEntry<'encuentros'>;

export async function getEvents(phase: 'upcoming' | 'past') {
	const events = await getCollection('encuentros', ({ data }) => data.eventbrite.phase === phase);
	const direction = phase === 'upcoming' ? 1 : -1;
	return events.sort((a, b) => direction * (
		Date.parse(a.data.eventbrite.startsAt) - Date.parse(b.data.eventbrite.startsAt)
	));
}

export function eventTitle(event: Event) {
	return event.data.title ?? event.data.eventbrite.title;
}

export function eventDate(event: Event, includeTime = true) {
	const { startsAt, timezone } = event.data.eventbrite;
	return new Intl.DateTimeFormat('es-MX', {
		dateStyle: 'long',
		timeStyle: includeTime ? 'short' : undefined,
		timeZone: timezone,
	}).format(new Date(startsAt));
}
