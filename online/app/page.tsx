import { redirect } from 'next/navigation';
export default async function Home({ searchParams }: { searchParams: Promise<{ room?: string }> }) {
  const { room } = await searchParams;
  const code = typeof room === 'string' ? room.trim().toUpperCase() : '';
  redirect('/game.html' + (/^[A-Z2-9]{6}$/.test(code) ? '?room=' + code : ''));
}
