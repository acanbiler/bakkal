import { Meilisearch } from 'meilisearch';

let _client: Meilisearch | null = null;

export function getMeiliClient(): Meilisearch {
	if (!_client) {
		_client = new Meilisearch({
			host: process.env.MEILI_URL!,
			apiKey: process.env.MEILI_MASTER_KEY
		});
	}
	return _client;
}
