/**
 * CV content mapped to the island's plazas. Each plaza has a dialog script
 * (a sequence of lines) and optional links. The "visited" flag tracks which
 * plazas the player has already seen.
 */

export interface CvLink {
  label: string;
  url: string;
}

export interface CvPlaza {
  /** Unique id. */
  id: string;
  /** Plaza display name shown in HUD and dialog header. */
  name: string;
  /** Short subtitle (one line). */
  subtitle: string;
  /** Where the plaza sits on the island, in world units. */
  position: { x: number; z: number };
  /** Dialog script: each entry is one "page" of dialog (the player advances). */
  script: string[];
  /** Optional links. */
  links?: CvLink[];
}

export const PLAZAS: CvPlaza[] = [
  {
    id: 'aurora',
    name: 'Plaza Aurora',
    subtitle: 'Sobre mí',
    position: { x: 22, z: -8 },
    script: [
      'Hola, soy David — "Polar" para los que me conocen.',
      'Full Stack desde Panamá, especializado en C#, Java y Python.',
      'Construyo sistemas de inventario, facturación y gestión de clientes.',
      'Me obsesionan los sistemas bien hechos y la IoT.',
    ],
  },
  {
    id: 'forja',
    name: 'Plaza Forja',
    subtitle: 'Experiencia',
    position: { x: -22, z: -14 },
    script: [
      '5+ años creando software para clientes reales.',
      'Desde 2020 trabajo como independiente (WOHTS): apps a medida, PHP, JS, contenedores.',
      'También doy clases particulares y mentorías de robótica y programación.',
      'Antes: desarrollador en Posper Panamá (2024-2025, .NET + SQL Server) y analista de transformación digital.',
    ],
    links: [
      { label: 'wohts.com', url: 'https://wohts.com' },
    ],
  },
  {
    id: 'biblioteca',
    name: 'Plaza Biblioteca',
    subtitle: 'Proyectos',
    position: { x: 0, z: 22 },
    script: [
      'Mis proyectos principales viven en GitHub.',
      'PolarTranslate: herramienta de traducción para mi flujo diario.',
      'ZPlage: proyecto personal que migré de la cuenta secundaria a la principal.',
      'Más cosas en el @dev-dmpp — pasa el cursor por cada libro del estante.',
    ],
    links: [
      { label: '@dev-dmpp', url: 'https://github.com/dev-dmpp' },
      { label: 'PolarTranslate', url: 'https://github.com/dev-dmpp/PolarTranslate' },
      { label: 'ZPlage', url: 'https://github.com/Polar1920/ZPlage' },
    ],
  },
  {
    id: 'herreria',
    name: 'Plaza Herrería',
    subtitle: 'Stack técnico',
    position: { x: -22, z: 14 },
    script: [
      'Lenguajes: C#, C++, Python, Java (Spring Boot), PHP, JavaScript, Node.js.',
      'Bases de datos: SQL Server, MariaDB, MongoDB, PostgreSQL.',
      'Infra: Docker, Podman, Git, Linux de servidor.',
      'Web: HTML5, CSS3, APIs REST.',
      'Hardware: robótica, SBCs, mantenimiento de equipos.',
      'Del silicio al backend, me gusta entender toda la pila.',
    ],
  },
  {
    id: 'torre',
    name: 'Plaza Torre',
    subtitle: 'Certificaciones',
    position: { x: 22, z: 16 },
    script: [
      '10+ certificaciones, sigo estudiando porque esto cambia cada semana.',
      'Web Design (Michigan, 2024) · Kubernetes (Banco General, 2024).',
      'Microsoft AI (2025) · Google IT Support (2024).',
      'Cisco Cybersecurity (2024) · EF SET English B2 (2025).',
      'Haz click en cada monolito para ver el detalle.',
    ],
  },
];

export const CONTACT_NPC = {
  id: 'contacto',
  name: 'El Mensajero',
  subtitle: 'Contacto',
  position: { x: 0, z: 0 },
  script: [
    '¡Escríbeme cuando quieras!',
    `📧 ${'dmpp1920@gmail.com'}`,
    `📱 +507 6608-5665 · San Cristóbal, Panamá`,
    'LinkedIn y GitHub en los links de abajo.',
  ],
  links: [
    { label: 'Email', url: 'mailto:dmpp1920@gmail.com' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/dmpp/' },
    { label: 'GitHub @dev-dmpp', url: 'https://github.com/dev-dmpp' },
  ],
};
