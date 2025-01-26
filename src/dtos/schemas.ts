import { z } from "zod";

export const AddBusinessInputModelSchema = z.object({
	name: z.string().max(100),
    description: z.string().max(500),
	address: z.string().max(200),
	type: z.enum(["restaurant", "coffee"])
});

export const DiscoveryBusinessSchema = z.object({
	lat: z.coerce.number(),
	long: z.coerce.number(),
	type: z.enum(["restaurant", "coffee"]).optional(),
	limit: z.coerce.number().gt(0).lte(100).optional()
});