import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { getCoordinates } from "./utils";
import { secureHeaders } from "hono/secure-headers";
import { requestId } from "hono/request-id";
import { AddBusinessInputModel } from "./dtos/addBusinessInputModel";
import { zValidator } from "@hono/zod-validator";
import { AddBusinessInputModelSchema, DiscoveryBusinessSchema } from "./dtos/schemas";
import { Business } from "./dtos/business";

const app = new Hono<{ Bindings: Env }>();

app.use(secureHeaders());
app.use("*", prettyJSON(), logger(), async (c, next) => {
	return next();
});

const queryWithoutType = "select *, (6371 * acos(cos(radians(?1)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?2)) + sin(radians(?1)) * sin(radians(latitude)))) AS distance from Businesses order by distance asc limit ?3";
const queryWithType = "select *, (6371 * acos(cos(radians(?1)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?2)) + sin(radians(?1)) * sin(radians(latitude)))) AS distance from Businesses where type=?4 order by distance asc limit ?3";
const insertQuery = "insert into Businesses values (?1, ?2, ?3, ?4, ?5, ?6)";
const searchQuery = "select b.id, b.name, b.description, b.address, b.latitude, b.longitude, b.type FROM Businesses b JOIN BusinessesFTS fts ON b.id = fts.id WHERE BusinessesFTS MATCH ?1 limit ?2";

app.get(
	"/api/discovery",
	zValidator("query", DiscoveryBusinessSchema, (result, c) => {
		if (!result.success) {
			console.log(`Validation failed: ${result.error}`);
		}
	}),
	async (c) => {
	try {
		const { limit = 10, type, lat, long } = c.req.query();

		let userLat = parseFloat(lat);
		let userLong = parseFloat(long);
		let userLimit = limit;
		let userType = null;

		if (type !== "" && type !== undefined && type !== null) {
			userType = type;
		}

		let queryStatement = userType === null ?
			c.env.firstDb.prepare(queryWithoutType).bind(userLat, userLong, userLimit) :
			c.env.firstDb.prepare(queryWithType).bind(userLat, userLong, userLimit, userType);

		const queryResult = await queryStatement.run<Business>();

		if (!queryResult.success) {
			console.log(`Failure query businesses. Error: ${queryResult}`);
			return c.json({ error: `Failed to run query` }, 500);
		}

		return c.json(queryResult.results);
	} catch (err) {
		return c.json({ error: `Failed to run query: ${err}` }, 500);
	}
});

// TODO: we can move it inside the discovery endpoint
app.get(
	"/api/business/search",
	async (c) => {
	try {
		const { query = null } = c.req.query();

		if (query === null || query === "") {
			console.log(`Query is empty`);
			return c.json({ error: "Query is empty"}, 400);
		}

		const queryResult = await c.env.firstDb.prepare(searchQuery).bind(query, 10).run<Business>();

		if (!queryResult.success) {
			console.log(`Failure query businesses. Error: ${queryResult}`);
			return c.json({ error: `Failed to run query` }, 500);
		}

		return c.json(queryResult.results);
	} catch (err) {
		return c.json({ error: `Failed to run query: ${err}` }, 500);
	}
});

app.post(
	"api/business",
	requestId(),
	zValidator("json", AddBusinessInputModelSchema, (result, c) => {
		if (!result.success) {
			console.log(`Validation failed: ${result.error}`);
		}
	}),
	async (c) => {
		const input = await c.req.json<AddBusinessInputModel>();
		const result = await getCoordinates(input.address, c.env.OPEN_CAGE_DATA_API_KEY);

		if (!result) {
			return c.json({ error: 'Coordinates not found' }, 500);
		}

		let business: Business = {
			id: c.get("requestId"),
			name: input.name,
			description: input.description,
			latitude: result.lat,
			longitude: result.lng,
			address: input.address, // TODO: we should check if the address matches result.address
			type: input.type
		};

		let insertResult = await c.env.firstDb.prepare(insertQuery)
			.bind(business.id, business.name, business.address, business.latitude, business.longitude, business.type)
			.run();

		if (!insertResult.success) {
			console.log(`Failed inserting new business in the db. Error: ${insertResult} Business: ${business}`);
			return c.json({ error: "Could not insert the business" }, 500);
		}

		return c.json(business);
	});

export default app;