import { getCollection, type CollectionEntry } from 'astro:content';

export type Event = CollectionEntry<'encuentros'>;

export async function getEvents(phase: 'upcoming' | 'past') {
	const events = await getCollection('encuentros', ({ data }) => {
		return data.historical ? phase === 'past' : data.eventbrite?.phase === phase;
	});
	const direction = phase === 'upcoming' ? 1 : -1;
	return events.sort((a, b) => direction * (Date.parse(eventStart(a)) - Date.parse(eventStart(b))));
}

export function eventTitle(event: Event) {
	return event.data.title ?? event.data.eventbrite?.title ?? event.id;
}

export function eventStart(event: Event) {
	return event.data.historical?.date ?? event.data.eventbrite?.startsAt ?? '';
}

export function eventVenue(event: Event) {
	const { historical, eventbrite } = event.data;
	return historical?.venue ?? (eventbrite?.phase === 'hidden' ? undefined : eventbrite?.venue);
}

export function eventDate(event: Event, includeTime = true) {
	const { historical, eventbrite } = event.data;
	if (historical) {
		const monthOnly = historical.date.length === 7;
		const date = new Date(monthOnly ? historical.date + '-01' : historical.date);
		return new Intl.DateTimeFormat('es-MX', {
			year: 'numeric',
			month: 'long',
			day: monthOnly ? undefined : 'numeric',
			timeZone: 'UTC',
		}).format(date);
	}

	return new Intl.DateTimeFormat('es-MX', {
		dateStyle: 'long',
		timeStyle: includeTime ? 'short' : undefined,
		timeZone: eventbrite?.timezone,
	}).format(new Date(eventStart(event)));
}
