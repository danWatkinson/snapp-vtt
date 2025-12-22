import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import https from "https";
import type { DigitalAsset } from "../../../lib/clients/assetsClient";

/**
 * API route to handle asset uploads.
 * Saves the file to seeds/assets/images or seeds/assets/audio,
 * then creates the asset record via the assets service.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from headers
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const token = authHeader.substring(7);

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return new NextResponse("No file provided", { status: 400 });
    }

    // Determine if it's an image or audio file
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    
    if (!isImage && !isAudio) {
      return new NextResponse("File must be an image or audio file", { status: 400 });
    }

    // Determine the target directory
    const currentDir = process.cwd();
    const projectRoot = currentDir.endsWith("apps/web") 
      ? join(currentDir, "..", "..")
      : currentDir;
    const subDir = isImage ? "images" : "audio";
    const assetsDir = join(projectRoot, "seeds", "assets", subDir);
    
    // Ensure the directory exists
    if (!existsSync(assetsDir)) {
      await mkdir(assetsDir, { recursive: true });
    }

    // Save the file
    const fileName = file.name;
    const filePath = join(assetsDir, fileName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);

    // Save the file first, then create the asset record
    // The storageUrl will be /mock-assets/{fileName}
    const storageUrl = `/mock-assets/${encodeURIComponent(fileName)}`;
    
    // Call the assets service to create the asset record
    // Use a custom fetch that ignores SSL certificate errors for self-signed certs
    const ASSET_SERVICE_URL = process.env.NEXT_PUBLIC_ASSET_SERVICE_URL ?? "https://localhost:3004";
    
    // For server-side fetch in Node.js, we need to use undici or handle SSL differently
    // Since Next.js uses Node's fetch, we'll use the https module directly
    const url = new URL(`${ASSET_SERVICE_URL}/assets`);
    const postData = JSON.stringify({
      originalFileName: fileName,
      mimeType: file.type,
      sizeBytes: file.size
    });
    
    const asset = await new Promise<DigitalAsset>((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 4700 : 80),
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
          Authorization: `Bearer ${token}`
        },
        // Ignore self-signed certificate errors for development
        rejectUnauthorized: false
      };
      
      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const body = JSON.parse(data);
              resolve(body.asset || body);
            } catch (err) {
              reject(new Error("Failed to parse asset response"));
            }
          } else {
            try {
              const errorBody = JSON.parse(data);
              reject(new Error(errorBody.error ?? "Failed to create asset"));
            } catch {
              reject(new Error(`Failed to create asset: ${res.statusCode}`));
            }
          }
        });
      });
      
      req.on("error", (err) => {
        reject(new Error(`Network error: ${err.message}`));
      });
      
      req.write(postData);
      req.end();
    });

    // Override the storageUrl to point to our mock-assets route
    // The assets service might return a different URL, but we want to use our local mock route
    return NextResponse.json({
      ...asset,
      storageUrl
    });
  } catch (error) {
    console.error("Error uploading asset:", error);
    const message = error instanceof Error ? error.message : "Failed to upload asset";
    return new NextResponse(message, { status: 500 });
  }
}
