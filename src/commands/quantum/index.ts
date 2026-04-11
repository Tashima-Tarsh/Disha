import type { Command } from '../../commands.js'

const quantum = {
  type: 'local',
  name: 'quantum',
  aliases: ['qp', 'qphysics'],
  description: 'Quantum Physics Engine — simulate circuits, classify physics, explore space',
  argumentHint: '[status|simulate|classify|space]',
  supportsNonInteractive: true,
  load: () => import('./quantum.js'),
} satisfies Command

export default quantum
