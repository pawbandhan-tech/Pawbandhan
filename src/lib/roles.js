import { verifyAdminToken } from './admin-auth';

const PERMISSIONS = {
  admin: ['*'],
  'co-admin': [
    'users.view', 'users.create', 'users.edit',
    'cases.view', 'cases.edit',
    'ngos.view', 'ngos.edit',
    'kyc.view', 'kyc.review',
    'cms.edit', 'stories.edit', 'reviews.edit',
    'settings.view',
  ],
  staff: [
    'cases.view', 'cases.edit',
    'ngos.view',
    'kyc.view', 'kyc.review',
    'stories.view', 'reviews.view',
  ],
  viewer: ['cases.view', 'ngos.view'],
};

export function hasPermission(role, permission) {
  const perms = PERMISSIONS[role] || [];
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

export function requirePermission(permission) {
  return (request) => {
    const auth = verifyAdminToken(request);
    if (!auth) return false;
    return hasPermission(auth.role, permission);
  };
}
