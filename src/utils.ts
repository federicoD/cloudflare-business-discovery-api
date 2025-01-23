import axios from "axios";
import { OpenCageResponse } from "./dtos/openCageResponse";

export function roundToDecimals(num: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

export async function getCoordinates(address: string, apiKey: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const response = await axios.get<OpenCageResponse>(url);

    // Check if results are returned
    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry;
      const formatted = response.data.results[0].formatted;
      return { lat: location.lat, lng: location.lng, formatted };
    }
  } catch (error) {
    console.error('Error while fetching coordinates:', error);
  }
  return null;
}