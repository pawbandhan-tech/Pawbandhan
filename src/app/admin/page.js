import { redirect } from 'next/navigation';
import AdminPortalClient from './AdminPortalClient';

export const metadata = { title: 'Admin Portal' };

export default function AdminPage() {
  return <AdminPortalClient />;
}
