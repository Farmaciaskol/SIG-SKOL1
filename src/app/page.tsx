import { redirect } from 'next/navigation';

export default function RootPage() {
  // The main page is now at /login
  redirect('/login');
}
