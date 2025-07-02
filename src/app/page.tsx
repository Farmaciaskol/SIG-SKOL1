import { redirect } from 'next/navigation';

export default function RootPage() {
  // The main page is now at /dashboard.
  // This page just redirects there.
  redirect('/dashboard');
}
