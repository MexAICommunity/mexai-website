import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dump, JSON_SCHEMA, load } from 'js-yaml';

const organizerId = '106303535081';
const api = 'https://www.eventbriteapi.com/v3';
const directory = new URL('../src/content/encuentros/', import.meta.url);
const publicStatuses = new Set(['live', 'started', 'ended', 'completed']);
const eventStatuses = ['draft', ...publicStatuses, 'canceled'];
const startMarker = '# Inicio de los datos de Eventbrite';
const endMarker = '# Fin de los datos de Eventbrite';
const frontmatterPattern = /^---\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m;

async function fetchEvents(organizationId, token) {
	const url = new URL(api + '/organizations/' + organizationId + '/events/');
	url.search = new URLSearchParams({
		organizer_filter: organizerId,
		time_filter: 'all',
		status: eventStatuses.join(','),
		expand: 'venue',
	}).toString();

	const events = new Map();
	const continuations = new Set();
	while (true) {
		const response = await fetch(url, {
			headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
			signal: AbortSignal.timeout(30_000),
		});
		if (!response.ok) throw new Error('Eventbrite API request failed (HTTP ' + response.status + ')');

		const { events: page, pagination } = await response.json();
		if (!Array.isArray(page) || typeof pagination?.has_more_items !== 'boolean') {
			throw new Error('Unexpected Eventbrite pagination response.');
		}

		for (const event of page) {
			if (event.organizer_id == null) {
				throw new Error('Eventbrite did not return the organizer ID.');
			}
			if (String(event.organizer_id) !== organizerId) continue;
			if (!/^\d+$/.test(event.id) || typeof event.listed !== 'boolean') {
				throw new Error('Eventbrite did not return the event ID or visibility.');
			}
			events.set(String(event.id), event);
		}
		if (!pagination.has_more_items) return events;
		if (!pagination.continuation || continuations.has(pagination.continuation)) {
			throw new Error('Eventbrite did not return a new continuation token.');
		}
		continuations.add(pagination.continuation);
		url.searchParams.set('continuation', pagination.continuation);
	}
}

function publicEventData(event, now) {
	if (!event?.listed || event.invite_only || event.password || !publicStatuses.has(event.status)) {
		return undefined;
	}
	if (event.hide_start_date) return undefined;

	const title = event.name?.text?.trim();
	const start = Date.parse(event.start?.utc);
	const end = Date.parse(event.end?.utc);
	const timezone = event.start?.timezone;
	const url = URL.parse(event.url);
	if (!title || !Number.isFinite(start) || !Number.isFinite(end) || end < start || !timezone
		|| url?.protocol !== 'https:' || !/^www\.eventbrite\.(?:com|com\.mx)$/.test(url.hostname)) {
		throw new Error('Invalid public metadata for Eventbrite event ' + event.id);
	}
	// Validate the timezone before publishing a file that Astro cannot render.
	new Intl.DateTimeFormat('es-MX', { timeZone: timezone });

	return {
		id: String(event.id),
		title,
		url: url.href,
		startsAt: new Date(start).toISOString().replace('.000Z', 'Z'),
		endsAt: new Date(end).toISOString().replace('.000Z', 'Z'),
		timezone,
		venue: event.online_event ? 'En línea' : event.venue?.name?.trim() || null,
		phase: end <= now || ['ended', 'completed'].includes(event.status) ? 'past' : 'upcoming',
	};
}

function localDate(event) {
	const parts = new Intl.DateTimeFormat('en', {
		timeZone: event.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
	}).formatToParts(new Date(event.startsAt));
	const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
	return fields.year + '-' + fields.month + '-' + fields.day;
}

function managedBlock(eventbrite, newline) {
	const yaml = dump({ eventbrite }, { lineWidth: -1, forceQuotes: true, quotingType: "'" }).trimEnd();
	return [startMarker, yaml, endMarker].join('\n').replaceAll('\n', newline);
}

async function sync() {
	const { EVENTBRITE_TOKEN: token, EVENTBRITE_ORGANIZATION_ID: organizationId } = process.env;
	if (!token || !/^\d+$/.test(organizationId ?? '')) {
		throw new Error('Set EVENTBRITE_TOKEN and EVENTBRITE_ORGANIZATION_ID.');
	}

	const events = await fetchEvents(organizationId, token);
	const now = Date.now();
	const pending = new Map(
		[...events].map(([id, event]) => [id, publicEventData(event, now)]).filter(([, data]) => data),
	);
	const writes = new Map();

	await mkdir(directory, { recursive: true });
	const files = (await readdir(directory)).filter((name) => name.endsWith('.md'));
	const seenIds = new Set();
	const historicalMatches = new Map();
	for (const name of files) {
		const file = new URL(encodeURIComponent(name), directory);
		const source = await readFile(file, 'utf8');
		const frontmatter = source.match(frontmatterPattern);
		if (frontmatter?.index !== 0) throw new Error('Expected frontmatter in ' + name);

		const { eventbrite: existing, historical } = load(frontmatter[1], { schema: JSON_SCHEMA }) ?? {};
		if (!existing && historical) {
			if (historical.matchEventbrite && /^\d{4}-\d{2}-\d{2}$/.test(historical.date)) {
				const matches = historicalMatches.get(historical.date) ?? [];
				matches.push({ file, source, closing: frontmatter[0].lastIndexOf('---') });
				historicalMatches.set(historical.date, matches);
			}
			continue;
		}
		if (!existing?.id || seenIds.has(existing.id)) {
			throw new Error('Missing or duplicate Eventbrite ID in ' + name);
		}
		seenIds.add(existing.id);

		const newline = frontmatter[0].includes('\r\n') ? '\r\n' : '\n';
		const start = frontmatter[0].indexOf(newline + startMarker + newline) + newline.length;
		const end = frontmatter[0].indexOf(newline + endMarker + newline, start) + newline.length;
		if (start < newline.length || end < newline.length) {
			throw new Error('Missing Eventbrite block markers in ' + name);
		}

		const data = pending.get(existing.id) ?? { ...existing, phase: 'hidden' };
		pending.delete(existing.id);
		const updated = source.slice(0, start) + managedBlock(data, newline) + source.slice(end + endMarker.length);
		if (updated !== source) writes.set(file, updated);
	}

	const pastByDate = new Map();
	for (const data of pending.values()) {
		if (data.phase !== 'past') continue;
		const date = localDate(data);
		const matches = pastByDate.get(date) ?? [];
		matches.push(data);
		pastByDate.set(date, matches);
	}

	for (const [date, posts] of historicalMatches) {
		const matches = pastByDate.get(date);
		if (posts.length !== 1 || matches?.length !== 1) continue;
		const [{ file, source, closing }] = posts;
		const [data] = matches;
		const newline = source.slice(0, closing).includes('\r\n') ? '\r\n' : '\n';
		const block = managedBlock(data, newline);
		writes.set(file, source.slice(0, closing) + block + newline + source.slice(closing));
		pending.delete(data.id);
	}

	for (const [id, data] of pending) {
		const name = id + '.md';
		if (files.includes(name)) throw new Error('Filename already in use: ' + name);
		writes.set(new URL(name, directory), '---\n' + managedBlock(data, '\n') + '\n---\n');
	}

	for (const [file, content] of writes) await writeFile(file, content, 'utf8');
	console.log('Updated ' + writes.size + ' event Markdown file(s).');
}

await sync();
