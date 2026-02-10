import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from 'fs/promises';
import path from 'path';

type CachedFile = {
  mtimeMs: number;
  size: number;
  etag: string;
  content: string;
};

const fileCache = new Map<string, CachedFile>();

function makeEtag(size: number, mtimeMs: number) {
  // Weak etag is fine for our static puzzle HTML.
  return `W/\"${size}-${Math.floor(mtimeMs)}\"`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const puzzleId = parseInt(id);
    
    if (isNaN(puzzleId)) {
      return NextResponse.json(
        { error: "Invalid puzzle ID" },
        { status: 400 }
      );
    }

    const puzzle = await prisma.puzzle.findUnique({
      where: {
        id: puzzleId,
        is_active: true,
      },
      select: {
        id: true,
        file_path: true,
        filename: true,
      },
    });

    if (!puzzle) {
      return NextResponse.json(
        { error: "Puzzle not found" },
        { status: 404 }
      );
    }

    // Read the puzzle file content
    try {
      // `puzzle.file_path` may be stored as either:
      // - "public/puzzles/..." (current upload implementation)
      // - "puzzles/..." (legacy/alternate)
      // Normalize to an absolute FS path.
      const storedPath = (puzzle.file_path || '').replace(/^\//, '');
      const filePath = storedPath.startsWith('public/')
        ? path.join(process.cwd(), storedPath)
        : path.join(process.cwd(), 'public', storedPath);
      const stat = await fs.stat(filePath);
      const cached = fileCache.get(filePath);
      let content: string;
      let etag: string;

      if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
        content = cached.content;
        etag = cached.etag;
      } else {
        content = await fs.readFile(filePath, 'utf-8');
        etag = makeEtag(stat.size, stat.mtimeMs);
        fileCache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, etag, content });
      }
      
      // Check if this is an iframe request
      const url = new URL(request.url);
      const mode = url.searchParams.get('mode');

      const ifNoneMatch = request.headers.get('if-none-match');
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: {
            ETag: etag,
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          },
        });
      }
      
      if (mode === 'iframe') {
        // Return raw HTML content for iframe
        return new NextResponse(content, {
          headers: {
            'Content-Type': 'text/html',
            'X-Frame-Options': 'SAMEORIGIN',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            'ETag': etag,
          },
        });
      } else {
        // Return JSON response with content for regular API calls
        return NextResponse.json({
          content,
          metadata: {
            filename: puzzle.filename,
            filePath: puzzle.file_path
          }
        }, {
          headers: {
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            'ETag': etag,
          },
        });
      }
    } catch (fileError) {
      console.error('Error reading puzzle file:', fileError);
      return NextResponse.json(
        { error: "Puzzle content not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error fetching puzzle content:", error);
    return NextResponse.json(
      { error: "Failed to fetch puzzle content" },
      { status: 500 }
    );
  }
}
