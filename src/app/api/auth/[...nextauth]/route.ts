import { handlers } from '@/auth';

// Ensure NextAuth runs in the Node.js runtime (Prisma/bcrypt are not Edge-safe).
export const runtime = 'nodejs';

export const { GET, POST } = handlers;
