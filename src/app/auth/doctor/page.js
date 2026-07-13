import AuthForm from '@/components/AuthForm';

export const metadata = { title: 'Veterinarian Login' };

export default function DoctorAuthPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <AuthForm role="doctor" title="Veterinarian Login" subtitle="View assigned cases, submit treatments, and track patients" />
    </div>
  );
}
