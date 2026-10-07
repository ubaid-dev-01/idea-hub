/**
 * Ensures the default super-admin account exists (dev / first deploy).
 * Run: npm run seed:admin -w @ideahub/api
 */
import 'dotenv/config';
import mongoose from 'mongoose';

import { User } from './models/index.js';

const EMAIL = 'ubaid@gmail.com';
const PASSWORD = 'ubaid123';
const USERNAME = 'ubaidadmin';

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }
  await mongoose.connect(uri, { maxPoolSize: 5 });

  const existing = await User.findOne({
    email: EMAIL.toLowerCase(),
  });
  if (existing) {
    existing.role = 'super_admin';
    existing.status = 'active';
    existing.isEmailVerified = true;
    existing.passwordHash = PASSWORD;
    await existing.save();
    console.log(`Updated existing user ${EMAIL} → super_admin (password reset).`);
  } else {
    await User.create({
      username: USERNAME,
      email: EMAIL.toLowerCase(),
      passwordHash: PASSWORD,
      fullName: 'Super Admin',
      role: 'super_admin',
      status: 'active',
      isEmailVerified: true,
    });
    console.log(`Created super admin: ${EMAIL} / ${PASSWORD}`);
  }

  const DUMMY2_EMAIL = 'backup.admin@ideahub.local';
  const DUMMY2_PASSWORD = 'BackupAdmin123!';
  const DUMMY2_USERNAME = 'backupadmin';

  const backup = await User.findOne({
    email: DUMMY2_EMAIL.toLowerCase(),
  });
  if (backup) {
    backup.role = 'super_admin';
    backup.status = 'active';
    backup.isEmailVerified = true;
    backup.passwordHash = DUMMY2_PASSWORD;
    await backup.save();
    console.log(
      `Updated backup super admin ${DUMMY2_EMAIL} (password reset).`
    );
  } else {
    await User.create({
      username: DUMMY2_USERNAME,
      email: DUMMY2_EMAIL.toLowerCase(),
      passwordHash: DUMMY2_PASSWORD,
      fullName: 'Backup Super Admin',
      role: 'super_admin',
      status: 'active',
      isEmailVerified: true,
    });
    console.log(
      `Created backup super admin: ${DUMMY2_EMAIL} / ${DUMMY2_PASSWORD}`
    );
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
