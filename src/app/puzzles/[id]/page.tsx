import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import PuzzlePageClient from './PuzzlePageClient';

interface PuzzleData {
  id: number;
  title: string;
  description: string | null;
  filename: string;
  file_path: string;
  difficulty: string | null;
  grid_width: number | null;
  grid_height: number | null;
  category?: string | null;
}

async function readPuzzleContent(filePathRaw: string): Promise<string | null> {
  try {
    const storedPath = (filePathRaw || '').replace(/^\//, '');
    const filePath = storedPath.startsWith('public/')
      ? path.join(process.cwd(), storedPath)
      : path.join(process.cwd(), 'public', storedPath);
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export default async function PuzzlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const puzzleId = Number.parseInt(id, 10);

  if (!Number.isFinite(puzzleId) || puzzleId <= 0) {
    return (
      <PuzzlePageClient
        puzzleId={Number.isFinite(puzzleId) ? puzzleId : 0}
        initialPuzzle={null}
        initialPuzzleContent={null}
      />
    );
  }

  const puzzle = await prisma.puzzle.findUnique({
    where: { id: puzzleId, is_active: true },
    select: {
      id: true,
      title: true,
      description: true,
      filename: true,
      file_path: true,
      difficulty: true,
      grid_width: true,
      grid_height: true,
      category: true,
    },
  });

  if (!puzzle) {
    return (
      <PuzzlePageClient
        puzzleId={puzzleId}
        initialPuzzle={null}
        initialPuzzleContent={null}
      />
    );
  }

  const initialPuzzle: PuzzleData = {
    id: puzzle.id,
    title: puzzle.title,
    description: puzzle.description,
    filename: puzzle.filename,
    file_path: puzzle.file_path,
    difficulty: puzzle.difficulty,
    grid_width: puzzle.grid_width,
    grid_height: puzzle.grid_height,
    category: puzzle.category,
  };

  const initialPuzzleContent = await readPuzzleContent(puzzle.file_path);

  return (
    <PuzzlePageClient
      puzzleId={puzzleId}
      initialPuzzle={initialPuzzle}
      initialPuzzleContent={initialPuzzleContent}
    />
  );
}

