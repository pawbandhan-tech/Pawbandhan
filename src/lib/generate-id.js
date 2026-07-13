// Generates 12-character alphanumeric IDs like PB-DOC-XXXX-XXXX
// The last 4 chars are highlighted separately

export function generateId(prefix = 'PB', segmentCount = 2) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let segments = [];
  for (let s = 0; s < segmentCount; s++) {
    let seg = '';
    for (let i = 0; i < 4; i++) seg += chars[Math.floor(Math.random() * chars.length)];
    segments.push(seg);
  }
  return `${prefix}-${segments.join('-')}`;
}

// Returns { full, prefix, highlighted } where highlighted is the last 4 chars
export function formatId(id) {
  const parts = id.split('-');
  return {
    full: id,
    prefix: parts.slice(0, -1).join('-'),
    highlighted: parts[parts.length - 1],
  };
}

// ID types with prefixes:
// PB-ACC-XXXX-XXXX  (Account)
// PB-CASE-XXXX-XXXX (Case/Incident)
// PB-NGO-XXXX-XXXX  (NGO)
// PB-DOC-XXXX-XXXX  (Doctor)
// PB-RID-XXXX-XXXX  (Rider)
// PB-DOG-XXXX-XXXX  (Dog/Animal)
// PB-PRN-XXXX-XXXX  (PRN)
