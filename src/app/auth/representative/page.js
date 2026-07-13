import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Field Rescuer Login' };

export default function RepAuthPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <AuthForm role="representative" title="Field Rescuer Login" subtitle="Accept dispatches, navigate to incidents, and upload updates" />
    </div>
  );
}
