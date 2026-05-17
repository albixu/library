/**
 * Script: create-user.ts
 *
 * CLI script to create a new user in the Library system.
 * Generates a secure random password, hashes it, persists the user,
 * and sends a welcome email with the generated credentials.
 *
 * Usage:
 *   npm run create-user -- --email usuario@example.com
 *
 * Environment variables required:
 *   DATABASE_URL       - PostgreSQL connection string
 *   JWT_SECRET         - JWT signing secret (required by loadEnvConfig)
 *   JWT_REFRESH_SECRET - JWT refresh signing secret (required by loadEnvConfig)
 *   GMAIL_USER         - Gmail account used as sender
 *   GMAIL_APP_PASSWORD - Google App Password for Gmail SMTP
 */

import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import nodemailer from 'nodemailer';
import * as schema from '../src/infrastructure/driven/persistence/drizzle/schema.js';
import { loadEnvConfig } from '../src/infrastructure/config/env.js';
import { DrizzleUserRepository } from '../src/infrastructure/driven/persistence/DrizzleUserRepository.js';
import { Argon2PasswordHasher } from '../src/infrastructure/driven/auth/Argon2PasswordHasher.js';
import { User } from '../src/domain/user/User.js';
import { UserAlreadyExistsError } from '../src/domain/user/errors/UserErrors.js';

// ---------------------------------------------------------------------------
// Password generation
// ---------------------------------------------------------------------------

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;

/**
 * Generates a cryptographically secure random password of the given length.
 * Guarantees at least one character from each character class.
 */
function generateSecurePassword(length = 20): string {
  // Ensure at least one char from each class
  const mandatory = [
    pickRandom(LOWERCASE),
    pickRandom(UPPERCASE),
    pickRandom(DIGITS),
    pickRandom(SYMBOLS),
  ];

  const remaining = Array.from({ length: length - mandatory.length }, () =>
    pickRandom(ALL_CHARS),
  );

  // Shuffle so mandatory chars are not always at the start
  const combined = [...mandatory, ...remaining];
  return fisherYatesShuffle(combined).join('');
}

/** Picks a single random character from a string using crypto */
function pickRandom(chars: string): string {
  const randomIndex = randomBytes(1)[0]! % chars.length;
  return chars[randomIndex]!;
}

/** Shuffles an array in-place using Fisher-Yates with crypto randomness */
function fisherYatesShuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    // Secure random index in [0, i]
    const j = randomBytes(4).readUInt32BE(0) % (i + 1);
    [array[i], array[j]] = [array[j]!, array[i]!];
  }
  return array;
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { email: string } {
  const args = process.argv.slice(2);
  const emailFlagIndex = args.indexOf('--email');

  if (emailFlagIndex === -1 || !args[emailFlagIndex + 1]) {
    console.error('❌  Error: --email <address> is required.');
    console.error('   Usage: npm run create-user -- --email usuario@example.com');
    process.exit(1);
  }

  const email = args[emailFlagIndex + 1]!.trim();

  // Basic email format check before hitting the domain layer
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`❌  Error: "${email}" is not a valid email address.`);
    process.exit(1);
  }

  return { email };
}

// ---------------------------------------------------------------------------
// Email content
// ---------------------------------------------------------------------------

function buildWelcomeEmail(email: string, password: string): { subject: string; body: string } {
  const subject = 'Tu cuenta en Library ha sido creada';
  const body = [
    '¡Bienvenido/a a Library!',
    '',
    'Se ha creado una cuenta para vos con las siguientes credenciales:',
    '',
    `  Email:      ${email}`,
    `  Contraseña: ${password}`,
    '',
    'Por seguridad, te recomendamos cambiar la contraseña la primera vez que inicies sesión.',
    '',
    '— El equipo de Library',
  ].join('\n');

  return { subject, body };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { email } = parseArgs();

  // --- Load environment config ---
  let env: ReturnType<typeof loadEnvConfig>;
  try {
    env = loadEnvConfig();
  } catch (err) {
    console.error('❌  Error loading environment configuration:');
    console.error(`   ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // --- Validate Gmail config ---
  if (!env.gmail.user || !env.gmail.appPassword) {
    console.error('❌  Error: GMAIL_USER and GMAIL_APP_PASSWORD environment variables are required.');
    process.exit(1);
  }

  // --- Connect to DB ---
  const pool = new Pool({ connectionString: env.database.url });
  const db = drizzle(pool, { schema });

  try {
    const userRepository = new DrizzleUserRepository(db);
    const passwordHasher = new Argon2PasswordHasher();
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.gmail.user,
        pass: env.gmail.appPassword,
      },
    });

    // 1. Check email uniqueness
    const existing = await userRepository.findByEmail(email);
    if (existing !== null) {
      throw new UserAlreadyExistsError(email);
    }

    // 2. Generate and hash password
    const plainPassword = generateSecurePassword(20);
    const passwordHash = await passwordHasher.hash(plainPassword);

    // 3. Create and persist user
    const user = User.create({ email, passwordHash });
    await userRepository.save(user);

    // 4. Send welcome email
    const { subject, body } = buildWelcomeEmail(email, plainPassword);
    await transporter.sendMail({
      from: env.gmail.user,
      to: email,
      subject,
      text: body,
    });

    // 5. Success output
    console.log('');
    console.log('✅  Usuario creado exitosamente.');
    console.log(`   Email:      ${email}`);
    console.log(`   Contraseña: ${plainPassword}`);
    console.log('');
    console.log('   Se envió un email al usuario con sus credenciales.');
    console.log('');
  } catch (err) {
    if (err instanceof UserAlreadyExistsError) {
      console.error(`❌  Error: ${err.message}`);
      process.exit(1);
    }

    console.error('❌  Error inesperado:');
    console.error(`   ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
