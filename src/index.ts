import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { getCoordinates, isNullOrUndefinedOrEmptyOrNotNumber } from "./utils";
import { secureHeaders } from "hono/secure-headers";
import { requestId } from "hono/request-id";
import { AddBusinessInputModel } from "./AddBusinessInputModel";
import { Business } from "./dtos/Business";

/*type Bindings = {
	firstDb: D1Database;
	OPEN_CAGE_DATA_API_KEY: string;
};*/

const app = new Hono<{ Bindings: Env }>();

app.use(secureHeaders());
app.use("*", prettyJSON(), logger(), async (c, next) => {
	return next();
});

const queryWithoutType = "select *, (6371 * acos(cos(radians(?1)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?2)) + sin(radians(?1)) * sin(radians(latitude)))) AS distance from Businesses order by distance asc limit ?3";
const queryWithType = "select *, (6371 * acos(cos(radians(?1)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?2)) + sin(radians(?1)) * sin(radians(latitude)))) AS distance from Businesses where type=?4 order by distance asc limit ?3";;
const insertQuery = "insert into Businesses values (?1, ?2, ?3, ?4, ?5, ?6)";

const defaultLimit: number = 10;

app.get("/api/discovery", async (c) => {
	try {
		const { limit, type, lat, long } = c.req.query();

		// TODO: try any validation framework
		if (isNullOrUndefinedOrEmptyOrNotNumber(lat) || isNullOrUndefinedOrEmptyOrNotNumber(long)) {
			return c.json({ error: "lat and long are required and must be coordinates" }, 400);
		}

		let userLat = parseFloat(lat);
		let userLong = parseFloat(long);
		let userLimit = parseInt(limit) ?? defaultLimit;
		let userType = null;

		if (userLimit < 0 || userLimit > 100) {
			userLimit = defaultLimit;
		}

		if (type !== "" && type !== undefined && type !== null) {
			userType = type;
		}

		let queryStatement = userType === null ?
			c.env.firstDb.prepare(queryWithoutType).bind(userLat, userLong, userLimit) :
			c.env.firstDb.prepare(queryWithType).bind(userLat, userLong, userLimit, userType);

		const queryResult = await queryStatement.run();

		if (!queryResult.success)
		{
			console.log(`Failure query businesses. Error: ${queryResult}`);
			return c.json({ error: `Failed to run query` }, 500);
		}

		return c.json(queryResult.results);
	} catch (err) {
		return c.json({ error: `Failed to run query: ${err}` }, 500);
	}
});

app.post('api/business', requestId(), async (c) => {
  const input = await c.req.json<AddBusinessInputModel>();

  // TODO: add validation

  const result = await getCoordinates(input.address, c.env.OPEN_CAGE_DATA_API_KEY);
  if (result) {

	let business: Business = {
		id: c.get('requestId'),
		name: input.name,
		latitude: result.lat,
		longitude: result.lng,
		address: input.address, // check if to use result.address
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
  } else {
    return c.json({ error: 'Could not insert the business' }, 500);
  }
});

export default app;