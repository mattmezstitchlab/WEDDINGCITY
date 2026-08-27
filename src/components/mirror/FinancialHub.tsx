import React, { useMemo } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { typography } from '../../design/tokens';

export function FinancialHub() {
  const store = weddingStore;

  // Agrégation des données financières existantes
  const metrics = useMemo(() => {
    let totalCommitted = 0;
    let totalDeposits = 0;
    let totalPaid = 0;
    let byCategory: Record<string, { committed: number; deposits: number; paid: number }> = {};

    // 1. From phases (moments) budgets
    for (const phase of store.phases) {
      if (!phase.budget) continue;
      const amt = phase.budget.amount ?? 0;
      const dep = phase.budget.deposit ?? 0;
      totalCommitted += amt;
      totalDeposits += dep;
      if (phase.budget.paid) totalPaid += amt;

      const cat = 'Moment';
      if (!byCategory[cat]) byCategory[cat] = { committed: 0, deposits: 0, paid: 0 };
      byCategory[cat].committed += amt;
      byCategory[cat].deposits += dep;
      if (phase.budget.paid) byCategory[cat].paid += amt;
    }

    // 2. From documents (devis/factures)
    for (const doc of store.docs) {
      const amt = doc.amount ?? 0;
      const dep = doc.depositAmount ?? 0;
      totalCommitted += amt;
      totalDeposits += dep;
      if (doc.isPaid) totalPaid += amt;

      const cat = doc.category === 'facture' ? 'Factures' : doc.category === 'devis' ? 'Devis' : 'Documents';
      if (!byCategory[cat]) byCategory[cat] = { committed: 0, deposits: 0, paid: 0 };
      byCategory[cat].committed += amt;
      byCategory[cat].deposits += dep;
      if (doc.isPaid) byCategory[cat].paid += amt;
    }

    // 3. From tasks with cost
    for (const task of store.tasks) {
      const cost = task.cost ?? 0;
      if (cost > 0) {
        totalCommitted += cost;
        const cat = 'Tâches';
        if (!byCategory[cat]) byCategory[cat] = { committed: 0, deposits: 0, paid: 0 };
        byCategory[cat].committed += cost;
      }
    }

    const remaining = totalCommitted - totalPaid;
    const toPay = totalCommitted - (totalDeposits ?? 0);

    return {
      totalCommitted,
      totalDeposits,
      totalPaid,
      remaining,
      toPay,
      byCategory,
      docCount: store.docs.length,
    };
  }, [store.version]);

  // Documents groupés par catégorie
  const docsByCategory = useMemo(() => {
    const result: Record<string, typeof store.docs> = {};
    for (const doc of store.docs) {
      if (!result[doc.category]) result[doc.category] = [];
      result[doc.category].push(doc);
    }
    return result;
  }, [store.version]);

  const categoryLabels: Record<string, string> = {
    devis: 'Devis',
    facture: 'Factures',
    contrat: 'Contrats',
    plan_table: 'Plans de table',
    sms: 'Notes SMS',
    note: 'Notes',
    planning: 'Plannings',
  };

  return (
    <section id="financial-hub" style={sectionStyle} aria-label="Bureau Financier">
      <div style={containerStyle}>
        <h2 style={titleStyle}>BUREAU FINANCIER</h2>
        <p style={subtitleStyle}>Pilotage central de l'argent, des documents et des obligations administratives</p>

        {/* KPI Cards */}
        <div style={kpiGridStyle}>
          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Budget engagé</div>
            <div style={kpiValueStyle}>{metrics.totalCommitted.toLocaleString()}€</div>
          </div>
          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Acomptes</div>
            <div style={kpiValueStyle}>{metrics.totalDeposits.toLocaleString()}€</div>
          </div>
          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Payé</div>
            <div style={{ ...kpiValueStyle, color: '#26b576' }}>{metrics.totalPaid.toLocaleString()}€</div>
          </div>
          <div style={kpiCardStyle}>
            <div style={kpiLabelStyle}>Reste à payer</div>
            <div style={{ ...kpiValueStyle, color: '#f59e0b' }}>{metrics.remaining.toLocaleString()}€</div>
          </div>
        </div>

        {/* Documents section */}
        <div style={sectionDividerStyle}>
          <h3 style={h3Style}>DOCUMENTS & PAIEMENTS</h3>
          <p style={h3SubStyle}>{metrics.docCount} documents importés</p>
        </div>

        {Object.entries(docsByCategory).length === 0 ? (
          <div style={emptyStyle}>Aucun document importé pour l'instant</div>
        ) : (
          <div style={docGridStyle}>
            {Object.entries(docsByCategory).map(([cat, docs]) => (
              <div key={cat} style={docCategoryStyle}>
                <h4 style={docCatTitleStyle}>{categoryLabels[cat] || cat}</h4>
                <ul style={docListStyle}>
                  {docs.map((doc) => (
                    <li key={doc.id} style={docItemStyle}>
                      <div style={docItemTitleStyle}>{doc.title}</div>
                      <div style={docItemMetaStyle}>
                        {doc.amount && <span>{doc.amount}€</span>}
                        {doc.isPaid && <span style={{ color: '#26b576' }}>✓ Payé</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Budget breakdown by source */}
        <div style={sectionDividerStyle}>
          <h3 style={h3Style}>RÉPARTITION PAR SOURCE</h3>
        </div>

        <div style={breakdownStyle}>
          {Object.entries(metrics.byCategory).map(([cat, data]) => (
            <div key={cat} style={breakdownRowStyle}>
              <div style={breakdownLabelStyle}>{cat}</div>
              <div style={breakdownBarsStyle}>
                <div style={{ ...barStyle, width: `${(data.paid / metrics.totalCommitted) * 100 || 0}%`, background: '#26b576' }} title={`${data.paid}€ payé`} />
                <div style={{ ...barStyle, width: `${((data.committed - data.paid) / metrics.totalCommitted) * 100 || 0}%`, background: '#f59e0b' }} title={`${data.committed - data.paid}€ en attente`} />
              </div>
              <div style={breakdownAmtStyle}>{data.committed}€</div>
            </div>
          ))}
        </div>

        {/* Info messages */}
        <div style={infoBoxStyle}>
          <strong>Notes :</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: '#9ba1b0' }}>
            <li>Tous les budgets des moments sont agrégés automatiquement.</li>
            <li>Les documents importés (devis, factures) sont inclus dans les totaux.</li>
            <li>Les acomptes et soldes sont saisis sur chaque prestation.</li>
            <li>Aucune donnée n'est dupliquée : une information saisie une fois est réutilisée partout.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

const sectionStyle: React.CSSProperties = { padding: '44px clamp(18px, 6vw, 80px)', borderTop: '1px solid rgba(255,255,255,0.04)' };
const containerStyle: React.CSSProperties = { maxWidth: 1200, margin: '0 auto' };
const titleStyle: React.CSSProperties = { fontSize: 20, fontWeight: 800, margin: 0 };
const subtitleStyle: React.CSSProperties = { color: '#9ba1b0', marginTop: 8, fontSize: 14 };

const kpiGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 22 };
const kpiCardStyle: React.CSSProperties = { padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' };
const kpiLabelStyle: React.CSSProperties = { fontSize: 12, color: '#9ba1b0', letterSpacing: '0.06em' };
const kpiValueStyle: React.CSSProperties = { fontSize: 24, fontWeight: 700, marginTop: 8, color: '#f6f5f3' };

const sectionDividerStyle: React.CSSProperties = { marginTop: 32, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' };
const h3Style: React.CSSProperties = { margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '0.06em' };
const h3SubStyle: React.CSSProperties = { margin: '8px 0 0', fontSize: 12, color: '#9ba1b0' };

const docGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 14 };
const docCategoryStyle: React.CSSProperties = { padding: 12, background: 'rgba(255,255,255,0.01)', borderRadius: 8 };
const docCatTitleStyle: React.CSSProperties = { margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#dfe6ee' };
const docListStyle: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 };
const docItemStyle: React.CSSProperties = { padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 6, fontSize: 13 };
const docItemTitleStyle: React.CSSProperties = { fontWeight: 600, color: '#f6f5f3' };
const docItemMetaStyle: React.CSSProperties = { display: 'flex', gap: 8, marginTop: 4, fontSize: 11, color: '#9ba1b0' };

const emptyStyle: React.CSSProperties = { padding: 22, textAlign: 'center', color: '#9ba1b0', fontSize: 13 };

const breakdownStyle: React.CSSProperties = { marginTop: 14, display: 'grid', gap: 10 };
const breakdownRowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: 12, alignItems: 'center' };
const breakdownLabelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600 };
const breakdownBarsStyle: React.CSSProperties = { display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.03)' };
const barStyle: React.CSSProperties = { height: '100%', transition: 'width 0.3s' };
const breakdownAmtStyle: React.CSSProperties = { textAlign: 'right', fontSize: 13, color: '#9ba1b0' };

const infoBoxStyle: React.CSSProperties = { marginTop: 22, padding: 14, background: 'rgba(88, 166, 255, 0.04)', borderLeft: '3px solid rgba(88, 166, 255, 0.4)', borderRadius: 6, fontSize: 13 };

export default FinancialHub;
