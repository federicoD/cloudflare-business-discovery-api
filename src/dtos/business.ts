export interface Business {
	id: string;
	name: string;
	description: string;
	address: string;
	type: "restaurant" | "coffee";
	latitude: number;
	longitude: number;
}
