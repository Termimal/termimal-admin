export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation';

export default function Home() {
  // Automatically send users to the login page
  redirect('/login');
}
