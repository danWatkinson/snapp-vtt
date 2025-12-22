import { apiRequest, get, post } from "./baseClient";
import { serviceUrls } from "../config/services";

export type MediaType = "image" | "audio";

export interface DigitalAsset {
  id: string;
  ownerUserId: string;
  name: string;
  originalFileName: string;
  mediaType: MediaType;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  storageUrl: string;
}

export async function fetchAssets(
  token: string,
  options: { mediaType?: MediaType; search?: string } = {}
): Promise<DigitalAsset[]> {
  const params = new URLSearchParams();
  if (options.mediaType) params.set("mediaType", options.mediaType);
  if (options.search) params.set("search", options.search);

  const url = `${serviceUrls.assets}/assets${params.toString() ? `?${params.toString()}` : ""}`;
  return get<DigitalAsset[]>(url, "assets", { token });
}

export async function createAsset(
  token: string,
  input: {
    name?: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes?: number;
    tags?: string[];
  }
): Promise<DigitalAsset> {
  return post<DigitalAsset>(
    `${serviceUrls.assets}/assets`,
    "asset",
    input,
    { token }
  );
}

