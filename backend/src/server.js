import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();

const PORT = Number(process.env.PORT || 4000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-access-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: '2mb' }));

const refreshTokens = new Set();

const users = new Map();
const sessions = new Map();
const systems = new Map();
const characters = new Map();

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildUserFromEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const hasAdminRole = normalizedEmail.includes('admin');
  const hasGmRole = normalizedEmail.includes('gm') || hasAdminRole;
  const id = hasAdminRole ? 'user-admin-1' : hasGmRole ? 'user-gm-1' : 'user-player-1';

  const existing = users.get(id);
  if (existing) {
    return existing;
  }

  const user = {
    id,
    email: normalizedEmail,
    displayName: hasAdminRole ? 'Admin Mock' : hasGmRole ? 'MJ Mock' : 'Joueur Mock',
    roles: hasAdminRole ? ['admin', 'gm'] : hasGmRole ? ['gm'] : ['player'],
    createdAt: nowIso()
  };
  users.set(id, user);
  return user;
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

function parseBearer(req) {
  const header = req.headers.authorization || '';
  const [scheme, value] = header.split(' ');
  if (scheme !== 'Bearer' || !value) {
    return null;
  }
  return value;
}

function requireAuth(req, res, next) {
  const token = parseBearer(req);
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Missing token' } });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.currentUser = {
      id: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
      roles: Array.isArray(payload.roles) ? payload.roles : []
    };
    return next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid token' } });
  }
}

function isAdmin(user) {
  return user.roles.includes('admin');
}

function canViewSystem(system, user) {
  return system.visibility === 'public' || system.ownerUserId === user.id || isAdmin(user);
}

function canEditSystem(system, user) {
  return system.ownerUserId === user.id || isAdmin(user);
}

function seedData() {
  const systemOne = {
    id: 'sys-steamshadows-reference',
    name: 'SteamShadows Core',
    version: '1.0.0',
    ownerUserId: 'user-gm-1',
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
    ownerUserId: 'user-gm-2',
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
    gmUserId: 'user-gm-1',
    state: 'running',
    participants: [
      { userId: 'user-gm-1', role: 'gm', isConnected: true },
      { userId: 'user-player-1', role: 'player', isConnected: true }
    ],
    initiative: {
      round: 0,
      turnIndex: 0,
      isInCombat: false,
      entries: []
    },
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const sessionTwo = {
    id: 'session-2',
    systemId: systemTwo.id,
    name: 'Neon Ashes',
    description: 'Operation de recuperation',
    gmUserId: 'user-gm-2',
    state: 'planned',
    participants: [
      { userId: 'user-gm-2', role: 'gm', isConnected: false },
      { userId: 'user-player-1', role: 'player', isConnected: false }
    ],
    initiative: {
      round: 0,
      turnIndex: 0,
      isInCombat: false,
      entries: []
    },
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  sessions.set(sessionOne.id, sessionOne);
  sessions.set(sessionTwo.id, sessionTwo);
}

seedData();

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'nexusforge-backend', time: nowIso() });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email and password are required' } });
  }

  const user = buildUserFromEmail(email);
  const { token, refreshToken } = issueTokens(user);
  return res.status(200).json({ token, refreshToken, user });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: { code: 'REFRESH_TOKEN_REVOKED', message: 'Refresh token is invalid or revoked' } });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = users.get(payload.sub);
    if (!user) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Unknown user' } });
    }

    refreshTokens.delete(refreshToken);
    const next = issueTokens(user);
    return res.status(200).json(next);
  } catch {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Refresh token invalid' } });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = users.get(req.currentUser.id) || {
    id: req.currentUser.id,
    email: req.currentUser.email,
    displayName: req.currentUser.displayName,
    roles: req.currentUser.roles,
    createdAt: nowIso()
  };
  users.set(user.id, user);
  res.status(200).json({ user });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }
  res.status(204).send();
});

app.get('/api/sessions', requireAuth, (req, res) => {
  const currentUser = req.currentUser;
  const items = [...sessions.values()].filter((session) => {
    if (session.gmUserId === currentUser.id) {
      return true;
    }
    return (session.participants || []).some((participant) => participant.userId === currentUser.id);
  });
  res.status(200).json({ items: items.map(clone) });
});

app.get('/api/sessions/:sessionId', requireAuth, (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
  }

  const currentUser = req.currentUser;
  const isAllowed =
    session.gmUserId === currentUser.id || (session.participants || []).some((participant) => participant.userId === currentUser.id);

  if (!isAllowed && !isAdmin(currentUser)) {
    return res.status(403).json({ error: { code: 'SESSION_ACCESS_FORBIDDEN', message: 'Forbidden' } });
  }

  return res.status(200).json({ session: clone(session) });
});

app.patch('/api/sessions/:sessionId', requireAuth, (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
  }

  const currentUser = req.currentUser;
  if (session.gmUserId !== currentUser.id && !isAdmin(currentUser)) {
    return res.status(403).json({ error: { code: 'SESSION_ACCESS_FORBIDDEN', message: 'Only GM/admin can edit session' } });
  }

  const patch = req.body || {};
  const next = {
    ...session,
    ...(typeof patch.name === 'string' ? { name: patch.name } : {}),
    ...(typeof patch.description === 'string' ? { description: patch.description } : {}),
    ...(typeof patch.state === 'string' ? { state: patch.state } : {}),
    ...(typeof patch.systemId === 'string' ? { systemId: patch.systemId } : {}),
    ...(patch.settings ? { settings: patch.settings } : {}),
    ...(Array.isArray(patch.participants) ? { participants: patch.participants } : {}),
    ...(patch.initiative ? { initiative: patch.initiative } : {}),
    updatedAt: nowIso()
  };

  sessions.set(next.id, next);
  return res.status(200).json({ session: clone(next) });
});

app.get('/api/systems', requireAuth, (req, res) => {
  const currentUser = req.currentUser;
  const items = [...systems.values()].filter((system) => canViewSystem(system, currentUser));
  res.status(200).json({ items: items.map(clone) });
});

app.get('/api/systems/:systemId', requireAuth, (req, res) => {
  const system = systems.get(req.params.systemId);
  if (!system) {
    return res.status(404).json({ error: { code: 'SYSTEM_NOT_FOUND', message: 'System not found' } });
  }

  if (!canViewSystem(system, req.currentUser)) {
    return res.status(403).json({ error: { code: 'SYSTEM_ACCESS_FORBIDDEN', message: 'Forbidden' } });
  }

  return res.status(200).json({ system: clone(system) });
});

app.post('/api/systems', requireAuth, (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Nouveau systeme';

  let rulesProgram = [];
  let referenceSheets = [];

  if (typeof body.templateFromSystemId === 'string') {
    const source = systems.get(body.templateFromSystemId);
    if (source && canViewSystem(source, req.currentUser)) {
      rulesProgram = clone(source.rulesProgram || []);
      referenceSheets = clone(source.referenceSheets || []);
    }
  }

  const system = {
    id: makeId('sys'),
    name,
    version: typeof body.version === 'string' ? body.version : '0.1.0',
    author: req.currentUser.displayName,
    ownerUserId: req.currentUser.id,
    visibility: body.visibility === 'public' ? 'public' : 'private',
    tags: Array.isArray(body.tags) ? body.tags : ['custom'],
    rulesProgram: Array.isArray(body.rulesProgram) ? body.rulesProgram : rulesProgram,
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
    return res.status(404).json({ error: { code: 'SYSTEM_NOT_FOUND', message: 'System not found' } });
  }

  if (!canEditSystem(system, req.currentUser)) {
    return res.status(403).json({ error: { code: 'SYSTEM_EDIT_FORBIDDEN', message: 'Only owner/admin can edit this system' } });
  }

  const body = req.body || {};
  const next = {
    ...system,
    ...(typeof body.name === 'string' ? { name: body.name } : {}),
    ...(typeof body.version === 'string' ? { version: body.version } : {}),
    ...(typeof body.visibility === 'string' ? { visibility: body.visibility === 'private' ? 'private' : 'public' } : {}),
    ...(Array.isArray(body.tags) ? { tags: body.tags } : {}),
    ...(Array.isArray(body.rulesProgram) ? { rulesProgram: body.rulesProgram } : {}),
    ...(Array.isArray(body.referenceSheets) ? { referenceSheets: body.referenceSheets } : {}),
    updatedAt: nowIso()
  };

  systems.set(next.id, next);
  return res.status(200).json({ system: clone(next) });
});

app.post('/api/systems/:systemId/duplicate', requireAuth, (req, res) => {
  const source = systems.get(req.params.systemId);
  if (!source) {
    return res.status(404).json({ error: { code: 'SYSTEM_NOT_FOUND', message: 'System not found' } });
  }

  if (!canViewSystem(source, req.currentUser)) {
    return res.status(403).json({ error: { code: 'SYSTEM_ACCESS_FORBIDDEN', message: 'Forbidden' } });
  }

  const body = req.body || {};
  const duplicated = {
    ...clone(source),
    id: makeId('sys'),
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : `${source.name} (copie)`,
    ownerUserId: req.currentUser.id,
    visibility: 'private',
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
    return res.status(404).json({ error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
  }

  const body = req.body || {};
  const system = systems.get(body.systemId || session.systemId);
  if (!system) {
    return res.status(404).json({ error: { code: 'SYSTEM_NOT_FOUND', message: 'System not found' } });
  }

  const template = (system.referenceSheets || []).find((sheet) => sheet.id === body.templateId);
  if (!template) {
    return res.status(404).json({ error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' } });
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
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[nexusforge-backend] listening on port ${PORT}`);
});
