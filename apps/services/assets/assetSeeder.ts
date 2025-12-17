import fs from "fs";
import path from "path";
import { InMemoryAssetStore, type DigitalAsset } from "./app";

export interface AssetSeedOptions {
  /** Optional explicit path to the test-assets/images directory. */
  imagesDirectory?: string;
  /** User ID to use as the owner of seeded assets. Defaults to "admin". */
  ownerUserId?: string;
}

/**
 * Seed image assets from the test-assets/images directory.
 * Creates DigitalAsset records for each image file found.
 */
export const seedAssets = (
  store: InMemoryAssetStore,
  options: AssetSeedOptions = {}
): void => {
  const imagesDir = options.imagesDirectory
    ? path.isAbsolute(options.imagesDirectory)
      ? options.imagesDirectory
      : path.join(process.cwd(), options.imagesDirectory)
    : path.join(process.cwd(), "test-assets", "images");

  const ownerUserId = options.ownerUserId ?? "admin";

  try {
    if (!fs.existsSync(imagesDir)) {
      // eslint-disable-next-line no-console
      console.warn(
        `Images directory not found at ${imagesDir}, skipping asset seeding`
      );
      return;
    }

    const files = fs.readdirSync(imagesDir);
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
    });

    if (imageFiles.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(`No image files found in ${imagesDir}`);
      return;
    }

    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp"
    };

    for (const fileName of imageFiles) {
      try {
        const filePath = path.join(imagesDir, fileName);
        const stats = fs.statSync(filePath);
        const ext = path.extname(fileName).toLowerCase();
        const mimeType = mimeTypes[ext] || "image/jpeg";
        const baseName = path.basename(fileName, ext);

        // Check if asset already exists (by originalFileName)
        const existingAssets = store.listByOwner(ownerUserId);
        const exists = existingAssets.some(
          (a) => a.originalFileName === fileName
        );

        if (exists) {
          // eslint-disable-next-line no-console
          console.log(`Asset '${fileName}' already exists, skipping`);
          continue;
        }

        const asset = store.create({
          ownerUserId,
          name: baseName,
          originalFileName: fileName,
          mediaType: "image",
          mimeType,
          sizeBytes: stats.size,
          tags: [],
          storageUrl: `/mock-assets/${encodeURIComponent(fileName)}`
        });

        // eslint-disable-next-line no-console
        console.log(`Seeded asset: ${fileName} (${asset.id})`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Failed to seed asset ${fileName}:`, (err as Error).message);
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `Successfully seeded ${imageFiles.length} asset(s) from ${imagesDir}`
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      `Failed to load assets from ${imagesDir}:`,
      (err as Error).message
    );
  }
};
