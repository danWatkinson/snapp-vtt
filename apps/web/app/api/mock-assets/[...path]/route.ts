import { NextRequest, NextResponse } from "next/server";
import { readFile, access } from "fs/promises";
import { join } from "path";
import { constants } from "fs";

/**
 * API route to serve mock assets from test-assets/images directory.
 * This allows the frontend to display images that are referenced by mock storage URLs
 * like /mock-assets/approaching-nuln.jpg during development.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    // Reconstruct the file path from the route params
    const fileName = resolvedParams.path.join("/");
    
    // Security: prevent path traversal
    if (fileName.includes("..")) {
      return new NextResponse("Invalid path", { status: 400 });
    }
    
    // Path to seeds/assets/images directory (relative to project root)
    // process.cwd() might be apps/web, so we need to go up to project root
    const currentDir = process.cwd();
    // Check if we're in apps/web and adjust path accordingly
    const projectRoot = currentDir.endsWith("apps/web") 
      ? join(currentDir, "..", "..")
      : currentDir;
    // Assets are stored in seeds/assets/images or seeds/assets/audio
    // Try images first, then audio
    const imagesDir = join(projectRoot, "seeds", "assets", "images");
    const audioDir = join(projectRoot, "seeds", "assets", "audio");
    
    // Check if file exists in images or audio directory
    let filePath = join(imagesDir, fileName);
    let fileExists = false;
    
    try {
      await access(filePath, constants.F_OK);
      fileExists = true;
    } catch {
      // Not in images, try audio
      filePath = join(audioDir, fileName);
      try {
        await access(filePath, constants.F_OK);
        fileExists = true;
      } catch {
        // File doesn't exist in either directory
        fileExists = false;
      }
    }
    
    if (!fileExists) {
      // File doesn't exist - return 404 without logging error
      return new NextResponse("Asset not found", { status: 404 });
    }
    
    // File exists, read it
    const fileBuffer = await readFile(filePath);
    
    // Determine content type from file extension
    const ext = fileName.split(".").pop()?.toLowerCase();
    const contentType = 
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
      ext === "png" ? "image/png" :
      ext === "gif" ? "image/gif" :
      ext === "webp" ? "image/webp" :
      ext === "mp3" ? "audio/mpeg" :
      ext === "wav" ? "audio/wav" :
      ext === "ogg" ? "audio/ogg" :
      ext === "m4a" ? "audio/mp4" :
      "application/octet-stream";
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    // File not found or other error
    console.error(`Error serving mock asset:`, error);
    return new NextResponse("Asset not found", { status: 404 });
  }
}
