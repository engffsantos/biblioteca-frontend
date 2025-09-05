
import { Database, ItemType, LabTextCategory } from '../types.ts';

export const initialData: Database = {
  library: [
    {
      id: 'summae-1',
      type: ItemType.Summae,
      title: 'Parma Magica: A Defesa Completa',
      author: 'Guernicus',
      subject: 'Parma Magica',
      level: 15,
      quality: 12,
      language: 'Latim',
      notes: 'Um dos tomos mais importantes sobre a arte da defesa mágica. Essencial para qualquer magus.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'tractatus-1',
      type: ItemType.Tractatus,
      title: 'Intellego para Iniciantes',
      author: 'Anônimo',
      subject: 'Intellego',
      quality: 8,
      language: 'Latim',
      notes: 'Um tratado simples, mas eficaz, para entender os fundamentos da Arte de Intellego.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'labtext-1',
      type: ItemType.LabText,
      category: LabTextCategory.Magia,
      title: 'Bola de Fogo Abissal',
      author: 'Flamel',
      effect: 'Cria uma bola de fogo que causa +15 de dano.',
      level: 25,
      labTotal: 50,
      language: 'Latim',
      notes: 'Requer Vis de Ignem. Cuidado com o raio da explosão.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  akin: {
    name: 'AKIN',
    house: 'Ex Miscellanea',
    age: 35,
    characteristics: {
      int: 3, per: 1, str: 0, sta: 1,
      pre: 0, com: 0, dex: 2, qik: 1,
    },
    arts: {
      creo: 5, intellego: 7, muto: 2, perdo: 1, rego: 4,
      animal: 0, aquam: 3, auram: 0, corpus: 2, herbam: 6,
      ignem: 8, imaginem: 0, mentem: 1, terram: 0, vim: 5,
    },
    abilities: [
      { id: 'abil-1', name: 'Teoria da Magia', value: 3, specialty: 'laboratório' },
      { id: 'abil-2', name: 'Liderança', value: 1, specialty: 'magi' },
      { id: 'abil-3', name: 'Foco', value: 2, specialty: 'encantamentos' },
      { id: 'abil-4', name: 'Latim', value: 5, specialty: 'hermético' },
    ],
    spells: 'Pilar de Chamas (CrIg 20)\nOlho do Mago (InCo 15)',
    virtues: [
        { id: 'virt-1', name: 'Dom', description: 'Capacidade de usar magia.', isMajor: true, page: 32 },
        { id: 'virt-2', name: 'Mago Hermético', description: 'Membro da Ordem de Hermes.', isMajor: false, page: 33 },
        { id: 'virt-3', name: 'Afinidade Maior (Ignem)', description: 'Aprende Ignem com mais facilidade.', isMajor: true, page: 40 },
    ],
    flaws: [
        { id: 'flaw-1', name: 'Inimigo (Mago Tytalus)', description: 'Um mago Tytalus o persegue.', isMajor: true, page: 55 },
        { id: 'flaw-2', name: 'Cobiça (livros raros)', description: 'Desejo incontrolável por livros raros.', isMajor: false, page: 60 },
        { id: 'flaw-3', name: 'Otimista', description: 'Vê o lado bom das coisas, mesmo quando não deveria.', isMajor: false, page: 62 },
    ],
    notes: 'Akin é um estudioso focado nas artes do fogo. Ele busca conhecimento acima de tudo e tem uma rivalidade antiga com um mago da Casa Tytalus. Sua pesquisa atual envolve a criação de itens encantados permanentes.',
  },
};