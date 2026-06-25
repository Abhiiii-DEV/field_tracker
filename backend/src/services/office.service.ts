import { Office, OfficeDoc } from '../models';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

/**
 * The office geofence is read on every location ingest, so it is cached in
 * memory and invalidated on update. Single active office for now; the schema
 * and cache key make multi-office / multi-tenant a small future change.
 */
let cache: { office: OfficeDoc; at: number } | null = null;
const TTL_MS = 60_000;

export async function getActiveOffice(): Promise<OfficeDoc> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.office;
  let office = await Office.findOne({ isActive: true });
  if (!office) {
    // Bootstrap a placeholder so the system is usable before configuration.
    office = await Office.create({
      officeName: 'Head Office',
      latitude: 23.0384,
      longitude: 72.512,
      radius: env.DEFAULT_OFFICE_RADIUS_M,
      isActive: true,
    });
  }
  cache = { office, at: Date.now() };
  return office;
}

export function invalidateOfficeCache() {
  cache = null;
}

export async function updateOffice(
  id: string,
  patch: Partial<{ officeName: string; latitude: number; longitude: number; radius: number }>
) {
  const office = await Office.findByIdAndUpdate(id, patch, { new: true });
  if (!office) throw AppError.notFound('Office not found');
  invalidateOfficeCache();
  return office;
}

export async function listOffices() {
  return Office.find().lean();
}
