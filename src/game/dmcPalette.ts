import { DmcColor, DmcSymbol, DmcIdentity } from '../types/wedding';

// Curated Textile Palette inspired by DMC Color System
export const DMC_PALETTE: DmcColor[] = [
  { code: 'DMC 3852', name: 'Or Ambré d’Orient', hex: '#dfa338', family: 'doré' },
  { code: 'DMC 3865', name: 'Blanc Craie Hivernale', hex: '#f8fafc', family: 'neutre' },
  { code: 'DMC 738', name: 'Ivoire Lin Brut', hex: '#ece5d8', family: 'neutre' },
  { code: 'DMC 310', name: 'Noir Charbon Intense', hex: '#11141d', family: 'noir' },
  { code: 'DMC 930', name: 'Bleu Nuit Céleste', hex: '#1e293b', family: 'bleu' },
  { code: 'DMC 924', name: 'Bleu Pétrole Sombre', hex: '#2c3e50', family: 'bleu' },
  { code: 'DMC 3052', name: 'Vert Sauge d’Eucalyptus', hex: '#3a5335', family: 'vert' },
  { code: 'DMC 500', name: 'Vert Émeraude Profond', hex: '#1e382b', family: 'vert' },
  { code: 'DMC 3772', name: 'Terracotta Toscane', hex: '#7a4332', family: 'terracotta' },
  { code: 'DMC 3834', name: 'Prune Royale Impériale', hex: '#4a2444', family: 'pourpre' },
  { code: 'DMC 169', name: 'Gris Ardoise Minérale', hex: '#64748b', family: 'gris' },
  { code: 'DMC 415', name: 'Gris Perle Nacré', hex: '#94a3b8', family: 'gris' },
];

// Symbolic Glyphs Collection for DMC Identity
export const DMC_SYMBOLS: DmcSymbol[] = [
  { id: 'sym_diamond', name: 'Diamant d’Alliance', glyph: '◇', meaning: 'Clarté, engagement & éclat' },
  { id: 'sym_star', name: 'Étoile Céleste', glyph: '✦', meaning: 'Guidance, lumière & célébration' },
  { id: 'sym_botanical', name: 'Feuille Botanique', glyph: '🌿', meaning: 'Harmonie naturelle & croissance' },
  { id: 'sym_infinity', name: 'Infini & Alliance', glyph: '∞', meaning: 'Éternité, continuité & amour' },
  { id: 'sym_crown', name: 'Couronne d’Honneur', glyph: '👑', meaning: 'Noblesse, prestige & excellence' },
  { id: 'sym_spark', name: 'Éclat & Énergie', glyph: '⚡', meaning: 'Dynamisme, système nerveux & pulse' },
  { id: 'sym_music', name: 'Note Harmonique', glyph: '♫', meaning: 'Rythme, célébration & acoustique' },
  { id: 'sym_dove', name: 'Colombe de Paix', glyph: '🕊️', meaning: 'Sérénité, vœux & douceur' },
  { id: 'sym_fleur_de_lys', name: 'Fleur de Lys Royale', glyph: '⚜️', meaning: 'Héritage architectural & élégance' },
  { id: 'sym_heart', name: 'Cœur Éternel', glyph: '♡', meaning: 'Passion sincère & générosité' },
];

export const DEFAULT_DMC_IDENTITY: DmcIdentity = {
  dmcCode: 'DMC 3852',
  dmcName: 'Or Ambré d’Orient',
  dmcColor: '#dfa338',
  symbolId: 'sym_diamond',
  symbolGlyph: '◇',
  symbolName: 'Diamant d’Alliance',
  customBadgeText: 'Clara & Alexandre',
};
