/**
 * Seed script
 *
 * Creates the first admin (user name "admin", email "admin@example.com", password "12345678").
 * Safe to run again: it does nothing when the admin already exists.
 * Run it with `yarn db:seed`.
 */
import 'dotenv/config';
import * as argon2 from 'argon2';
import mongoose from 'mongoose';
import { User, UserSchema } from '../src/infra/mongo/schemas/user.schema.js';

const ADMIN_USER_NAME = 'admin';
const ADMIN_FULL_NAME = 'Admin';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = '12345678';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });

  try {
    const UserModel = mongoose.model(User.name, UserSchema);
    await UserModel.init();

    const existing = await UserModel.exists({
      $or: [{ email: ADMIN_EMAIL }, { userName: ADMIN_USER_NAME }],
    });
    if (existing) {
      console.log(
        `Admin seed skipped: "${ADMIN_USER_NAME}" or "${ADMIN_EMAIL}" exists`,
      );
      return;
    }

    await UserModel.create({
      userName: ADMIN_USER_NAME,
      fullName: ADMIN_FULL_NAME,
      email: ADMIN_EMAIL,
      passwordHash: await argon2.hash(ADMIN_PASSWORD),
      role: 'ADMIN',
    });
    console.log(`Admin "${ADMIN_EMAIL}" created`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
