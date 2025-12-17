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

const ASSET_SERVICE_URL =
  process.env.NEXT_PUBLIC_ASSET_SERVICE_URL ?? "https://localhost:4700";

export async function fetchAssets(
  token: string,
  options: { mediaType?: MediaType; search?: string } = {}
): Promise<DigitalAsset[]> {
  const params = new URLSearchParams();
  if (options.mediaType) params.set("mediaType", options.mediaType);
  if (options.search) params.set("search", options.search);

  const res = await fetch(
    `${ASSET_SERVICE_URL}/assets${params.toString() ? `?${params.toString()}` : ""}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? "Failed to load assets");
  }

  return (body.assets ?? []) as DigitalAsset[];
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
  const res = await fetch(`${ASSET_SERVICE_URL}/assets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? "Failed to create asset");
  }

  return body.asset as DigitalAsset;
}

