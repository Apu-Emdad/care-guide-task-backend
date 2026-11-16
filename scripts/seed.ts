/**
 * Seed script
 *
 * 1. Creates the first admin (user name "admin", email "admin@example.com", password "12345678").
 * 2. Creates 30 dummy users with different interests, and 1 to 3 notes and 1 to 2 posts for
 *    each. Every dummy user's password is "12345678".
 *
 * Safe to run again: the admin is skipped when it exists, and only the dummy users that don't
 * exist yet are added, with their notes and posts. Those are saved in one transaction, so
 * either all of them are saved or none.
 * Run it with `yarn db:seed`.
 */
import 'dotenv/config';
import * as argon2 from 'argon2';
import mongoose, { type Model } from 'mongoose';
import { INTEREST } from '../src/common/constants/interests.js';
import { Note, NoteSchema } from '../src/infra/mongo/schemas/note.schema.js';
import { Post, PostSchema } from '../src/infra/mongo/schemas/post.schema.js';
import { User, UserSchema } from '../src/infra/mongo/schemas/user.schema.js';

const PASSWORD = '12345678';

const ADMIN_USER_NAME = 'admin';
const ADMIN_FULL_NAME = 'Admin';
const ADMIN_EMAIL = 'admin@example.com';

const { MUSIC, TRAVEL, SPORTS, READING, MOVIES } = INTEREST;

/** userName, fullName and interests of each dummy user. The email is `<userName>@example.com`. */
const DUMMY_USERS = [
  ['rahim_uddin', 'Rahim Uddin', [MUSIC, TRAVEL]],
  ['nadia_islam', 'Nadia Islam', [READING]],
  ['tanvir_ahmed', 'Tanvir Ahmed', [SPORTS, MOVIES]],
  ['sadia_rahman', 'Sadia Rahman', [MUSIC, READING, MOVIES]],
  ['arif_hossain', 'Arif Hossain', [SPORTS]],
  ['farzana_akter', 'Farzana Akter', [TRAVEL, READING]],
  ['imran_khan', 'Imran Khan', [MOVIES]],
  ['lamia_chowdhury', 'Lamia Chowdhury', [MUSIC]],
  ['shakil_mahmud', 'Shakil Mahmud', [SPORTS, TRAVEL]],
  ['nusrat_jahan', 'Nusrat Jahan', [READING, MOVIES]],
  ['karim_sheikh', 'Karim Sheikh', [MUSIC, SPORTS, TRAVEL]],
  ['mitu_das', 'Mitu Das', [TRAVEL]],
  ['rafiq_hasan', 'Rafiq Hasan', [MOVIES, MUSIC]],
  ['tasnim_sultana', 'Tasnim Sultana', [READING, SPORTS]],
  ['jamal_mia', 'Jamal Mia', [SPORTS]],
  ['priya_saha', 'Priya Saha', [MUSIC, MOVIES]],
  ['sohel_rana', 'Sohel Rana', [TRAVEL, MOVIES]],
  ['mim_akter', 'Mim Akter', [READING]],
  ['habib_ullah', 'Habib Ullah', [MUSIC, TRAVEL, READING, SPORTS, MOVIES]],
  ['ruma_begum', 'Ruma Begum', [TRAVEL, SPORTS]],
  ['ayesha_siddika', 'Ayesha Siddika', [MUSIC, TRAVEL]],
  ['fahim_reza', 'Fahim Reza', [MUSIC, SPORTS]],
  ['sumaiya_haque', 'Sumaiya Haque', [MUSIC, READING]],
  ['naim_islam', 'Naim Islam', [MUSIC, MOVIES, TRAVEL]],
  ['rumana_parvin', 'Rumana Parvin', [MUSIC, SPORTS]],
  ['sabbir_hossain', 'Sabbir Hossain', [MUSIC, TRAVEL, SPORTS]],
  ['jannat_ara', 'Jannat Ara', [MUSIC]],
  ['mahfuz_alam', 'Mahfuz Alam', [SPORTS, TRAVEL]],
  ['tania_sultana', 'Tania Sultana', [READING, MOVIES]],
  ['sajid_karim', 'Sajid Karim', [MOVIES, MUSIC]],
] as const;

/** Text for notes (private) and posts (public), picked in turn so each user gets different ones. */
const NOTES = [
  ['Shopping list', 'Rice, lentils, eggs, onions and green chili.'],
  ['Work tasks', 'Finish the weekly report and reply to the client email.'],
  ['Ideas', 'Start a small blog about learning MongoDB.'],
  ['Books to read', 'Finish the novel I started last month.'],
  ['Call list', 'Call the bank and book a doctor appointment.'],
  ['Gym plan', 'Leg day on Monday, cardio on Wednesday.'],
  ['Trip budget', 'Bus tickets, hotel for two nights and food.'],
  ['Passwords hint', 'Use the password manager, never write passwords here.'],
  ['Meeting notes', 'Team wants the release next Thursday.'],
  ['Recipes', 'Try the chicken curry recipe from Ammu.'],
] as const;

const POSTS = [
  ['My first post', 'Hello everyone, happy to join this community.'],
  ['Weekend trip', 'Spent two days in Sylhet. The tea gardens were beautiful.'],
  ['Song of the week', 'I keep playing the same old song on repeat.'],
  ['Match day', 'What a game last night. The last over was crazy.'],
  ['Book review', 'Finished a great book this week. Highly recommend it.'],
  ['Movie night', 'Watched a classic film with friends. Still holds up.'],
  ['Morning walk', 'A short walk before work makes the whole day better.'],
  ['Learning to code', 'Built my first API this month. Small steps.'],
] as const;

async function seedAdmin(UserModel: Model<User>, passwordHash: string) {
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
    passwordHash,
    role: 'ADMIN',
  });
  console.log(`Admin "${ADMIN_EMAIL}" created`);
}

async function seedDummyData(
  UserModel: Model<User>,
  NoteModel: Model<Note>,
  PostModel: Model<Post>,
  passwordHash: string,
) {
  // 1. keeping only the dummy users whose user name and email are both free
  const userNames = DUMMY_USERS.map(([userName]) => userName);
  const existing = await UserModel.find(
    {
      $or: [
        { userName: { $in: userNames } },
        { email: { $in: userNames.map((name) => `${name}@example.com`) } },
      ],
    },
    { userName: 1, email: 1 },
  ).lean();
  const taken = new Set(
    existing.flatMap((user) => [user.userName, user.email]),
  );
  const missing = DUMMY_USERS.map((user, index) => ({ user, index })).filter(
    ({ user: [userName] }) =>
      !taken.has(userName) && !taken.has(`${userName}@example.com`),
  );
  if (!missing.length) {
    console.log('Dummy data seed skipped: all dummy users already exist');
    return;
  }

  // 2. saving the users, notes and posts in one transaction: all of them or none
  await mongoose.connection.transaction(async (session) => {
    const users = await UserModel.insertMany(
      missing.map(({ user: [userName, fullName, interests] }) => ({
        userName,
        fullName,
        email: `${userName}@example.com`,
        passwordHash,
        role: 'USER',
        interests,
      })),
      { session },
    );

    // Each user gets 1 to 3 notes and 1 to 2 posts, based on their place in DUMMY_USERS
    const notes = users.flatMap((user, k) => {
      const i = missing[k].index;
      return Array.from({ length: (i % 3) + 1 }, (_, j) => {
        const [title, content] = NOTES[(i + j) % NOTES.length];
        return { author: user._id, title, content };
      });
    });
    const posts = users.flatMap((user, k) => {
      const i = missing[k].index;
      return Array.from({ length: (i % 2) + 1 }, (_, j) => {
        const [title, content] = POSTS[(i + j * 3) % POSTS.length];
        return { author: user._id, title, content };
      });
    });
    await NoteModel.insertMany(notes, { session });
    await PostModel.insertMany(posts, { session });

    console.log(
      `Dummy data created: ${users.length} users, ${notes.length} notes, ${posts.length} posts`,
    );
  });
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });

  try {
    const UserModel = mongoose.model(User.name, UserSchema);
    const NoteModel = mongoose.model(Note.name, NoteSchema);
    const PostModel = mongoose.model(Post.name, PostSchema);
    // Creates the collections and indexes first, since a transaction can't build indexes
    await Promise.all([UserModel.init(), NoteModel.init(), PostModel.init()]);

    // Everyone shares one password, so one hash is enough
    const passwordHash = await argon2.hash(PASSWORD);

    await seedAdmin(UserModel, passwordHash);
    await seedDummyData(UserModel, NoteModel, PostModel, passwordHash);
    console.log(`Password for every seeded user: ${PASSWORD}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
