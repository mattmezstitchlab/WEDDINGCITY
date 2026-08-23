import { useState } from 'react';
import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_SURFACE,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import {
  VERIFIED_PUBLIC_VENDORS,
  HONEYMOON_DESTINATIONS,
} from '../../game/researchEngine';
import { WebVendorResult, HoneymoonDestination } from '../../types/wedding';
import {
  IconWorld,
  IconDocument,
  IconCheck,
  IconSparkles,
  IconPlus,
  IconPhoto,
  IconDancefloor,
  IconFlorist,
  IconBanquet,
  IconManoir,
} from './Icons';

interface WorldResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  onClaimVendor?: (vendor: WebVendorResult) => void;
}

export function WorldResearchModal({
  isOpen,
  onClose,
  initialCategory = 'all',
  onClaimVendor,
}: WorldResearchModalProps) {
  const store = weddingStore;
  const project = store.currentProject;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedPriceLevel, setSelectedPriceLevel] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'vendors' | 'honeymoon'>('vendors');
  const [addedVendorIds, setAddedVendorIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const filteredVendors = VERIFIED_PUBLIC_VENDORS.filter((v) => {
    if (selectedCategory !== 'all' && v.category !== selectedCategory) return false;
    if (selectedPriceLevel !== 'all' && v.priceLevel !== selectedPriceLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = v.name.toLowerCase().includes(q);
      const matchServices = v.services.some((s) => s.toLowerCase().includes(q));
      const matchDesc = v.description.toLowerCase().includes(q);
      const matchLoc = v.location.toLowerCase().includes(q);
      if (!matchName && !matchServices && !matchDesc && !matchLoc) return false;
    }
    return true;
  });

  const handleAddVendorToWedding = (vendor: WebVendorResult) => {
    weddingStore.importChaosFile({
      name: `Fiche_Web_${vendor.name.replace(/\s/g, '_')}.pdf`,
      rawText: `PRESTATAIRE VÉRIFIÉ WEB : ${vendor.name}\nCatégorie : ${vendor.category}\nTarif indicatif : ${vendor.priceStartingFrom || 1200} €\nLocalisation : ${vendor.location}\nServices : ${vendor.services.join(', ')}\nContact : ${vendor.phone || 'Non renseigné'}\nSite web : ${vendor.websiteUrl}`,
      amount: vendor.priceStartingFrom || 1200,
      depositAmount: Math.round((vendor.priceStartingFrom || 1200) * 0.3),
    });

    setAddedVendorIds((prev) => new Set([...prev, vendor.id]));
    if (vendor.suggestedForPlaceId) {
      store.focusPlace(vendor.suggestedForPlaceId);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'traiteur': return <IconBanquet size={14} color={BRAND_ACCENT} />;
      case 'photographe': return <IconPhoto size={14} color={BRAND_ACCENT} />;
      case 'dj': return <IconDancefloor size={14} color={BRAND_ACCENT} />;
      case 'fleuriste': return <IconFlorist size={14} color={BRAND_ACCENT} />;
      case 'lieu': return <IconManoir size={14} color={BRAND_ACCENT} />;
      default: return <IconDocument size={14} color={BRAND_ACCENT} />;
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={brandBadgeStyle}>
              <IconWorld size={18} color={BRAND_ACCENT} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
                WORLD WEB RESEARCH ENGINE
              </div>
              <h2 style={{ margin: '3px 0 0', fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', color: BRAND_TEXT_PRIMARY }}>
                RECHERCHE CONTEXTUELLE DE PRESTATAIRES & VOYAGES
              </h2>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Search Input Bar */}
        <div style={searchBarContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <span style={{ fontSize: 14, color: BRAND_TEXT_MUTED }}>🔍</span>
            <input
              type="text"
              placeholder={`Rechercher un prestataire, spécialité ou service autour de ${project.locationName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={searchInputStyle}
            />
          </div>

          <div style={locationTagStyle}>
            📍 {project.locationName} & Île-de-France
          </div>
        </div>

        {/* View Switcher: Prestataires vs Voyage de Noces */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 8px' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setActiveTab('vendors')}
              style={tabSwitchBtnStyle(activeTab === 'vendors')}
            >
              Prestataires Réels ({filteredVendors.length})
            </button>
            <button
              onClick={() => setActiveTab('honeymoon')}
              style={tabSwitchBtnStyle(activeTab === 'honeymoon')}
            >
              ✈️ Voyage de Noces ({HONEYMOON_DESTINATIONS.length})
            </button>
          </div>

          <div style={{ fontSize: 10, color: BRAND_TEXT_MUTED }}>
            Source de vérité : Google Business API & Annuaires Certifiés
          </div>
        </div>

        {/* Category Filters when in Vendors Tab */}
        {activeTab === 'vendors' && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
            {[
              { id: 'all', label: 'Toutes Catégories' },
              { id: 'traiteur', label: '🍽️ Traiteurs' },
              { id: 'photographe', label: '📷 Photographes & Vidéo' },
              { id: 'dj', label: '🎧 DJ & Sonorisation' },
              { id: 'musique', label: '🎻 Musiciens Cérémonie' },
              { id: 'fleuriste', label: '🌸 Scénographie Florale' },
              { id: 'lieu', label: '🏰 Lieux & Domaines' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={categoryPillStyle(selectedCategory === cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Results Content */}
        {activeTab === 'vendors' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
            {filteredVendors.map((vendor) => {
              const isAdded = addedVendorIds.has(vendor.id);
              return (
                <div key={vendor.id} style={vendorCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={vendorIconBoxStyle}>
                        {getCategoryIcon(vendor.category)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>
                            {vendor.name}
                          </span>
                          {vendor.isClaimed && (
                            <span style={claimedBadgeStyle} title="Fiche certifiée par l'entreprise">
                              🛡️ REVENDIQUÉ
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: BRAND_TEXT_MUTED, marginTop: 1 }}>
                          ⭐ <b style={{ color: '#ffffff' }}>{vendor.rating}</b> ({vendor.reviewCount} avis) • 📍 {vendor.location} ({vendor.distanceKm} km)
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: BRAND_ACCENT }}>
                        {vendor.priceStartingFrom ? `Dès ${vendor.priceStartingFrom} €` : vendor.priceLevel}
                      </div>
                      <span style={sourceTagStyle}>Source : {vendor.source.split('&')[0]}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: 11, color: BRAND_TEXT_SECONDARY, margin: '8px 0', lineHeight: 1.4 }}>
                    {vendor.description}
                  </p>

                  {/* Services tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {vendor.services.map((s, idx) => (
                      <span key={idx} style={serviceTagStyle}>
                        • {s}
                      </span>
                    ))}
                  </div>

                  {/* Bottom Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: `1px solid ${BRAND_BORDER}` }}>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
                      {vendor.phone && (
                        <a href={`tel:${vendor.phone}`} style={{ color: BRAND_TEXT_SECONDARY, textDecoration: 'none' }}>
                          📞 {vendor.phone}
                        </a>
                      )}
                      <a href={vendor.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: BRAND_ACCENT, textDecoration: 'none', fontWeight: 600 }}>
                        🌐 Visiter le site web ↗
                      </a>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {!vendor.isClaimed && onClaimVendor && (
                        <button
                          onClick={() => onClaimVendor(vendor)}
                          style={claimBtnStyle}
                        >
                          Revendiquer cette fiche
                        </button>
                      )}

                      <button
                        onClick={() => handleAddVendorToWedding(vendor)}
                        style={addVendorActionBtnStyle(isAdded)}
                      >
                        {isAdded ? (
                          <>
                            <IconCheck size={12} color="#10b981" />
                            <span>Ajouté au Mariage</span>
                          </>
                        ) : (
                          <>
                            <IconPlus size={12} color="#08090d" />
                            <span>Ajouter à mon Mariage</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Honeymoon Destinations Grid */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxHeight: 380, overflowY: 'auto' }}>
            {HONEYMOON_DESTINATIONS.map((dest) => (
              <div key={dest.id} style={honeymoonCardStyle}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>
                  ✈️ {dest.title}
                </div>
                <div style={{ fontSize: 10, color: BRAND_ACCENT, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  Saison idéale : {dest.bestSeason} • {dest.flightDuration}
                </div>
                <div style={{ fontSize: 11, color: '#ffd700', margin: '4px 0', fontWeight: 600 }}>
                  Budget estimé : {dest.budgetRange}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                  {dest.highlights.map((h, idx) => (
                    <div key={idx} style={{ fontSize: 10.5, color: BRAND_TEXT_SECONDARY }}>
                      • {h}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 9, color: BRAND_TEXT_MUTED, marginTop: 8 }}>
                  Source : {dest.source}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 9, 13, 0.88)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 140,
  padding: 20,
};

const modalCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 820,
  maxHeight: '92vh',
  overflowY: 'auto',
  background: BRAND_SURFACE,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 22,
  padding: '24px 28px',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
  color: BRAND_TEXT_PRIMARY,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const brandBadgeStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 14,
  cursor: 'pointer',
};

const searchBarContainerStyle: React.CSSProperties = {
  marginTop: 14,
  background: 'rgba(0, 0, 0, 0.35)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '8px 12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  color: '#ffffff',
  fontSize: 13,
  outline: 'none',
  fontFamily: 'inherit',
};

const locationTagStyle: React.CSSProperties = {
  fontSize: 11,
  color: BRAND_TEXT_MUTED,
  background: 'rgba(255, 255, 255, 0.04)',
  padding: '4px 8px',
  borderRadius: 6,
  whiteSpace: 'nowrap',
};

const tabSwitchBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
  border: `1px solid ${active ? BRAND_ACCENT : 'transparent'}`,
  borderRadius: 6,
  padding: '5px 10px',
  color: active ? '#ffffff' : BRAND_TEXT_MUTED,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
});

const categoryPillStyle = (active: boolean): React.CSSProperties => ({
  background: active ? BRAND_ACCENT : 'rgba(255, 255, 255, 0.03)',
  color: active ? '#08090d' : BRAND_TEXT_SECONDARY,
  border: `1px solid ${active ? BRAND_ACCENT : BRAND_BORDER}`,
  borderRadius: 8,
  padding: '4px 10px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
});

const vendorCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 14,
  padding: '14px 16px',
};

const vendorIconBoxStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const claimedBadgeStyle: React.CSSProperties = {
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid #10b981',
  color: '#10b981',
  borderRadius: 4,
  padding: '1px 5px',
  fontSize: 8.5,
  fontWeight: 700,
  fontFamily: "'JetBrains Mono', monospace",
};

const sourceTagStyle: React.CSSProperties = {
  fontSize: 9,
  color: BRAND_TEXT_MUTED,
  fontFamily: "'JetBrains Mono', monospace",
};

const serviceTagStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 10,
  color: BRAND_TEXT_SECONDARY,
};

const claimBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '5px 9px',
  color: BRAND_TEXT_MUTED,
  fontSize: 10,
  cursor: 'pointer',
};

const addVendorActionBtnStyle = (isAdded: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: isAdded ? 'rgba(16, 185, 129, 0.15)' : '#ffffff',
  color: isAdded ? '#10b981' : '#08090d',
  border: `1px solid ${isAdded ? '#10b981' : '#ffffff'}`,
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 11,
  fontWeight: 700,
  cursor: isAdded ? 'default' : 'pointer',
});

const honeymoonCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 14,
  padding: '14px 16px',
};
