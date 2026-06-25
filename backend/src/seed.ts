import { connectDatabase, disconnectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { User, Office } from './models';
import { hashPassword } from './utils/password';

/**
 * Bootstrap seed.
 *
 * Creates ONLY:
 *   1. the active office geofence
 *   2. a single administrator account
 *
 * Salespeople are NOT seeded — the admin creates them from the dashboard's
 * "Team" page after signing in. Run once on a fresh database:
 *
 *   npm run seed
 *
 * The admin credentials come from env (with safe defaults):
 *   SEED_ADMIN_NAME      (default "Admin")
 *   SEED_ADMIN_EMAIL     (default "admin@vmukti.com")
 *   SEED_ADMIN_PASSWORD  (default "Admin@12345")
 *
 * If the admin already exists it is left untouched, UNLESS you set
 *   SEED_ADMIN_RESET=true
 * which resets that admin's password to SEED_ADMIN_PASSWORD (handy if you're
 * locked out or migrating from old demo data).
 */
async function seed() {
  await connectDatabase();

  // 1) Office geofence
  const office = await Office.findOneAndUpdate(
    { isActive: true },
    {
      $setOnInsert: {
        officeName: process.env.SEED_OFFICE_NAME || 'Head Office',
        latitude: Number(process.env.SEED_OFFICE_LAT ?? 23.0384),
        longitude: Number(process.env.SEED_OFFICE_LNG ?? 72.512),
        radius: env.DEFAULT_OFFICE_RADIUS_M,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );
  logger.info(
    { office: office.officeName, lat: office.latitude, lng: office.longitude, radius: office.radius },
    'office ready (adjust later from the dashboard or DB)'
  );

  // 2) Bootstrap admin
  const name = process.env.SEED_ADMIN_NAME || 'Admin';
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@vmukti.com').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const resetIfExists = String(process.env.SEED_ADMIN_RESET).toLowerCase() === 'true';

  const existing = await User.findOne({ email }).select('+passwordHash');

  if (!existing) {
    await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: 'admin',
      isActive: true,
    });
    logger.info({ email }, 'admin account created');
  } else if (resetIfExists) {
    existing.passwordHash = await hashPassword(password);
    existing.role = 'admin';
    existing.isActive = true;
    await existing.save();
    logger.info({ email }, 'admin already existed — password reset (SEED_ADMIN_RESET=true)');
  } else {
    logger.info(
      { email },
      'admin already exists — left untouched (set SEED_ADMIN_RESET=true to reset its password)'
    );
  }

  logger.info('--------------------------------------------------');
  logger.info('Seed complete. Sign in to the admin dashboard with:');
  logger.info(`  email:    ${email}`);
  logger.info(`  password: ${existing && !resetIfExists ? '(unchanged - existing account)' : password}`);
  logger.info('Then open the "Team" page to add salespeople.');
  logger.info('--------------------------------------------------');

  await disconnectDatabase();
  process.exit(0);
}

seed().catch((err) => {
  logger.fatal({ err }, 'seed failed');
  process.exit(1);
});
