import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Sign In' };

export default function CustomerAuthPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <AuthForm role="customer" />
    </div>
  );
}
