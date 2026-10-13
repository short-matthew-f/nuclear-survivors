export const DURATION = 480;
export const OPERATORS = [
  {
    id: 'nomad',
    name: 'Nomad',
    role: 'THE SCAVENGER',
    icon: '⌖',
    color: '#d2ef93',
    description:
      'Reliable carbine. A second chance: regenerate 1 health every 5 seconds.',
    cost: 0,
    hp: 100,
    speed: 180,
    weapon: 'carbine',
  },
  {
    id: 'spark',
    name: 'Spark',
    role: 'THE ENGINEER',
    icon: 'ϟ',
    color: '#8ee7eb',
    description:
      'Starts with chain lightning. Faster cooldowns, lighter armor.',
    cost: 100,
    hp: 80,
    speed: 195,
    weapon: 'arc',
  },
  {
    id: 'bastion',
    name: 'Bastion',
    role: 'THE LAST GUARD',
    icon: '◈',
    color: '#f3c782',
    description:
      'Starts with an orbital saw. Heavy armor and a devastating shockwave.',
    cost: 180,
    hp: 140,
    speed: 165,
    weapon: 'orbit',
  },
];
export const ZONES = [
  {
    id: 'forest',
    name: 'Red Forest',
    label: 'SECTOR 04',
    subtitle: 'The trees remember.',
    color: '#c8e994',
    ground: '#222c20',
    detail: '#35432d',
    cost: 0,
    difficulty: 1,
  },
  {
    id: 'marsh',
    name: 'The Drowned',
    label: 'SECTOR 09',
    subtitle: 'Something moves beneath the water.',
    color: '#86dbd8',
    ground: '#172c2b',
    detail: '#294541',
    cost: 120,
    difficulty: 1.15,
  },
  {
    id: 'industrial',
    name: 'Dead Reactor',
    label: 'SECTOR 00',
    subtitle: 'The heart is still beating.',
    color: '#f1b881',
    ground: '#302821',
    detail: '#4c3d2e',
    cost: 220,
    difficulty: 1.3,
  },
];
export const WEAPONS = {
  carbine: {
    name: 'Rustline',
    icon: '⌁',
    color: '#f1db8a',
    description: 'Automatic ballistic rounds.',
  },
  arc: {
    name: 'Arc coil',
    icon: 'ϟ',
    color: '#88e6f1',
    description: 'Lightning jumps between nearby infected.',
  },
  orbit: {
    name: 'Orbital saw',
    icon: '◉',
    color: '#d7efd0',
    description: 'Rotating blades protect your perimeter.',
  },
  pulse: {
    name: 'Rad bloom',
    icon: '☢',
    color: '#c3f184',
    description: 'Periodic radiation bursts around you.',
  },
  mine: {
    name: 'Scorched earth',
    icon: '✦',
    color: '#f4b47e',
    description: 'Leave explosive charges in your wake.',
  },
};
Object.assign(WEAPONS, {
  scatter: {
    name: 'Cinder shotgun',
    icon: '⋔',
    color: '#ffb384',
    description: 'A close-range cone of heavy piercing pellets.',
  },
  drone: {
    name: 'Watchdog',
    icon: '✧',
    color: '#a6c9ff',
    description: 'Autonomous escorts fire at nearby threats.',
  },
});
export const EVOLUTIONS = {
  carbine: { mutation: 'pierce', name: 'Railstorm' },
  arc: { mutation: 'crit', name: 'Thunder God' },
  orbit: { mutation: 'armor', name: 'Death Halo' },
  pulse: { mutation: 'area', name: 'Supernova' },
  mine: { mutation: 'damage', name: 'Hellfire' },
  scatter: { mutation: 'multishot', name: 'Extinction' },
  drone: { mutation: 'rate', name: 'Wolfpack' },
};
export const DIFFICULTIES = [
  {
    id: 'scavenger',
    name: 'Scavenger',
    scale: 0.7,
    reward: 0.8,
    description:
      'A gentler first expedition. Enemies have 30% less health and damage.',
  },
  {
    id: 'survivor',
    name: 'Survivor',
    scale: 1,
    reward: 1,
    description: 'The intended field experience. Stay alert. Keep moving.',
  },
  {
    id: 'veteran',
    name: 'Veteran',
    scale: 1.4,
    reward: 1.5,
    description:
      '40% tougher enemies. 50% more salvage. Unlocks after extraction.',
  },
];
export const CHAPTERS = [
  {
    id: 'signal',
    goals: [{ kind: 'rescue', target: 1, label: 'Rescue a survivor' }],
    title: 'A voice in the static',
    zone: 'forest',
    difficulty: 'scavenger',
    reward: 100,
    briefing:
      'Bunker Six has heard a distress call from the Red Forest. Follow the signal. Extract alive and bring back proof that we are not alone.',
    debrief:
      'The signal was real. A survivor handed you a waterlogged map. It points toward the drowned settlements.',
  },
  {
    id: 'water',
    goals: [{ kind: 'relay', target: 1, label: 'Restore a relay' }],
    title: 'What the water kept',
    zone: 'marsh',
    difficulty: 'survivor',
    reward: 150,
    briefing:
      'The pumping station is gone, but its archive remains. Reach The Drowned and recover enough data to trace the contamination. Get home alive.',
    debrief:
      'Every sample bears the same reactor signature. This was no accident. The origin is still active.',
  },
  {
    id: 'heart',
    goals: [{ kind: 'boss', target: 3, label: 'Defeat three titans' }],
    title: 'A heart of uranium',
    zone: 'industrial',
    difficulty: 'survivor',
    reward: 200,
    briefing:
      'Go to Sector Zero. The reactor is feeding the infection. Survive its guardians and extract with the containment codes.',
    debrief:
      'Containment is holding. For the first time in years, the bunker lights stay on through the night. But the forest has changed.',
  },
  {
    id: 'return',
    goals: [{ kind: 'rescue', target: 2, label: 'Rescue two survivors' }],
    title: 'The forest answers',
    zone: 'forest',
    difficulty: 'veteran',
    reward: 250,
    briefing:
      'A stronger strain is spreading along the old supply road. Take what you have learned back into the Red Forest. This time it knows your name.',
    debrief:
      'The northern route is clear. Families leave the bunker for the first time. One final transmission arrives from Sector Zero.',
  },
  {
    id: 'sunrise',
    goals: [
      { kind: 'boss', target: 3, label: 'Defeat three titans' },
      { kind: 'relay', target: 1, label: 'Restore the grid relay' },
    ],
    title: 'One more sunrise',
    zone: 'industrial',
    difficulty: 'veteran',
    reward: 400,
    briefing:
      'The emergency grid is failing. One last journey to the reactor will secure power for every settlement. Make it home. They are waiting for you.',
    debrief:
      'You return at dawn. The gates open. Beyond them, a child is planting something in the soil. The world did not end. It is beginning again.',
  },
];
export const PERKS = [
  {
    id: 'none',
    name: 'Travel light',
    icon: '○',
    requirement: null,
    description: 'No field kit. Trust your instincts.',
  },
  {
    id: 'magnet',
    name: 'Survey kit',
    icon: '◎',
    requirement: 'hundred',
    description: '+60 pickup radius. Start with an extra reroll.',
  },
  {
    id: 'medic',
    name: 'Trauma kit',
    icon: '+',
    requirement: 'rescue',
    description: '+30 starting health. Medkits heal 60.',
  },
  {
    id: 'phoenix',
    name: 'Last light',
    icon: '✦',
    requirement: 'extract',
    description: 'Once per run, a lethal hit restores half your health.',
  },
  {
    id: 'hunter',
    name: 'Titan rounds',
    icon: '⌖',
    requirement: 'boss',
    description: '+25% damage against titans and elites.',
  },
];
export const FIELD_EVENTS = {
  rescue: {
    name: 'LOST SURVIVOR',
    icon: '+',
    color: '#91e8d2',
    instruction: 'Hold nearby to escort the survivor',
    duration: 12,
    reward: 35,
  },
  relay: {
    name: 'DORMANT RELAY',
    icon: 'ϟ',
    color: '#98c9ff',
    instruction: 'Hold nearby to restore the relay',
    duration: 10,
    reward: 30,
  },
  convoy: {
    name: 'GUARDED CONVOY',
    icon: '◈',
    color: '#f5bc80',
    instruction: 'Defeat its guards, then recover the cargo',
    duration: 6,
    reward: 50,
  },
};
export const UPGRADES = [
  {
    id: 'damage',
    name: 'Hot rounds',
    description: '+25% damage for every weapon.',
    icon: '↗',
    cap: 5,
    rarity: 'FIELD MOD',
  },
  {
    id: 'rate',
    name: 'Hair trigger',
    description: 'All weapons recharge 12% faster.',
    icon: 'ϟ',
    cap: 5,
    rarity: 'FIELD MOD',
  },
  {
    id: 'speed',
    name: 'Adrenal glands',
    description: '+18 movement speed. Stay ahead of the horde.',
    icon: '»',
    cap: 4,
    rarity: 'MUTATION',
  },
  {
    id: 'heal',
    name: 'Cell regeneration',
    description: '+20 maximum health. Restore 40 health.',
    icon: '+',
    cap: 5,
    rarity: 'MUTATION',
  },
  {
    id: 'magnet',
    name: 'Magnetic blood',
    description: '+45 pickup radius. Cores find their way home.',
    icon: '◎',
    cap: 4,
    rarity: 'MUTATION',
  },
  {
    id: 'multishot',
    name: 'Split chamber',
    description:
      'Carbine fires an extra projectile. Required for the shotgun evolution.',
    icon: '⋔',
    cap: 4,
    rarity: 'WEAPON MOD',
  },
  ...Object.entries(WEAPONS).map(([id, w]) => ({
    id,
    name: w.name,
    description: `${w.description} Unlock or improve this weapon.`,
    icon: w.icon,
    cap: 5,
    rarity: 'WEAPON',
  })),
  {
    id: 'armor',
    name: 'Lead skin',
    description: 'Reduce incoming damage by 2.',
    icon: '⬡',
    cap: 5,
    rarity: 'MUTATION',
  },
  {
    id: 'regen',
    name: 'Second heartbeat',
    description: 'Recover 0.6 health every second.',
    icon: '♡',
    cap: 4,
    rarity: 'MUTATION',
  },
  {
    id: 'crit',
    name: 'Deadeye',
    description: '+10% chance to deal double damage.',
    icon: '⌖',
    cap: 5,
    rarity: 'FIELD MOD',
  },
  {
    id: 'area',
    name: 'Unstable isotope',
    description: '+20% area and orbital reach.',
    icon: '◌',
    cap: 4,
    rarity: 'MUTATION',
  },
  {
    id: 'pierce',
    name: 'Depleted uranium',
    description: 'Carbine rounds pierce one more enemy.',
    icon: '➝',
    cap: 3,
    weapon: 'carbine',
    rarity: 'WEAPON MOD',
  },
  {
    id: 'dash',
    name: 'Ghost step',
    description: 'Dash cooldown reduced by 15%.',
    icon: '⤳',
    cap: 3,
    rarity: 'FIELD MOD',
  },
  {
    id: 'nova',
    name: 'Critical mass',
    description: 'Shockwave deals 40% more damage and recharges faster.',
    icon: '✺',
    cap: 3,
    rarity: 'FIELD MOD',
  },
  {
    id: 'xp',
    name: 'Rapid adaptation',
    description: 'Gain 20% more experience from cores.',
    icon: '∆',
    cap: 3,
    rarity: 'MUTATION',
  },
];
export const RESEARCH = [
  {
    id: 'vitality',
    name: 'Reinforced vitals',
    icon: '♡',
    description: '+10 starting health per rank.',
    cost: 40,
    cap: 5,
  },
  {
    id: 'power',
    name: 'Ballistics research',
    icon: '↗',
    description: '+8% starting damage per rank.',
    cost: 50,
    cap: 5,
  },
  {
    id: 'salvage',
    name: 'Salvage protocol',
    icon: '◎',
    description: '+15 starting pickup radius per rank.',
    cost: 30,
    cap: 5,
  },
  {
    id: 'recovery',
    name: 'Emergency supplies',
    icon: '+',
    description: '+0.15 health regeneration per second.',
    cost: 60,
    cap: 4,
  },
];
export const ENEMIES = {
  walker: {
    name: 'Hollow',
    hp: 30,
    speed: 64,
    radius: 12,
    damage: 10,
    xp: 1,
    color: '#92a767',
  },
  runner: {
    name: 'Stray',
    hp: 22,
    speed: 125,
    radius: 9,
    damage: 8,
    xp: 2,
    color: '#c9a674',
  },
  brute: {
    name: 'Bulwark',
    hp: 140,
    speed: 42,
    radius: 23,
    damage: 22,
    xp: 5,
    color: '#a98e65',
  },
  spitter: {
    name: 'Spore carrier',
    hp: 65,
    speed: 48,
    radius: 15,
    damage: 12,
    xp: 3,
    color: '#9bbfa3',
  },
  charger: {
    name: 'Ravager',
    hp: 100,
    speed: 68,
    radius: 16,
    damage: 18,
    xp: 4,
    color: '#cd8877',
  },
  splitter: {
    name: 'Brood',
    hp: 90,
    speed: 55,
    radius: 18,
    damage: 14,
    xp: 4,
    color: '#b09fc3',
  },
  boss: {
    name: 'The Groundskeeper',
    hp: 1800,
    speed: 43,
    radius: 43,
    damage: 28,
    xp: 35,
    color: '#d0b277',
  },
};
export const BOSS_NAMES = [
  'The Groundskeeper',
  'Mother of Spores',
  'The Reactor Heart',
];
export const ACHIEVEMENTS = [
  {
    id: 'first',
    name: 'First blood',
    description: 'Defeat your first infected.',
    reward: 20,
    test: (g) => g.kills >= 1,
  },
  {
    id: 'hundred',
    name: 'Pest control',
    description: 'Defeat 100 infected in one run.',
    reward: 50,
    test: (g) => g.kills >= 100,
  },
  {
    id: 'boss',
    name: 'Giant killer',
    description: 'Defeat a zone boss.',
    reward: 80,
    test: (g) => g.bossKills >= 1,
  },
  {
    id: 'arsenal',
    name: 'Walking armory',
    description: 'Carry four different weapons.',
    reward: 60,
    test: (g) => Object.keys(g.weapons).length >= 4,
  },
  {
    id: 'evolution',
    name: 'Beyond human',
    description: 'Evolve a weapon.',
    reward: 80,
    test: (g) => Object.values(g.weapons).some((w) => w.evolved),
  },
  {
    id: 'extract',
    name: 'Another sunrise',
    description: 'Extract alive.',
    reward: 120,
    test: (g) => g.state === 'won',
  },
];

ACHIEVEMENTS.push(
  {
    id: 'rescue',
    name: 'Nobody left behind',
    description: 'Complete a survivor rescue.',
    reward: 80,
    test: (g) => (g.rescues || 0) >= 1,
  },
  {
    id: 'events',
    name: 'A little hope',
    description: 'Complete three field events in one run.',
    reward: 100,
    test: (g) => (g.eventsCompleted || 0) >= 3,
  },
  {
    id: 'elite',
    name: 'Apex predator',
    description: 'Defeat five elites in one run.',
    reward: 80,
    test: (g) => (g.eliteKills || 0) >= 5,
  },
  {
    id: 'overtime',
    name: 'The long way home',
    description: 'Extract after committing to overtime.',
    reward: 150,
    test: (g) => g.state === 'won' && g.overtime === true,
  },
  {
    id: 'veteran',
    name: 'Against the odds',
    description: 'Extract on Veteran difficulty.',
    reward: 150,
    test: (g) => g.state === 'won' && g.difficulty?.id === 'veteran',
  },
  {
    id: 'thousand',
    name: 'Exclusion zone',
    description: 'Defeat 1,000 infected in one operation.',
    reward: 200,
    test: (g) => g.kills >= 1000,
  },
  {
    id: 'evolvedPair',
    name: 'Chain reaction',
    description: 'Carry two evolved weapons.',
    reward: 120,
    test: (g) => Object.values(g.weapons).filter((w) => w.evolved).length >= 2,
  },
);
export const LORE = {
  walker:
    'Once workers, neighbors, friends. The infection leaves only the instinct to follow warmth.',
  runner:
    'Feral strays adapted before we did. Fast, fragile, and never alone for long.',
  brute:
    'Concrete dust has fused with the skin. Keep your distance and bring sustained fire.',
  spitter:
    'Carries a living colony on its back. It retreats to launch spores from a distance.',
  charger:
    'The red strain trades judgment for speed. Watch its warning line and dash sideways.',
  splitter:
    'A nest pretending to be one creature. Its death is the beginning of the fight.',
  boss: 'Titans are the zone defending itself. Their attacks intensify as their health falls.',
};
