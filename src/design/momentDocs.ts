// ---------------------------------------------------------------------------
// DOCUMENTS DU MOMENT — what the French chaos actually needs.
// ---------------------------------------------------------------------------
// A wedding, a festival, a corporate show, a tour date: the paperwork is not
// « a PDF folder ». It is a chain of WHO signs, WHO is paid, UNDER WHICH STATUS,
// and WHAT the labour code / social bodies expect for that status.
//
// This module does three things, nothing invented beyond the catalogue:
//
//   1. Suggest document KINDS from a craft status + role (intermittent, auto-
//      entrepreneur, association, salarié, société…).
//   2. Name the AUTHOR and the RECIPIENT roles honestly (organiser, artist,
//      structure de portage, asso, régie…).
//   3. Leave a door for enrichment (SIRET, RNA, contacts) without ever filling
//      a field the product does not know — « À CONFIRMER » stays sacred.
//
// No second store. generateAdminDocument() remains the only writer of files.
// ---------------------------------------------------------------------------

export type CraftStatusId =
  | 'intermittent'
  | 'auto_entrepreneur'
  | 'salarie'
  | 'societe'
  | 'association'
  | 'portage'
  | 'benevole'
  | 'inconnu';

export interface DocKindDef {
  id: string;
  label: string;
  /** Short why — shown next to the picto, never a wall of text. */
  hint: string;
  /** Statuses for which this kind is first-class. Empty = always offered. */
  forStatus?: CraftStatusId[];
  /** Spectacle / technique world bias. */
  spectacle?: boolean;
}

/** Universal + French spectacle catalogue. Labels are what people actually say. */
export const DOC_KINDS: DocKindDef[] = [
  { id: 'Contrat', label: 'Contrat', hint: 'Engagement des deux parties', spectacle: true },
  { id: 'Devis', label: 'Devis', hint: 'Proposition chiffrée avant accord' },
  { id: 'Facture', label: 'Facture', hint: 'Demande de paiement' },
  { id: 'Avoir', label: 'Avoir', hint: 'Correction d’une facture' },
  { id: 'Fiche technique', label: 'Fiche technique', hint: 'Besoins plateau / son / lumière', spectacle: true },
  { id: 'Rider', label: 'Rider', hint: 'Conditions d’accueil artiste', spectacle: true },
  { id: 'Feuille de route', label: 'Feuille de route', hint: 'Horaires, lieux, contacts du jour', spectacle: true },
  { id: 'Call sheet', label: 'Call sheet', hint: 'Convocation minute par minute', spectacle: true },
  { id: 'Convention', label: 'Convention', hint: 'Partenariat, prêt de lieu, mécénat' },
  { id: 'Bon de commande', label: 'Bon de commande', hint: 'Ordre formel vers un prestataire' },
  { id: 'Bon de livraison', label: 'Bon de livraison', hint: 'Réception matériel / logistique' },
  { id: 'Attestation de présence', label: 'Attestation de présence', hint: 'Preuve d’intervention', spectacle: true },
  { id: 'Cachet / note de frais', label: 'Cachet / note de frais', hint: 'Rémunération + frais', spectacle: true, forStatus: ['intermittent', 'auto_entrepreneur', 'portage'] },
  { id: 'AEM / congés spectacles', label: 'AEM / congés spectacles', hint: 'Attestation employeur mensuelle', spectacle: true, forStatus: ['intermittent'] },
  { id: 'GUSO', label: 'GUSO', hint: 'Déclaration spectacle vivant occasionnel', spectacle: true, forStatus: ['intermittent', 'inconnu'] },
  { id: 'DUE / embauche', label: 'DUE / embauche', hint: 'Déclaration unique d’embauche', forStatus: ['salarie', 'intermittent'] },
  { id: 'Ordre de mission', label: 'Ordre de mission', hint: 'Déplacement pro, frais, horaires' },
  { id: 'Cession de droits', label: 'Cession de droits', hint: 'Image, musique, captation', spectacle: true },
  { id: 'Autorisation parentale', label: 'Autorisation parentale', hint: 'Mineur sur scène ou image' },
  { id: 'Assurance / respons.', label: 'Assurance', hint: 'RC pro, matériel, annulation' },
  { id: 'Reçu association', label: 'Reçu association', hint: 'Don, adhésion, subvention', forStatus: ['association'] },
  { id: 'PV / ordre du jour', label: 'PV / ordre du jour', hint: 'Réunion, AG, comité', forStatus: ['association', 'societe'] },
];

export const AUTHOR_ROLES = [
  'Organisation de l’événement',
  'Couple / porteur du projet',
  'Régie générale',
  'Production',
  'Association organisatrice',
  'Société de production',
  'Prestataire',
] as const;

export const RECIPIENT_KINDS = [
  'Artiste / intermittent',
  'Technicien',
  'Prestataire',
  'Structure de portage',
  'Association',
  'Lieu / salle',
  'Collectivité',
  'Autre',
] as const;

/** Map free-text craft.status (as users type it) onto a catalogue id. */
export function resolveCraftStatus(raw?: string | null): CraftStatusId {
  const s = (raw ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (!s.trim()) return 'inconnu';
  if (/intermitt|cachet|conges?\s*spect|guso|spectacle/.test(s)) return 'intermittent';
  if (/auto[- ]?entrepreneur|micro[- ]?entreprise|ae\b|indepandant|freelance/.test(s)) return 'auto_entrepreneur';
  if (/salarie|cdi|cdd|employe/.test(s)) return 'salarie';
  if (/portage|umbrella|coop[eé]rative/.test(s)) return 'portage';
  if (/asso|loi\s*1901|rna\b/.test(s)) return 'association';
  if (/sarl|sas|eurl|sa\b|societe|cie\b|company/.test(s)) return 'societe';
  if (/benevol/.test(s)) return 'benevole';
  return 'inconnu';
}

export function isSpectacleRole(role?: string | null): boolean {
  const r = (role ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  return /music|dj|sax|chant|danse|cirque|comed|acteur|regie|lumiere|sonoris|plateau|technic|artiste|groupe|orchestre|magie|clown|vj|video|machinist|costum|maquil/.test(r);
}

/** Document kinds offered for this person — status first, then spectacle bias. */
export function suggestedDocKinds(input: {
  status?: string | null;
  role?: string | null;
}): DocKindDef[] {
  const st = resolveCraftStatus(input.status);
  const spectacle = isSpectacleRole(input.role) || st === 'intermittent';
  return DOC_KINDS.filter((d) => {
    if (d.forStatus && d.forStatus.length && !d.forStatus.includes(st) && st !== 'inconnu') {
      // Still show universal kinds; hide only status-locked ones that don't match.
      return false;
    }
    if (d.spectacle && !spectacle && st === 'inconnu' && !input.role) return true;
    return true;
  });
}

/**
 * Honest public lookup stub.
 * Today: no network invention — returns a structured empty shell the UI can
 * fill when a real connector exists. Never fabricates a SIRET or an address.
 */
export interface PartyLookupResult {
  query: string;
  found: boolean;
  source: 'none' | 'project' | 'web';
  legalName?: string;
  siret?: string;
  rna?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  note: string;
}

export function lookupPartyInProject(
  query: string,
  project: {
    persons: { displayName: string; email?: string; phone?: string; craft?: { status?: string; role?: string } }[];
    vendors: { companyName: string; email?: string; phone?: string; websiteUrl?: string }[];
    locationName?: string;
  },
): PartyLookupResult {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { query, found: false, source: 'none', note: 'Saisissez un nom pour chercher.' };
  }
  const person = project.persons.find((p) => p.displayName.toLowerCase().includes(q));
  if (person) {
    return {
      query,
      found: true,
      source: 'project',
      legalName: person.displayName,
      email: person.email,
      phone: person.phone,
      note: 'Trouvé dans ce projet. Rien n’a été inventé hors de ce que vous avez saisi.',
    };
  }
  const vendor = project.vendors.find((v) => v.companyName.toLowerCase().includes(q));
  if (vendor) {
    return {
      query,
      found: true,
      source: 'project',
      legalName: vendor.companyName,
      email: vendor.email,
      phone: vendor.phone,
      website: vendor.websiteUrl,
      note: 'Prestataire déjà connu sur ce projet.',
    };
  }
  return {
    query,
    found: false,
    source: 'none',
    note: 'Pas encore dans le projet. Une recherche web (SIRET, RNA, contacts) pourra enrichir sans écraser vos saisies — non branchée ici pour ne rien inventer.',
  };
}
