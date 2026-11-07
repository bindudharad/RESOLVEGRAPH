import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole, Prisma } from '@/generated/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    const where: Prisma.UserWhereInput = {};
    if (role && role.toUpperCase() in UserRole) {
      where.role = role.toUpperCase() as UserRole;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        organization: true,
        phone: true,
      },
    });

    return NextResponse.json(users);
  } catch (error: unknown) {
    console.error('API /api/users GET error:', error);
    const message = error instanceof Error ? error.message : 'Failed to list users';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
