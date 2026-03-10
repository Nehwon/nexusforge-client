import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { authenticator } from 'otplib';
import crypto from 'crypto';

const app = express();

const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-access-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://nexusforge.en-ligne.fr';
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.nexusforge.en-ligne.fr';

const ROOT_ADMIN_FIRST_NAME = process.env.ROOT_ADMIN_FIRST_NAME || 'Mikael';
const ROOT_ADMIN_LAST_NAME = process.env.ROOT_ADMIN_LAST_NAME || 'Frémaux';
const ROOT_ADMIN_NICKNAME = process.env.ROOT_ADMIN_NICKNAME || 'IronmanLM';
const ROOT_ADMIN_EMAIL = (process.env.ROOT_ADMIN_EMAIL || 'ironmanlm@en-ligne.fr').toLowerCase();
const ROOT_ADMIN_PASSWORD = process.env.ROOT_ADMIN_PASSWORD || 'ZOcDJyuTEjSIA8';

const EMAIL_TOKEN_TTL_MS = Number(process.env.EMAIL_TOKEN_TTL_MS || 24 * 60 * 60 * 1000);
const RESET_TOKEN_TTL_MS = Number(process.env.RESET_TOKEN_TTL_MS || 60 * 60 * 1000);
const TWO_FACTOR_CHALLENGE_TTL_MS = Number(process.env.TWO_FACTOR_CHALLENGE_TTL_MS || 5 * 60 * 1000);

const MAX_FAILED_ATTEMPTS = Number(process.env.MAX_FAILED_ATTEMPTS || 5);
const LOCKOUT_STEPS_MINUTES = [15, 30, 60];
const GENERIC_SESSION_SETTINGS = {
  allowPlayerToEditCharacterOffline: true,
  allowPlayerToPlayerChat: true,
  allowPlayerToPlayerDocuments: true,
  silenceMode: 'off'
};

app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));

const refreshTokens = new Set();
const emailVerificationTokens = new Map();
const passwordResetTokens = new Map();
const twoFactorChallenges = new Map();

const users = new Map();
const usersByEmail = new Map();
const sessions = new Map();
const systems = new Map();
const characters = new Map();

let smtpTransport = null;

function nowIso() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function publicUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname,
    displayName: user.displayName,
    email: user.email,
    roles: user.roles,
    isEmailVerified: user.isEmailVerified,
    approvalStatus: user.approvalStatus,
    hasTotpEnabled: Boolean(user.totpEnabled),
    isProtectedRootAdmin: Boolean(user.isProtectedRootAdmin),
    createdAt: user.createdAt
  };
}

function error(res, status, code, message, details = undefined) {
  return res.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}

function parseBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, value] = header.split(' ');
  if (scheme !== 'Bearer' || !value) {
    return null;
  }
  return value;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function canSendEmails() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}

function getTransport() {
  if (smtpTransport) {
    return smtpTransport;
  }

  if (!canSendEmails()) {
    return null;
  }

  smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return smtpTransport;
}

async function sendEmail({ to, subject, text, html }) {
  const transport = getTransport();
  if (!transport) {
    // eslint-disable-next-line no-console
    console.log(`[mail:disabled] to=${to} subject="${subject}" body=${text}`);
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
    html
  });
}

function issueTokens(user) {
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    {
      sub: user.id,
      type: 'refresh'
    },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  refreshTokens.add(refreshToken);
  return { token, refreshToken };
}

function requireAuth(req, res, next) {
  const token = parseBearer(req);
  if (!token) {
    return error(res, 401, 'UNAUTHENTICATED', 'Missing token');
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = users.get(payload.sub);
    if (!user) {
      return error(res, 401, 'UNAUTHENTICATED', 'Unknown user');
    }

    req.currentUser = user;
    return next();
  } catch {
    return error(res, 401, 'UNAUTHENTICATED', 'Invalid token');
  }
}

function requireAdmin(req, res, next) {
  if (!req.currentUser.roles.includes('admin')) {
    return error(res, 403, 'ADMIN_REQUIRED', 'Admin role required');
  }
  return next();
}

function getLockInfo(user) {
  if (!user.lockedUntil) {
    return { isLocked: false, remainingMs: 0 };
  }

  const remainingMs = user.lockedUntil - nowMs();
  if (remainingMs <= 0) {
    user.lockedUntil = null;
    return { isLocked: false, remainingMs: 0 };
  }

  return { isLocked: true, remainingMs };
}

function applyFailedLogin(user) {
  user.failedLoginCount = (user.failedLoginCount || 0) + 1;
  if (user.failedLoginCount < MAX_FAILED_ATTEMPTS) {
    return;
  }

  user.failedLoginCount = 0;
  user.lockoutLevel = Math.min((user.lockoutLevel || 0) + 1, LOCKOUT_STEPS_MINUTES.length);
  const lockMinutes = LOCKOUT_STEPS_MINUTES[user.lockoutLevel - 1] || LOCKOUT_STEPS_MINUTES[LOCKOUT_STEPS_MINUTES.length - 1];
  user.lockedUntil = nowMs() + lockMinutes * 60 * 1000;
}

function clearLoginFailures(user) {
  user.failedLoginCount = 0;
  user.lockedUntil = null;
}

function verifyTotpCode(secret, code) {
  if (!code) {
    return false;
  }
  try {
    return authenticator.check(String(code).trim(), secret);
  } catch {
    return false;
  }
}

function canViewSystem(system, user) {
  return (
    system.visibility === 'public' ||
    system.ownerUserId === user.id ||
    user.roles.includes('admin') ||
    (system.editorUserIds || []).includes(user.id) ||
    (system.viewerUserIds || []).includes(user.id)
  );
}

function canEditSystem(system, user) {
  return system.ownerUserId === user.id || user.roles.includes('admin') || (system.editorUserIds || []).includes(user.id);
}

function appendSystemAudit(system, params) {
  const entry = {
    id: makeId('audit'),
    at: nowIso(),
    byUserId: params.byUserId,
    action: params.action,
    summary: params.summary
  };
  const current = Array.isArray(system.auditTrail) ? system.auditTrail : [];
  return [...current, entry].slice(-100);
}

function getSystemUsage(systemId) {
  const linkedSessions = [...sessions.values()].filter((session) => session.systemId === systemId);
  const activeSessions = linkedSessions.filter((session) => !session.archivedAt);
  const archivedSessions = linkedSessions.filter((session) => Boolean(session.archivedAt));

  const uniqueActiveUsers = new Set();
  for (const session of activeSessions) {
    for (const participant of session.participants || []) {
      if (participant.userId) {
        uniqueActiveUsers.add(participant.userId);
      }
    }
    if (session.ownerUserId) {
      uniqueActiveUsers.add(session.ownerUserId);
    }
    if (session.gmUserId) {
      uniqueActiveUsers.add(session.gmUserId);
    }
    for (const gmUserId of session.gmUserIds || []) {
      uniqueActiveUsers.add(gmUserId);
    }
  }

  const timestamps = linkedSessions
    .flatMap((session) => [session.updatedAt, session.createdAt, session.archivedAt])
    .filter((value) => typeof value === 'string' && value);
  const lastUsedAt =
    timestamps.length > 0
      ? new Date(
          Math.max(
            ...timestamps.map((value) => {
              const parsed = new Date(value).getTime();
              return Number.isFinite(parsed) ? parsed : 0;
            })
          )
        ).toISOString()
      : null;

  return {
    usersUsingNow: uniqueActiveUsers.size,
    activeSessionsCount: activeSessions.length,
    archivedSessionsCount: archivedSessions.length,
    totalSessionsCount: linkedSessions.length,
    lastUsedAt
  };
}

function getSessionGmUserIds(session) {
  const fromArray = Array.isArray(session.gmUserIds) ? session.gmUserIds.filter((item) => typeof item === 'string') : [];
  if (fromArray.length > 0) {
    return Array.from(new Set(fromArray));
  }

  const fromParticipants = (session.participants || [])
    .filter((participant) => participant.role === 'gm' && typeof participant.userId === 'string')
    .map((participant) => participant.userId);
  if (fromParticipants.length > 0) {
    return Array.from(new Set(fromParticipants));
  }

  return session.gmUserId ? [session.gmUserId] : [];
}

function isSessionOwner(session, userId) {
  if (!userId) {
    return false;
  }
  const ownerId = session.ownerUserId || session.gmUserId;
  return ownerId === userId;
}

function canManageSession(session, user) {
  if (user.roles.includes('admin')) {
    return true;
  }

  return isSessionOwner(session, user.id) || getSessionGmUserIds(session).includes(user.id);
}

async function sendVerificationEmail(user, token) {
  const verifyUrl = `${APP_BASE_URL.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;
  const apiVerifyUrl = `${API_BASE_URL.replace(/\/$/, '')}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to: user.email,
    subject: 'NexusForge - Vérification de votre email',
    text: `Bonjour ${user.nickname},\n\nValidez votre email: ${verifyUrl}\n\nLien API direct (debug): ${apiVerifyUrl}\n\nCe lien expire dans 24h.`,
    html: `<p>Bonjour ${user.nickname},</p><p>Validez votre email: <a href="${verifyUrl}">${verifyUrl}</a></p><p>Lien API direct (debug): <a href="${apiVerifyUrl}">${apiVerifyUrl}</a></p><p>Ce lien expire dans 24h.</p>`
  });
}

async function sendResetPasswordEmail(user, token) {
  const resetUrl = `${APP_BASE_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

  await sendEmail({
    to: user.email,
    subject: 'NexusForge - Réinitialisation mot de passe',
    text: `Bonjour ${user.nickname},\n\nRéinitialisez votre mot de passe ici: ${resetUrl}\n\nCe lien expire dans 1h.`,
    html: `<p>Bonjour ${user.nickname},</p><p>Réinitialisez votre mot de passe ici: <a href="${resetUrl}">${resetUrl}</a></p><p>Ce lien expire dans 1h.</p>`
  });
}

function seedAdminAccount() {
  const adminId = 'user-admin-root';
  const passwordHash = bcrypt.hashSync(ROOT_ADMIN_PASSWORD, 12);

  const existing = usersByEmail.get(ROOT_ADMIN_EMAIL);
  if (existing) {
    const user = users.get(existing);
    user.roles = ['admin', 'gm', 'player'];
    user.approvalStatus = 'approved';
    user.isEmailVerified = true;
    user.isProtectedRootAdmin = true;
    user.nickname = ROOT_ADMIN_NICKNAME;
    user.firstName = ROOT_ADMIN_FIRST_NAME;
    user.lastName = ROOT_ADMIN_LAST_NAME;
    user.displayName = `${ROOT_ADMIN_NICKNAME} (${ROOT_ADMIN_FIRST_NAME} ${ROOT_ADMIN_LAST_NAME})`;
    return user;
  }

  const user = {
    id: adminId,
    firstName: ROOT_ADMIN_FIRST_NAME,
    lastName: ROOT_ADMIN_LAST_NAME,
    nickname: ROOT_ADMIN_NICKNAME,
    displayName: `${ROOT_ADMIN_NICKNAME} (${ROOT_ADMIN_FIRST_NAME} ${ROOT_ADMIN_LAST_NAME})`,
    email: ROOT_ADMIN_EMAIL,
    passwordHash,
    roles: ['admin', 'gm', 'player'],
    isEmailVerified: true,
    approvalStatus: 'approved',
    isProtectedRootAdmin: true,
    totpEnabled: false,
    totpSecret: null,
    pendingTotpSecret: null,
    failedLoginCount: 0,
    lockoutLevel: 0,
    lockedUntil: null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  users.set(user.id, user);
  usersByEmail.set(user.email, user.id);
  return user;
}

function seedData() {
  const admin = seedAdminAccount();

  const gmUserId = 'user-gm-1';
  if (!users.has(gmUserId)) {
    const gm = {
      id: gmUserId,
      firstName: 'MJ',
      lastName: 'Demo',
      nickname: 'MJDemo',
      displayName: 'MJDemo (MJ Demo)',
      email: 'gm@demo.local',
      passwordHash: bcrypt.hashSync('Demo1234!', 10),
      roles: ['gm', 'player'],
      isEmailVerified: true,
      approvalStatus: 'approved',
      isProtectedRootAdmin: false,
      totpEnabled: false,
      totpSecret: null,
      pendingTotpSecret: null,
      failedLoginCount: 0,
      lockoutLevel: 0,
      lockedUntil: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    users.set(gm.id, gm);
    usersByEmail.set(gm.email, gm.id);
  }

  const playerUserId = 'user-player-1';
  if (!users.has(playerUserId)) {
    const player = {
      id: playerUserId,
      firstName: 'Joueur',
      lastName: 'Demo',
      nickname: 'PlayerDemo',
      displayName: 'PlayerDemo (Joueur Demo)',
      email: 'player@demo.local',
      passwordHash: bcrypt.hashSync('Demo1234!', 10),
      roles: ['player'],
      isEmailVerified: true,
      approvalStatus: 'approved',
      isProtectedRootAdmin: false,
      totpEnabled: false,
      totpSecret: null,
      pendingTotpSecret: null,
      failedLoginCount: 0,
      lockoutLevel: 0,
      lockedUntil: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    users.set(player.id, player);
    usersByEmail.set(player.email, player.id);
  }

  const systemOne = {
    id: 'sys-steamshadows-reference',
    name: 'SteamShadows Core',
    version: '1.0.0',
    ownerUserId: admin.id,
    visibility: 'public',
    tags: ['steampunk', 'steamshadows', 'd20', 'core'],
    rulesProgram: [],
    referenceSheets: [
      {
        id: 'template-steamshadows-core-pj',
        name: 'SteamShadows - PJ',
        groups: [
          { id: 'secondaires', label: 'Valeurs secondaires', layout: 'grid' },
          { id: 'profil', label: 'Profil', layout: 'grid' }
        ],
        fields: [
          { id: 'pv', label: 'Points de vie', type: 'resource', value: 16, max: 24, groupId: 'secondaires', isPrimary: true },
          { id: 'initiative', label: 'Initiative', type: 'number', value: 2, groupId: 'secondaires', isPrimary: true },
          { id: 'attaque', label: 'Attaque', type: 'number', value: 2, groupId: 'profil' }
        ],
        actions: [{ id: 'ss-action-attaque', label: 'Attaque', rollFormula: '1d20 + attaque' }]
      }
    ],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const systemTwo = {
    id: 'sys-neonops',
    name: 'Neon Ops',
    version: '0.1.0',
    ownerUserId: gmUserId,
    visibility: 'public',
    tags: ['cyberpunk'],
    rulesProgram: [],
    referenceSheets: [
      {
        id: 'template-neonops-runner',
        name: 'Neon Ops - Runner',
        groups: [{ id: 'core', label: 'Core', layout: 'grid' }],
        fields: [
          { id: 'hp', label: 'HP', type: 'resource', value: 12, max: 12, groupId: 'core', isPrimary: true },
          { id: 'hack', label: 'Hack', type: 'number', value: 4, groupId: 'core' }
        ],
        actions: [{ id: 'hack-roll', label: 'Hack', rollFormula: '1d10 + hack' }]
      }
    ],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  systems.set(systemOne.id, systemOne);
  systems.set(systemTwo.id, systemTwo);

  const sessionOne = {
    id: 'session-1',
    systemId: systemOne.id,
    name: 'La Tour Oubliee',
    description: 'Exploration et intrigue',
    ownerUserId: admin.id,
    gmUserId: admin.id,
    gmUserIds: [admin.id],
    state: 'running',
    participants: [
      { userId: admin.id, role: 'gm', isConnected: true },
      { userId: playerUserId, role: 'player', isConnected: true }
    ],
    initiative: {
      round: 0,
      turnIndex: 0,
      isInCombat: false,
      entries: []
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archivedAt: null
  };

  const sessionTwo = {
    id: 'session-2',
    systemId: systemTwo.id,
    name: 'Neon Ashes',
    description: 'Operation de recuperation',
    ownerUserId: gmUserId,
    gmUserId: gmUserId,
    gmUserIds: [gmUserId],
    state: 'planned',
    participants: [
      { userId: gmUserId, role: 'gm', isConnected: false },
      { userId: playerUserId, role: 'player', isConnected: false }
    ],
    initiative: {
      round: 0,
      turnIndex: 0,
      isInCombat: false,
      entries: []
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archivedAt: null
  };

  sessions.set(sessionOne.id, sessionOne);
  sessions.set(sessionTwo.id, sessionTwo);
}

seedData();

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'nexusforge-backend', time: nowIso() });
});

app.post('/api/auth/register', async (req, res) => {
  const body = req.body || {};
  const firstName = String(body.firstName || '').trim();
  const lastName = String(body.lastName || '').trim();
  const nickname = String(body.nickname || '').trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');

  if (!firstName || !lastName || !nickname || !email || !password) {
    return error(res, 400, 'INVALID_REGISTRATION_PAYLOAD', 'firstName, lastName, nickname, email and password are required');
  }

  if (password.length < 10) {
    return error(res, 400, 'WEAK_PASSWORD', 'Password must contain at least 10 characters');
  }

  if (usersByEmail.has(email)) {
    return error(res, 409, 'EMAIL_ALREADY_REGISTERED', 'Email already registered');
  }

  const user = {
    id: makeId('user'),
    firstName,
    lastName,
    nickname,
    displayName: `${nickname} (${firstName} ${lastName})`,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    roles: ['player'],
    isEmailVerified: false,
    approvalStatus: 'pending',
    isProtectedRootAdmin: false,
    totpEnabled: false,
    totpSecret: null,
    pendingTotpSecret: null,
    failedLoginCount: 0,
    lockoutLevel: 0,
    lockedUntil: null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  users.set(user.id, user);
  usersByEmail.set(user.email, user.id);

  const verificationToken = makeToken();
  emailVerificationTokens.set(verificationToken, {
    userId: user.id,
    expiresAt: nowMs() + EMAIL_TOKEN_TTL_MS
  });

  await sendVerificationEmail(user, verificationToken);

  return res.status(201).json({
    status: 'pending_email_verification',
    message: 'Account created. Verify your email, then wait for admin approval.'
  });
});

app.post('/api/auth/resend-verification', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return error(res, 400, 'INVALID_EMAIL', 'Email is required');
  }

  const userId = usersByEmail.get(email);
  const user = userId ? users.get(userId) : null;
  if (!user) {
    return res.status(200).json({ status: 'ok' });
  }

  if (user.isEmailVerified) {
    return res.status(200).json({ status: 'already_verified' });
  }

  const verificationToken = makeToken();
  emailVerificationTokens.set(verificationToken, {
    userId: user.id,
    expiresAt: nowMs() + EMAIL_TOKEN_TTL_MS
  });

  await sendVerificationEmail(user, verificationToken);
  return res.status(200).json({ status: 'sent' });
});

function applyVerifyToken(token) {
  const payload = emailVerificationTokens.get(token);
  if (!payload) {
    return { ok: false, code: 'INVALID_VERIFICATION_TOKEN', message: 'Token invalid' };
  }

  if (payload.expiresAt < nowMs()) {
    emailVerificationTokens.delete(token);
    return { ok: false, code: 'EXPIRED_VERIFICATION_TOKEN', message: 'Token expired' };
  }

  const user = users.get(payload.userId);
  if (!user) {
    emailVerificationTokens.delete(token);
    return { ok: false, code: 'USER_NOT_FOUND', message: 'User not found' };
  }

  user.isEmailVerified = true;
  user.updatedAt = nowIso();
  emailVerificationTokens.delete(token);
  return { ok: true, user };
}

app.post('/api/auth/verify-email', (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!token) {
    return error(res, 400, 'INVALID_VERIFICATION_TOKEN', 'Token is required');
  }

  const result = applyVerifyToken(token);
  if (!result.ok) {
    return error(res, 400, result.code, result.message);
  }

  return res.status(200).json({
    status: 'verified',
    approvalStatus: result.user.approvalStatus
  });
});

app.get('/api/auth/verify-email', (req, res) => {
  const token = String(req.query?.token || '').trim();
  if (!token) {
    return error(res, 400, 'INVALID_VERIFICATION_TOKEN', 'Token is required');
  }

  const result = applyVerifyToken(token);
  if (!result.ok) {
    return error(res, 400, result.code, result.message);
  }

  return res.status(200).json({
    status: 'verified',
    approvalStatus: result.user.approvalStatus
  });
});

app.post('/api/auth/login', async (req, res) => {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const password = String(body.password || '');
  const totpCode = body.totpCode ? String(body.totpCode).trim() : '';
  const challengeToken = body.challengeToken ? String(body.challengeToken).trim() : '';

  if (!email || !password) {
    return error(res, 400, 'INVALID_CREDENTIALS', 'Email and password are required');
  }

  const userId = usersByEmail.get(email);
  const user = userId ? users.get(userId) : null;

  if (!user) {
    return error(res, 401, 'INVALID_CREDENTIALS', 'Invalid credentials');
  }

  const lock = getLockInfo(user);
  if (lock.isLocked) {
    return error(res, 423, 'ACCOUNT_LOCKED', 'Account temporarily locked after failed attempts', {
      retryAfterSeconds: Math.ceil(lock.remainingMs / 1000)
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    applyFailedLogin(user);
    user.updatedAt = nowIso();
    return error(res, 401, 'INVALID_CREDENTIALS', 'Invalid credentials');
  }

  if (!user.isEmailVerified) {
    return error(res, 403, 'EMAIL_NOT_VERIFIED', 'Verify your email before login');
  }

  if (user.approvalStatus !== 'approved') {
    return error(res, 403, 'ACCOUNT_PENDING_APPROVAL', 'Your account is waiting for admin approval');
  }

  if (user.totpEnabled) {
    if (!totpCode) {
      const token = makeToken();
      twoFactorChallenges.set(token, {
        userId: user.id,
        expiresAt: nowMs() + TWO_FACTOR_CHALLENGE_TTL_MS
      });
      return res.status(200).json({
        requiresTwoFactor: true,
        challengeToken: token,
        methods: ['totp']
      });
    }

    const challenge = twoFactorChallenges.get(challengeToken);
    if (!challenge || challenge.userId !== user.id || challenge.expiresAt < nowMs()) {
      return error(res, 401, 'INVALID_2FA_CHALLENGE', 'Two-factor challenge expired or invalid');
    }

    if (!verifyTotpCode(user.totpSecret, totpCode)) {
      return error(res, 401, 'INVALID_2FA_CODE', 'Invalid two-factor code');
    }

    twoFactorChallenges.delete(challengeToken);
  }

  clearLoginFailures(user);
  user.updatedAt = nowIso();

  const { token, refreshToken } = issueTokens(user);
  return res.status(200).json({ token, refreshToken, user: publicUser(user) });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return error(res, 401, 'REFRESH_TOKEN_REVOKED', 'Refresh token is invalid or revoked');
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = users.get(payload.sub);
    if (!user) {
      refreshTokens.delete(refreshToken);
      return error(res, 401, 'UNAUTHENTICATED', 'Unknown user');
    }

    refreshTokens.delete(refreshToken);
    const next = issueTokens(user);
    return res.status(200).json(next);
  } catch {
    refreshTokens.delete(refreshToken);
    return error(res, 401, 'UNAUTHENTICATED', 'Refresh token invalid');
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  return res.status(200).json({ user: publicUser(req.currentUser) });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }
  return res.status(204).send();
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return error(res, 400, 'INVALID_EMAIL', 'Email is required');
  }

  const userId = usersByEmail.get(email);
  const user = userId ? users.get(userId) : null;

  if (user && user.isEmailVerified) {
    const resetToken = makeToken();
    passwordResetTokens.set(resetToken, {
      userId: user.id,
      expiresAt: nowMs() + RESET_TOKEN_TTL_MS
    });
    await sendResetPasswordEmail(user, resetToken);
  }

  return res.status(200).json({
    status: 'ok',
    message: 'If this email exists, a reset link has been sent.'
  });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const nextPassword = String(req.body?.password || '');

  if (!token || !nextPassword) {
    return error(res, 400, 'INVALID_RESET_PAYLOAD', 'token and password are required');
  }

  if (nextPassword.length < 10) {
    return error(res, 400, 'WEAK_PASSWORD', 'Password must contain at least 10 characters');
  }

  const reset = passwordResetTokens.get(token);
  if (!reset) {
    return error(res, 400, 'INVALID_RESET_TOKEN', 'Invalid reset token');
  }

  if (reset.expiresAt < nowMs()) {
    passwordResetTokens.delete(token);
    return error(res, 400, 'EXPIRED_RESET_TOKEN', 'Reset token expired');
  }

  const user = users.get(reset.userId);
  if (!user) {
    passwordResetTokens.delete(token);
    return error(res, 404, 'USER_NOT_FOUND', 'User not found');
  }

  user.passwordHash = await bcrypt.hash(nextPassword, 12);
  user.updatedAt = nowIso();
  user.failedLoginCount = 0;
  user.lockedUntil = null;
  passwordResetTokens.delete(token);

  return res.status(200).json({ status: 'password_updated' });
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const nextPassword = String(req.body?.newPassword || '');

  if (!currentPassword || !nextPassword) {
    return error(res, 400, 'INVALID_PASSWORD_CHANGE_PAYLOAD', 'currentPassword and newPassword are required');
  }

  if (nextPassword.length < 10) {
    return error(res, 400, 'WEAK_PASSWORD', 'Password must contain at least 10 characters');
  }

  const user = req.currentUser;
  const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    return error(res, 401, 'INVALID_CREDENTIALS', 'Current password is incorrect');
  }

  user.passwordHash = await bcrypt.hash(nextPassword, 12);
  user.updatedAt = nowIso();
  return res.status(200).json({ status: 'password_updated' });
});

app.post('/api/auth/totp/setup', requireAuth, (req, res) => {
  const user = req.currentUser;
  const secret = authenticator.generateSecret();

  user.pendingTotpSecret = secret;
  user.updatedAt = nowIso();

  const issuer = 'NexusForge';
  const otpauthUrl = authenticator.keyuri(user.email, issuer, secret);

  return res.status(200).json({
    secret,
    otpauthUrl,
    recommended: true
  });
});

app.post('/api/auth/totp/enable', requireAuth, (req, res) => {
  const user = req.currentUser;
  const code = String(req.body?.code || '').trim();

  if (!user.pendingTotpSecret) {
    return error(res, 400, 'TOTP_SETUP_REQUIRED', 'Setup TOTP before enabling it');
  }

  if (!verifyTotpCode(user.pendingTotpSecret, code)) {
    return error(res, 400, 'INVALID_2FA_CODE', 'Invalid TOTP code');
  }

  user.totpSecret = user.pendingTotpSecret;
  user.pendingTotpSecret = null;
  user.totpEnabled = true;
  user.updatedAt = nowIso();

  return res.status(200).json({ status: 'totp_enabled' });
});

app.post('/api/auth/totp/disable', requireAuth, (req, res) => {
  const user = req.currentUser;
  const code = String(req.body?.code || '').trim();

  if (!user.totpEnabled || !user.totpSecret) {
    return error(res, 400, 'TOTP_NOT_ENABLED', 'TOTP is not enabled');
  }

  if (!verifyTotpCode(user.totpSecret, code)) {
    return error(res, 400, 'INVALID_2FA_CODE', 'Invalid TOTP code');
  }

  user.totpEnabled = false;
  user.totpSecret = null;
  user.pendingTotpSecret = null;
  user.updatedAt = nowIso();

  return res.status(200).json({ status: 'totp_disabled' });
});

app.get('/api/admin/users/pending', requireAuth, requireAdmin, (req, res) => {
  const items = [...users.values()]
    .filter((user) => user.isEmailVerified && user.approvalStatus === 'pending')
    .map(publicUser);
  return res.status(200).json({ items });
});

app.post('/api/admin/users/:userId/approve', requireAuth, requireAdmin, (req, res) => {
  const user = users.get(req.params.userId);
  if (!user) {
    return error(res, 404, 'USER_NOT_FOUND', 'User not found');
  }

  if (!user.isEmailVerified) {
    return error(res, 400, 'EMAIL_NOT_VERIFIED', 'User email is not verified yet');
  }

  let roles = Array.isArray(req.body?.roles) ? req.body.roles : ['player'];
  roles = roles.filter((role) => role === 'player' || role === 'gm' || role === 'admin');

  if (roles.length === 0) {
    roles = ['player'];
  }

  if (user.isProtectedRootAdmin) {
    return error(res, 403, 'ROOT_ADMIN_PROTECTED', 'Root admin cannot be modified or downgraded');
  }

  user.roles = Array.from(new Set(roles));
  user.approvalStatus = 'approved';
  user.updatedAt = nowIso();

  return res.status(200).json({ user: publicUser(user) });
});

app.get('/api/admin/systems/usage', requireAuth, requireAdmin, (req, res) => {
  const items = [...systems.values()].map((system) => ({
    ...clone(system),
    usage: getSystemUsage(system.id)
  }));
  return res.status(200).json({ items });
});

app.delete('/api/admin/systems/:systemId', requireAuth, requireAdmin, (req, res) => {
  const system = systems.get(req.params.systemId);
  if (!system) {
    return error(res, 404, 'SYSTEM_NOT_FOUND', 'System not found');
  }

  const replacementSystemId =
    typeof req.body?.replacementSystemId === 'string' && req.body.replacementSystemId.trim()
      ? req.body.replacementSystemId.trim()
      : 'sys-steamshadows-reference';
  if (!systems.has(replacementSystemId) || replacementSystemId === system.id) {
    return error(res, 400, 'SYSTEM_DELETE_INVALID_REPLACEMENT', 'Valid replacementSystemId is required');
  }

  const relatedSessions = [...sessions.values()].filter((session) => session.systemId === system.id);
  const now = nowIso();
  for (const session of relatedSessions) {
    sessions.set(session.id, {
      ...session,
      systemId: replacementSystemId,
      updatedAt: now
    });
  }

  systems.delete(system.id);
  return res.status(200).json({
    status: 'deleted',
    replacementSystemId,
    migratedSessionsCount: relatedSessions.length
  });
});

app.get('/api/sessions', requireAuth, (req, res) => {
  const currentUser = req.currentUser;
  const includeArchived = String(req.query?.includeArchived || 'false') === 'true';
  const items = [...sessions.values()].filter((session) => {
    if (!includeArchived && session.archivedAt) {
      return false;
    }
    if (currentUser.roles.includes('admin')) {
      return true;
    }
    return (session.participants || []).some((participant) => participant.userId === currentUser.id);
  });
  return res.status(200).json({ items: items.map(clone) });
});

app.post('/api/sessions', requireAuth, (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Nouvelle partie';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const systemId = typeof body.systemId === 'string' && body.systemId.trim() ? body.systemId.trim() : 'sys-steamshadows-reference';
  const requestedState = typeof body.state === 'string' ? body.state : 'planned';
  const state = requestedState === 'running' || requestedState === 'paused' || requestedState === 'finished' ? requestedState : 'planned';

  if (!systems.has(systemId)) {
    return error(res, 404, 'SYSTEM_NOT_FOUND', 'System not found');
  }

  const now = nowIso();
  const session = {
    id: makeId('session'),
    systemId,
    name,
    description,
    ownerUserId: req.currentUser.id,
    gmUserId: req.currentUser.id,
    gmUserIds: [req.currentUser.id],
    state,
    settings: body.settings && typeof body.settings === 'object' ? body.settings : clone(GENERIC_SESSION_SETTINGS),
    participants: [{ userId: req.currentUser.id, role: 'gm', isConnected: false }],
    initiative: {
      round: 0,
      turnIndex: 0,
      isInCombat: false,
      entries: []
    },
    createdAt: now,
    updatedAt: now,
    archivedAt: null
  };

  sessions.set(session.id, session);
  return res.status(201).json({ session: clone(session) });
});

app.get('/api/sessions/:sessionId', requireAuth, (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return error(res, 404, 'SESSION_NOT_FOUND', 'Session not found');
  }

  const currentUser = req.currentUser;
  const isAllowed =
    currentUser.roles.includes('admin') ||
    getSessionGmUserIds(session).includes(currentUser.id) ||
    (session.participants || []).some((participant) => participant.userId === currentUser.id);

  if (!isAllowed) {
    return error(res, 403, 'SESSION_ACCESS_FORBIDDEN', 'Forbidden');
  }

  return res.status(200).json({ session: clone(session) });
});

app.patch('/api/sessions/:sessionId', requireAuth, (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return error(res, 404, 'SESSION_NOT_FOUND', 'Session not found');
  }

  const currentUser = req.currentUser;
  if (!canManageSession(session, currentUser)) {
    return error(res, 403, 'SESSION_ACCESS_FORBIDDEN', 'Only GM/admin can edit session');
  }

  const patch = req.body || {};
  let nextParticipants = Array.isArray(patch.participants) ? patch.participants : session.participants || [];
  let nextGmUserIds = Array.isArray(patch.gmUserIds) ? patch.gmUserIds.filter((item) => typeof item === 'string') : getSessionGmUserIds(session);

  if (Array.isArray(patch.gmUserIds) && nextParticipants.length > 0) {
    nextParticipants = nextParticipants.map((participant) =>
      nextGmUserIds.includes(participant.userId) ? { ...participant, role: 'gm' } : participant
    );
  }

  if (Array.isArray(patch.participants)) {
    nextGmUserIds = Array.from(
      new Set(
        nextParticipants
          .filter((participant) => participant.role === 'gm' && typeof participant.userId === 'string')
          .map((participant) => participant.userId)
      )
    );
  }
  if (nextGmUserIds.length === 0) {
    nextGmUserIds = [session.gmUserId];
  }

  const nextOwnerUserId = typeof patch.ownerUserId === 'string' ? patch.ownerUserId : session.ownerUserId || session.gmUserId;
  if (nextOwnerUserId !== (session.ownerUserId || session.gmUserId) && !isSessionOwner(session, currentUser.id) && !currentUser.roles.includes('admin')) {
    return error(res, 403, 'SESSION_TRANSFER_FORBIDDEN', 'Only owner/admin can transfer ownership');
  }

  const next = {
    ...session,
    ...(typeof patch.name === 'string' ? { name: patch.name } : {}),
    ...(typeof patch.description === 'string' ? { description: patch.description } : {}),
    ...(typeof patch.state === 'string' ? { state: patch.state } : {}),
    ...(typeof patch.systemId === 'string' ? { systemId: patch.systemId } : {}),
    ownerUserId: nextOwnerUserId,
    gmUserId: nextGmUserIds[0],
    gmUserIds: nextGmUserIds,
    ...(patch.settings ? { settings: patch.settings } : {}),
    participants: nextParticipants,
    ...(typeof patch.archivedAt === 'string' || patch.archivedAt === null ? { archivedAt: patch.archivedAt } : {}),
    ...(patch.initiative ? { initiative: patch.initiative } : {}),
    updatedAt: nowIso()
  };

  sessions.set(next.id, next);
  return res.status(200).json({ session: clone(next) });
});

app.delete('/api/sessions/:sessionId', requireAuth, (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return error(res, 404, 'SESSION_NOT_FOUND', 'Session not found');
  }

  const isOwner = isSessionOwner(session, req.currentUser.id);
  if (!isOwner && !req.currentUser.roles.includes('admin')) {
    return error(res, 403, 'SESSION_DELETE_FORBIDDEN', 'Only owner/admin can delete this session');
  }

  sessions.delete(session.id);
  return res.status(204).send();
});

app.post('/api/sessions/:sessionId/archive', requireAuth, (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return error(res, 404, 'SESSION_NOT_FOUND', 'Session not found');
  }

  if (!canManageSession(session, req.currentUser)) {
    return error(res, 403, 'SESSION_ARCHIVE_FORBIDDEN', 'Only GM/admin can archive this session');
  }

  const next = {
    ...session,
    archivedAt: nowIso(),
    updatedAt: nowIso()
  };
  sessions.set(next.id, next);
  return res.status(200).json({ session: clone(next) });
});

app.post('/api/sessions/:sessionId/restore', requireAuth, (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return error(res, 404, 'SESSION_NOT_FOUND', 'Session not found');
  }

  if (!canManageSession(session, req.currentUser)) {
    return error(res, 403, 'SESSION_ARCHIVE_FORBIDDEN', 'Only GM/admin can restore this session');
  }

  const next = {
    ...session,
    archivedAt: null,
    updatedAt: nowIso()
  };
  sessions.set(next.id, next);
  return res.status(200).json({ session: clone(next) });
});

app.get('/api/systems', requireAuth, (req, res) => {
  const currentUser = req.currentUser;
  const items = [...systems.values()].filter((system) => canViewSystem(system, currentUser));
  return res.status(200).json({ items: items.map(clone) });
});

app.get('/api/systems/:systemId', requireAuth, (req, res) => {
  const system = systems.get(req.params.systemId);
  if (!system) {
    return error(res, 404, 'SYSTEM_NOT_FOUND', 'System not found');
  }

  if (!canViewSystem(system, req.currentUser)) {
    return error(res, 403, 'SYSTEM_ACCESS_FORBIDDEN', 'Forbidden');
  }

  return res.status(200).json({ system: clone(system) });
});

app.post('/api/systems', requireAuth, (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Nouveau systeme';
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  let rulesProgram = [];
  let rulesPresentation = undefined;
  let studioSchema = undefined;
  let referenceSheets = [];
  let forkedFromSystemId = undefined;
  let forkedFromSystemName = undefined;

  if (typeof body.templateFromSystemId === 'string') {
    const source = systems.get(body.templateFromSystemId);
    if (source && canViewSystem(source, req.currentUser)) {
      rulesProgram = clone(source.rulesProgram || []);
      rulesPresentation = source.rulesPresentation ? clone(source.rulesPresentation) : undefined;
      studioSchema = source.studioSchema ? clone(source.studioSchema) : undefined;
      referenceSheets = clone(source.referenceSheets || []);
      forkedFromSystemId = source.id;
      forkedFromSystemName = source.name;
    }
  }

  const system = {
    id: makeId('sys'),
    name,
    version: typeof body.version === 'string' ? body.version : '0.1.0',
    description,
    author: req.currentUser.displayName,
    ownerUserId: req.currentUser.id,
    visibility: body.visibility === 'public' ? 'public' : 'private',
    viewerUserIds: Array.isArray(body.viewerUserIds) ? body.viewerUserIds.filter((id) => typeof id === 'string') : [],
    editorUserIds: Array.isArray(body.editorUserIds) ? body.editorUserIds.filter((id) => typeof id === 'string') : [],
    tags: Array.isArray(body.tags) ? body.tags : ['custom'],
    rulesProgram: Array.isArray(body.rulesProgram) ? body.rulesProgram : rulesProgram,
    ...(body.rulesPresentation && typeof body.rulesPresentation === 'object'
      ? { rulesPresentation: body.rulesPresentation }
      : rulesPresentation
      ? { rulesPresentation }
      : {}),
    ...(body.studioSchema && typeof body.studioSchema === 'object'
      ? { studioSchema: body.studioSchema }
      : studioSchema
      ? { studioSchema }
      : {}),
    ...(forkedFromSystemId ? { forkedFromSystemId } : {}),
    ...(forkedFromSystemName ? { forkedFromSystemName } : {}),
    auditTrail: [
      {
        id: makeId('audit'),
        at: nowIso(),
        byUserId: req.currentUser.id,
        action: 'create',
        summary: 'Creation du systeme'
      }
    ],
    referenceSheets: Array.isArray(body.referenceSheets) ? body.referenceSheets : referenceSheets,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  systems.set(system.id, system);
  return res.status(201).json({ system: clone(system) });
});

app.patch('/api/systems/:systemId', requireAuth, (req, res) => {
  const system = systems.get(req.params.systemId);
  if (!system) {
    return error(res, 404, 'SYSTEM_NOT_FOUND', 'System not found');
  }

  if (!canEditSystem(system, req.currentUser)) {
    return error(res, 403, 'SYSTEM_EDIT_FORBIDDEN', 'Only owner/admin can edit this system');
  }

  const body = req.body || {};
  const nextVisibility =
    typeof body.visibility === 'string' ? (body.visibility === 'private' ? 'private' : 'public') : system.visibility;
  const next = {
    ...system,
    ...(typeof body.name === 'string' ? { name: body.name } : {}),
    ...(typeof body.description === 'string' ? { description: body.description } : {}),
    ...(typeof body.version === 'string' ? { version: body.version } : {}),
    visibility: nextVisibility,
    ...(Array.isArray(body.viewerUserIds)
      ? { viewerUserIds: body.viewerUserIds.filter((id) => typeof id === 'string') }
      : {}),
    ...(Array.isArray(body.editorUserIds)
      ? { editorUserIds: body.editorUserIds.filter((id) => typeof id === 'string') }
      : {}),
    ...(Array.isArray(body.tags) ? { tags: body.tags } : {}),
    ...(Array.isArray(body.rulesProgram) ? { rulesProgram: body.rulesProgram } : {}),
    ...(body.rulesPresentation && typeof body.rulesPresentation === 'object' ? { rulesPresentation: body.rulesPresentation } : {}),
    ...(body.studioSchema && typeof body.studioSchema === 'object' ? { studioSchema: body.studioSchema } : {}),
    ...(Array.isArray(body.referenceSheets) ? { referenceSheets: body.referenceSheets } : {}),
    auditTrail: appendSystemAudit(system, {
      byUserId: req.currentUser.id,
      action: 'update',
      summary: 'Mise a jour du systeme'
    }),
    updatedAt: nowIso()
  };

  systems.set(next.id, next);
  return res.status(200).json({ system: clone(next) });
});

app.post('/api/systems/:systemId/duplicate', requireAuth, (req, res) => {
  const source = systems.get(req.params.systemId);
  if (!source) {
    return error(res, 404, 'SYSTEM_NOT_FOUND', 'System not found');
  }

  if (!canViewSystem(source, req.currentUser)) {
    return error(res, 403, 'SYSTEM_ACCESS_FORBIDDEN', 'Forbidden');
  }

  const body = req.body || {};
  const duplicated = {
    ...clone(source),
    id: makeId('sys'),
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : `${source.name} (copie)`,
    description: typeof body.description === 'string' ? body.description : source.description || '',
    ownerUserId: req.currentUser.id,
    visibility: 'private',
    viewerUserIds: [],
    editorUserIds: [],
    forkedFromSystemId: source.id,
    forkedFromSystemName: source.name,
    auditTrail: [
      {
        id: makeId('audit'),
        at: nowIso(),
        byUserId: req.currentUser.id,
        action: 'duplicate',
        summary: `Fork depuis ${source.name}`
      }
    ],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  systems.set(duplicated.id, duplicated);
  return res.status(201).json({ system: clone(duplicated) });
});

app.post('/api/sessions/:sessionId/characters/from-template', requireAuth, (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  if (!session) {
    return error(res, 404, 'SESSION_NOT_FOUND', 'Session not found');
  }

  const body = req.body || {};
  const system = systems.get(body.systemId || session.systemId);
  if (!system) {
    return error(res, 404, 'SYSTEM_NOT_FOUND', 'System not found');
  }

  const template = (system.referenceSheets || []).find((sheet) => sheet.id === body.templateId);
  if (!template) {
    return error(res, 404, 'TEMPLATE_NOT_FOUND', 'Template not found');
  }

  const characterId = makeId('character');
  const character = {
    id: characterId,
    systemId: system.id,
    templateId: template.id,
    sessionId,
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : template.name,
    type: 'pc',
    ownerUserId: typeof body.ownerUserId === 'string' ? body.ownerUserId : req.currentUser.id,
    sheet: {
      ...clone(template),
      id: characterId,
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : template.name
    }
  };

  characters.set(character.id, character);
  return res.status(201).json({ character: clone(character) });
});

app.post('/api/sync/actions', requireAuth, (req, res) => {
  const body = req.body || {};

  if (body && body.payload && body.payload.__syncMode === 'conflict') {
    return res.status(200).json({
      status: 'conflict',
      reason: 'Conflit detecte cote serveur.',
      conflictFields: Array.isArray(body.payload.__conflictFields) ? body.payload.__conflictFields : ['payload'],
      conflictServerValues: body.payload.__serverValues || {}
    });
  }

  if (body && body.payload && body.payload.__syncMode === 'rejected') {
    return res.status(200).json({
      status: 'rejected',
      reason: 'Action rejetee cote serveur.'
    });
  }

  return res.status(200).json({ status: 'accepted' });
});

app.use((req, res) => {
  return error(res, 404, 'NOT_FOUND', 'Route not found');
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[nexusforge-backend] listening on port ${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[nexusforge-backend] smtp=${canSendEmails() ? 'enabled' : 'disabled'} rootAdmin=${ROOT_ADMIN_EMAIL}`);
});
