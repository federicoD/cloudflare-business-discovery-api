import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';
import { Business } from '../src/dtos/business';

describe('Discovery Business', () => {
	it('responds with a business given limit equals to 1', async () => {
		const response = await SELF.fetch('http://example.com/api/discovery?lat=-25.630427&long=140.309065&limit=1');
		
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject([
			{
				"address": "59963 Diaz Wall Suite 719 Sandrachester, OR 54400",
				"id": "55178681-8f28-4d96-bb97-67295135d174",
				"latitude": -25.630427,
				"longitude": 140.309065,
				"name": "Barajas Group",
				"type": "coffee"
			}
		]);
	});

	it('responds with 3 businesses given limit equals to 3', async () => {
		const response = await SELF.fetch('http://example.com/api/discovery?lat=-16.070796&long=134.623111&limit=3');
		const responseJson : any[] = await response.json();
		
		expect(response.status).toBe(200);
		expect(responseJson.length).toBe(3);
	});

	it('responds with only coffee businesses given type equals coffee', async () => {
		const response = await SELF.fetch('http://example.com/api/discovery?lat=-16.070796&long=134.623111&type=coffee');
		const responseJson : any[] = await response.json();
		
		expect(response.status).toBe(200);
		expect(responseJson.every(x => x.type === "coffee")).toBe(true);
	});

	it('responds 400 when lat param is not passed', async () => {
		const response = await SELF.fetch('http://example.com/api/discovery?long=134.623111');
		
		expect(response.status).toBe(400);
	});

	it('responds 400 when long param is not passed', async () => {
		const response = await SELF.fetch('http://example.com/api/discovery?lat=-16.070796');
		
		expect(response.status).toBe(400);
	});
});

describe('Search Business', () => {
	it('responds with 0 businesses when query is not matched', async () => {
		const response = await SELF.fetch('http://example.com/api/business/search?query=abcdefg');
		
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject([]);
	});

	it('responds with multiple businesses when query is matched', async () => {
		const response = await SELF.fetch('http://example.com/api/business/search?query=coffee');
		
		expect(response.status).toBe(200);
		expect((await response.json<Business[]>()).length).toBeGreaterThan(0);
	});

	it('responds 400 when query param is not passed', async () => {
		const response = await SELF.fetch('http://example.com/api/business/search');
		
		expect(response.status).toBe(400);
	});
});
