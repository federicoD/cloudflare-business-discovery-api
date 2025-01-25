import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

describe('Discovery Business', () => {
	it('responds with a business given limit equals to 1', async () => {
		const response = await SELF.fetch('http://example.com/api/discovery?lat=-16.070796&long=134.623111&limit=1');
		
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject([
			{
				"address": "8628 Lori Burg, West Lucas, WY 98475",
				"distance": 0,
				"id": "886dd79b-ceea-4cfd-9bf6-9fcf17a776a8",
				"latitude": -16.070796,
				"longitude": 134.623111,
				"name": "Rodriguez Inc",
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
