import { requireAdmin } from './admin-auth';

export function jsonOk(data, status = 200) {
  return Response.json(data, { status });
}

export function jsonErr(message, status = 400) {
  return Response.json({ error: message }, { status });
}

export function checkAdmin(request) {
  const admin = requireAdmin(request);
  if (!admin) return { admin: null, response: jsonErr('Unauthorized', 401) };
  return { admin, response: null };
}
