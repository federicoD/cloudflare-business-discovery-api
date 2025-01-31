import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { getCoordinates } from "./utils";
import { secureHeaders } from "hono/secure-headers";
import { requestId } from "hono/request-id";
import { AddBusinessInputModel } from "./dtos/addBusinessInputModel";
import { zValidator } from "@hono/zod-validator";
import { AddBusinessInputModelSchema, AddReviewInputModelSchema, DiscoveryBusinessSchema } from "./dtos/schemas";
import { Business } from "./dtos/business";
import { AddReviewInputModel } from "./dtos/addReviewInputModel";
import { Review } from "./dtos/review";
import { Env } from "../worker-configuration";

const app = new Hono<{ Bindings: Env }>();

app.use(secureHeaders());
app.use("*", prettyJSON(), logger(), async (c, next) => {
	return next();
});

const queryWithoutType = "select *, (6371 * acos(cos(radians(?1)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?2)) + sin(radians(?1)) * sin(radians(latitude)))) AS distance from Businesses order by distance asc limit ?3";
const queryWithType = "select *, (6371 * acos(cos(radians(?1)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?2)) + sin(radians(?1)) * sin(radians(latitude)))) AS distance from Businesses where type=?4 order by distance asc limit ?3";
const insertBusinessQuery = "insert into Businesses values (?1, ?2, ?3, ?4, ?5, ?6, ?7)";
const searchQuery = "select b.id, b.name, b.description, b.address, b.latitude, b.longitude, b.type FROM Businesses b JOIN BusinessesFTS fts ON b.id = fts.id WHERE BusinessesFTS MATCH ?1 limit ?2";
const insertReviewQuery = "insert into Reviews values (?1, ?2, ?3, ?4)";
const getReviewsScoreByBusiness = "select avg(score) as avg_score from Reviews where businessId = ?1";
// TODO: this can be improved
const updateScoreByBusiness = "update Businesses set reviewsScore=?1, updatedOn=?2 where id=?3 and (updatedOn=?4 or updatedOn is null)";
const getBusinessQuery = "select * from Businesses where id = ?1";

app.get(
	"/api/discovery",
	zValidator("query", DiscoveryBusinessSchema, (result, c) => {
		if (!result.success) {
			console.warn(`Validation failed: ${result.error}`);
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
				console.error(`Failure query businesses. Error: ${queryResult}`);
				return c.json({ error: `Failed to run query` }, 500);
			}

			return c.json(queryResult.results);
		} catch (err) {
			return c.json({ error: `Failed to run query: ${err}` }, 500);
		}
	}
);

// TODO: we can move it inside the discovery endpoint
app.get(
	"/api/business/search",
	async (c) => {
		try {
			const { query = null } = c.req.query();

			if (query === null || query === "") {
				console.warn(`Query is empty`);
				return c.json({ error: "Query is empty" }, 400);
			}

			const queryResult = await c.env.firstDb.prepare(searchQuery).bind(query, 10).run<Business>();

			if (!queryResult.success) {
				console.error(`Failure query businesses. Error: ${queryResult}`);
				return c.json({ error: `Failed to run query` }, 500);
			}

			return c.json(queryResult.results);
		} catch (err) {
			return c.json({ error: `Failed to run query: ${err}` }, 500);
		}
	}
);

app.post(
	"api/business",
	requestId(),
	zValidator("json", AddBusinessInputModelSchema, (result, c) => {
		if (!result.success) {
			console.warn(`Validation failed: ${result.error}`);
		}
	}),
	async (c) => {
		const input = await c.req.json<AddBusinessInputModel>();
		const result = await getCoordinates(input.address, c.env.OPEN_CAGE_DATA_API_KEY);

		if (!result) {
			return c.json({ error: 'Coordinates not found' }, 500);
		}

		// TODO: check if already exists?

		let business: Business = {
			id: c.get("requestId"),
			name: input.name,
			description: input.description,
			latitude: result.lat,
			longitude: result.lng,
			address: input.address, // TODO: we should check if the address matches result.address
			type: input.type,
			updatedOn: 0,
			reviewsScore: 0
		};

		let insertResult = await c.env.firstDb.prepare(insertBusinessQuery)
			.bind(business.id, business.name, business.description, business.address, business.latitude, business.longitude, business.type)
			.run();

		if (!insertResult.success) {
			console.error(`Failed inserting new business in the db. Error: ${insertResult} Business: ${business}`);
			return c.json({ error: "Could not insert the business" }, 500);
		}

		return c.json(business);
	}
);

app.post(
	"api/business/:businessId/reviews",
	requestId(),
	zValidator("json", AddReviewInputModelSchema, (result, c) => {
		if (!result.success) {
			console.warn(`Validation failed: ${result.error}`);
		}
	}),
	async (c) => {
		const { businessId } = c.req.param();
		const input = await c.req.json<AddReviewInputModel>();

		// TODO: check if already exists

		let review: Review = {
			id: c.get("requestId"),
			businessId: businessId,
			score: input.score,
			addedOn: Math.floor(Date.now() / 1000)
		};

		let insertResult = await c.env.firstDb.prepare(insertReviewQuery)
			.bind(c.get("requestId"), businessId, input.score, Math.floor(Date.now() / 1000))
			.run();

		if (!insertResult.success) {
			console.error(`Failed inserting new review in the db. Error: ${insertResult} Review: ${review}`);
			return c.json({ error: "Could not insert the business" }, 500);
		}

		try {
			await c.env.businessReviewsQueue.send(review);
		} catch (error) {
			console.error(`Failure sending message to queue for review ${review.id}. Error: ${error}`);
			// TODO: log
			// Retries? Reverting Db? Outboox?
		}

		return c.json(review, 200);
	}
);

export default {
	fetch: app.fetch,
	async queue(batch: MessageBatch<Review>, env: Env) {

		const maxRetries = 5;
		let retries = 0;

		for (const message of batch.messages) {
			retries = 0;

			while (++retries < maxRetries) {

				const getBusinessResult = await env.firstDb.prepare(getBusinessQuery)
					.bind(message.body.businessId)
					.run<Business>();

				if (!getBusinessResult.success) {
					console.error(`Failure getting businesses ${message.body.businessId}. Error: ${getBusinessResult.error}`);
					break;
				}

				if (getBusinessResult.results.length == 0) {
					console.error(`Business ${message.body.businessId} not found`);
					break;
				}

				let business = getBusinessResult.results[0];
				let updatedOn = 0;

				if (!!business.updatedOn) {
					updatedOn = business.updatedOn!;
				}

				const getReviewScoreResult = await env.firstDb.prepare(getReviewsScoreByBusiness)
					.bind(message.body.businessId)
					.run();

				let avgScore = Number(getReviewScoreResult.results[0].avg_score).toFixed(2);

				const updateBusinessScoreResult = await env.firstDb.prepare(updateScoreByBusiness)
					.bind(avgScore, Math.floor(Date.now() / 1000), message.body.businessId, updatedOn)
					.run();

				if (!updateBusinessScoreResult.success) {
					console.error(`Failure updating businesses ${message.body.businessId}. Error: ${updateBusinessScoreResult.error}`);
					// in this case let's retry
					continue;
				}

				// we use optimistic locking
				if (updateBusinessScoreResult.meta.rows_written != 0) {
					break;
				}
				
				// another event beat us up, let's retry
				console.warn(`Another event beat us up. Retry: ${retries}. ReviewId: ${message.body.id} BusinessId: ${message.body.businessId}`);
			}
		}
	},
}