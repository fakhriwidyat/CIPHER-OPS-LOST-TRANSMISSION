import { redirect } from 'next/navigation';
export default async function Home({ searchParams }: { searchParams: Promise<{ room?: string }> }) {
  const { room } = await searchParams;
  redirect('/game.html' + (/^[A-Z2-9]{6}$/.test(room || '') ? '?room=' + room : ''));
}
