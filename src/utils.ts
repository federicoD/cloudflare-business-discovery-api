import { OpenCageResponse } from "./dtos/openCageResponse";

export function roundToDecimals(num: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

export async function getCoordinates(address: string, apiKey: string): Promise<{ lat: number; lng: number; formatted: string } | null> {
  try {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: OpenCageResponse = await response.json(); // Manually parse JSON
    if (data.results.length > 0) {
      const location = data.results[0].geometry;
      const formatted = data.results[0].formatted;
      return { lat: location.lat, lng: location.lng, formatted };
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }

  return null;
}