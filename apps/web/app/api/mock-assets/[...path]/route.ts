import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

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
    
    // Path to test-assets/images directory (relative to project root)
    const projectRoot = process.cwd();
    const imagesDir = join(projectRoot, "test-assets", "images");
    const filePath = join(imagesDir, fileName);
    
    // Check if file exists and read it
    const fileBuffer = await readFile(filePath);
    
    // Determine content type from file extension
    const ext = fileName.split(".").pop()?.toLowerCase();
    const contentType = 
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
      ext === "png" ? "image/png" :
      ext === "gif" ? "image/gif" :
      ext === "webp" ? "image/webp" :
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
