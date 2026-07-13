import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'NGO Partner Login' };

export default function NgoAuthPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <AuthForm role="ngo" title="NGO Partner Login" subtitle="Manage cases, dispatch rescuers, and coordinate with vets" />
    </div>
  );
}
