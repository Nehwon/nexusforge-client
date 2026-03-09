export type SupportedLocale = 'fr' | 'en' | 'de' | 'es';

export type TranslationKey = string;

type Messages = Record<SupportedLocale, Record<TranslationKey, string>>;

export const DEFAULT_LOCALE: SupportedLocale = 'fr';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['fr', 'en', 'de', 'es'];

export const messages: Messages = {
  fr: {
    'nav.brand': 'NexusForge',
    'nav.parties': 'Parties',
    'nav.rules': 'Règles',
    'nav.security': 'Sécurité',
    'nav.admin': 'Admin',
    'nav.login': 'Connexion',
    'nav.register': 'Inscription',
    'nav.logout': 'Déconnexion',
    'nav.language': 'Langue',
    'nav.dictionary': 'Dictionnaire',
    'parties.title': 'Parties',
    'parties.connectedAs': 'Connecté en tant que',
    'parties.create.title': 'Créer une nouvelle partie',
    'parties.create.name': 'Nom de la partie',
    'parties.create.description': 'Description',
    'parties.create.system': 'Système de règles',
    'parties.create.cta': 'Créer la partie',
    'parties.empty': 'Aucune partie disponible.',
    'parties.open': 'Ouvrir la partie',
    'parties.delete': 'Supprimer',
    'parties.loading': 'Chargement des parties...'
  },
  en: {
    'nav.brand': 'NexusForge',
    'nav.parties': 'Games',
    'nav.rules': 'Rules',
    'nav.security': 'Security',
    'nav.admin': 'Admin',
    'nav.login': 'Login',
    'nav.register': 'Sign up',
    'nav.logout': 'Logout',
    'nav.language': 'Language',
    'nav.dictionary': 'Dictionary',
    'parties.title': 'Games',
    'parties.connectedAs': 'Signed in as',
    'parties.create.title': 'Create a new game',
    'parties.create.name': 'Game name',
    'parties.create.description': 'Description',
    'parties.create.system': 'Rules system',
    'parties.create.cta': 'Create game',
    'parties.empty': 'No game available.',
    'parties.open': 'Open game',
    'parties.delete': 'Delete',
    'parties.loading': 'Loading games...'
  },
  de: {
    'nav.brand': 'NexusForge',
    'nav.parties': 'Partien',
    'nav.rules': 'Regeln',
    'nav.security': 'Sicherheit',
    'nav.admin': 'Admin',
    'nav.login': 'Anmelden',
    'nav.register': 'Registrieren',
    'nav.logout': 'Abmelden',
    'nav.language': 'Sprache',
    'nav.dictionary': 'Wörterbuch',
    'parties.title': 'Partien',
    'parties.connectedAs': 'Angemeldet als',
    'parties.create.title': 'Neue Partie erstellen',
    'parties.create.name': 'Partiename',
    'parties.create.description': 'Beschreibung',
    'parties.create.system': 'Regelsystem',
    'parties.create.cta': 'Partie erstellen',
    'parties.empty': 'Keine Partie verfügbar.',
    'parties.open': 'Partie öffnen',
    'parties.delete': 'Löschen',
    'parties.loading': 'Partien werden geladen...'
  },
  es: {
    'nav.brand': 'NexusForge',
    'nav.parties': 'Partidas',
    'nav.rules': 'Reglas',
    'nav.security': 'Seguridad',
    'nav.admin': 'Admin',
    'nav.login': 'Acceso',
    'nav.register': 'Registro',
    'nav.logout': 'Salir',
    'nav.language': 'Idioma',
    'nav.dictionary': 'Diccionario',
    'parties.title': 'Partidas',
    'parties.connectedAs': 'Conectado como',
    'parties.create.title': 'Crear una nueva partida',
    'parties.create.name': 'Nombre de la partida',
    'parties.create.description': 'Descripción',
    'parties.create.system': 'Sistema de reglas',
    'parties.create.cta': 'Crear partida',
    'parties.empty': 'No hay partidas disponibles.',
    'parties.open': 'Abrir partida',
    'parties.delete': 'Eliminar',
    'parties.loading': 'Cargando partidas...'
  }
};
