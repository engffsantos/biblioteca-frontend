
export enum ItemType {
  Summae = 'Summae',
  Tractatus = 'Tractatus',
  LabText = 'Lab Text',
}

export enum LabTextCategory {
  Magia = 'Magia',
  ItemEncantado = 'Item Encantado',
  ScriptIniciacao = 'Script de Iniciação',
}

export interface BaseItem {
  id: string;
  type: ItemType;
  title: string;
  author: string;
  language: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Summae extends BaseItem {
  type: ItemType.Summae;
  subject: string;
  level: number;
  quality: number;
}

export interface Tractatus extends BaseItem {
  type: ItemType.Tractatus;
  subject: string;
  quality: number;
}

export interface LabText extends BaseItem {
  type: ItemType.LabText;
  category: LabTextCategory;
  effect: string;
  level: number;
  labTotal: number;
}

export type LibraryItem = Summae | Tractatus | LabText;

export interface Ability {
  id: string;
  name: string;
  value: number;
  specialty?: string;
}

export interface VirtueFlaw {
  id: string;
  name: string;
  description: string;
  page?: number;
  isMajor: boolean;
}

export interface Character {
  name: string;
  house: string;
  age: number;
  characteristics: {
    int: number; per: number; str: number; sta: number;
    pre: number; com: number; dex: number; qik: number;
  };
  arts: {
    creo: number; intellego: number; muto: number; perdo: number; rego: number;
    animal: number; aquam: number; auram: number; corpus: number; herbam: number;
    ignem: number; imaginem: number; mentem: number; terram: number; vim: number;
  };
  abilities: Ability[];
  spells: string;
  virtues: VirtueFlaw[];
  flaws: VirtueFlaw[];
  notes: string;
}

export interface Database {
    library: LibraryItem[];
    akin: Character;
}