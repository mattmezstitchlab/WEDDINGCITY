/**
 * SECTION 11: GÉNÉALOGIE Page Component
 * 
 * Project genealogy showing:
 * - 30+ projects and their relationships
 * - Evolution of ideas across projects
 * - Abandoned branches and consolidations
 * - Convergence toward AIME
 * - Visual timeline of development
 */

import React, { useState } from 'react';
import './genealogie.css';

interface ProjectNode {
  id: string;
  name: string;
  status: 'active' | 'archived' | 'prototype' | 'research' | 'merged';
  phase: number;
  description: string;
  contribution: string;
  relatedProjects: string[];
  keyInsights: string[];
  dateRange: string;
}

const genealogyProjects: ProjectNode[] = [
  // Phase 1: Discovery
  {
    id: 'weddingcity-v1',
    name: 'Wedding City v1',
    status: 'archived',
    phase: 1,
    description: 'Original 3D wedding planning interface',
    contribution: 'Spatial thinking, immersive planning paradigm',
    relatedProjects: [],
    keyInsights: ['Chaos is visual', 'Users need spatial context', 'Real-time collaboration matters'],
    dateRange: '2024 Q1'
  },
  {
    id: 'nexus-proto',
    name: 'NEXUS Prototype',
    status: 'research',
    phase: 1,
    description: 'Graph-based relationship system',
    contribution: 'Relations as first-class citizens',
    relatedProjects: ['aime-memory'],
    keyInsights: ['Everything is connected', 'Graph structure over linear', 'Relations explain context'],
    dateRange: '2024 Q1-Q2'
  },
  {
    id: 'gaïa-concept',
    name: 'GAÏA (Concept)',
    status: 'research',
    phase: 1,
    description: 'World building framework',
    contribution: 'Concept of "world" as memory container',
    relatedProjects: ['aime-memory'],
    keyInsights: ['Users build worlds incrementally', 'World contains all entities', 'Context is everything'],
    dateRange: '2024 Q2'
  },
  {
    id: 'aime-archive',
    name: 'AIME-ARCHIVE',
    status: 'active',
    phase: 1,
    description: '30+ project archive and research history',
    contribution: 'Genealogy discovery and pattern identification',
    relatedProjects: ['all'],
    keyInsights: ['Projects share patterns', 'Same ideas renamed', 'Architecture convergence visible'],
    dateRange: '2024 Q2-Q3'
  },

  // Phase 2: Architecture
  {
    id: 'aime-memory',
    name: 'AIME MEMORY System',
    status: 'active',
    phase: 2,
    description: 'Universal memory model with decision trails',
    contribution: 'Core architecture: single source of truth',
    relatedProjects: ['projection-schemas', 'cascade-engine', 'decision-trail'],
    keyInsights: ['One memory, multiple projections', 'Decisions are auditable', 'No duplication needed'],
    dateRange: '2024 Q2-Q3'
  },
  {
    id: 'projection-schemas',
    name: 'Projection Schemas',
    status: 'active',
    phase: 2,
    description: 'Timeline, Finance, Documents, Persons schemas',
    contribution: 'Declarative view specifications',
    relatedProjects: ['aime-memory', 'cascade-engine'],
    keyInsights: ['Projections are views, not data', 'Same data, many shapes', 'Schemas prevent duplication'],
    dateRange: '2024 Q2-Q3'
  },
  {
    id: 'cascade-engine',
    name: 'Cascade Engine',
    status: 'active',
    phase: 2,
    description: 'Automatic projection synchronization',
    contribution: 'Automatic consistency, atomic updates',
    relatedProjects: ['aime-memory', 'projection-schemas'],
    keyInsights: ['No manual sync needed', 'All-or-nothing updates', 'Performance under scale'],
    dateRange: '2024 Q2-Q3'
  },
  {
    id: 'decision-trail',
    name: 'Decision Trail System',
    status: 'active',
    phase: 2,
    description: 'Audit trail and reversibility tracking',
    contribution: 'Compliance and transparency',
    relatedProjects: ['aime-memory'],
    keyInsights: ['Every change is traceable', 'Reversibility matters', 'Governance built-in'],
    dateRange: '2024 Q2-Q3'
  },

  // Phase 3: Implementation
  {
    id: 'react-hooks',
    name: 'React Hooks Layer',
    status: 'active',
    phase: 3,
    description: '9 bidirectional React hooks',
    contribution: 'UI integration, reactive binding',
    relatedProjects: ['aime-memory', 'ai-comprehension'],
    keyInsights: ['Architecture ≠ UI framework', 'Hooks decouple views from logic', 'Reusable across platforms'],
    dateRange: '2024 Q3'
  },
  {
    id: 'ai-comprehension',
    name: 'AI Comprehension Display',
    status: 'active',
    phase: 3,
    description: 'Natural language understanding visualization',
    contribution: 'ME↔AI interaction pattern',
    relatedProjects: ['react-hooks'],
    keyInsights: ['Show understanding before action', 'Users correct, not just confirm', 'AI reasoning visible'],
    dateRange: '2024 Q3'
  },
  {
    id: 'dual-write-validator',
    name: 'Dual-Write Validator',
    status: 'active',
    phase: 3,
    description: '2-week parallel run validation',
    contribution: 'Migration safety and risk reduction',
    relatedProjects: ['cutover-strategy'],
    keyInsights: ['Parallel runs reduce migration risk', 'Reconciliation is key', 'Conflicts are resolvable'],
    dateRange: '2024 Q3'
  },
  {
    id: 'cutover-strategy',
    name: 'Cutover Strategy',
    status: 'active',
    phase: 3,
    description: '6-phase cutover to AIME-only mode',
    contribution: 'Zero-loss migration, monitored cutover',
    relatedProjects: ['backup-migration', 'dual-write-validator'],
    keyInsights: ['Monitoring before final switch', 'Fallback paths matter', '24h observation period'],
    dateRange: '2024 Q3'
  },
  {
    id: 'backup-migration',
    name: 'Backup & Migration System',
    status: 'active',
    phase: 3,
    description: '4-phase migration with checksums',
    contribution: 'Data safety and recovery',
    relatedProjects: ['cutover-strategy'],
    keyInsights: ['Backups are insurance', 'Checksums validate integrity', '90-day retention'],
    dateRange: '2024 Q3'
  },

  // Phase 4: Interface
  {
    id: 'laboratoire',
    name: 'LABORATOIRE Page',
    status: 'active',
    phase: 4,
    description: 'Research and architecture documentation',
    contribution: 'Educational and reference material',
    relatedProjects: ['genealogie', 'portfolio'],
    keyInsights: ['Documentation as demonstration', 'Live examples in interface', 'Architecture visible to users'],
    dateRange: '2024 Q3'
  },
  {
    id: 'genealogie',
    name: 'GÉNÉALOGIE Page',
    status: 'active',
    phase: 4,
    description: 'Project genealogy and evolution',
    contribution: 'Proof of convergence, research history',
    relatedProjects: ['laboratoire', 'portfolio'],
    keyInsights: ['30+ projects converge to one', 'Iteration is visible', 'Ideas recombine'],
    dateRange: '2024 Q3'
  },
  {
    id: 'portfolio',
    name: 'PORTFOLIO Page',
    status: 'active',
    phase: 4,
    description: 'Visual proof and screenshots',
    contribution: 'Tangible demonstration',
    relatedProjects: ['laboratoire', 'genealogie'],
    keyInsights: ['Real screenshots matter', 'UI evolution visible', 'Prototypes as proof'],
    dateRange: '2024 Q3'
  },

  // Phase 5: Expansion
  {
    id: 'domain-adapter-system',
    name: 'Domain Adapter System',
    status: 'active',
    phase: 5,
    description: 'Framework for domain-specific extensions',
    contribution: 'Multi-domain support',
    relatedProjects: ['aime-memory', 'projection-schemas'],
    keyInsights: ['Architecture works across domains', 'Adapters isolate domain logic', 'Reusability at scale'],
    dateRange: '2024 Q4'
  },
  {
    id: 'monde-aime',
    name: 'Monde AIME (Associations)',
    status: 'prototype',
    phase: 5,
    description: 'Charitable organization domain',
    contribution: 'Validation of multi-domain architecture',
    relatedProjects: ['domain-adapter-system', 'aime-memory'],
    keyInsights: ['Same patterns apply elsewhere', 'Financial tracking scales', 'Compliance built-in'],
    dateRange: '2024 Q4'
  },
  {
    id: 'artists-intermittents',
    name: 'Artists & Intermittents Domain',
    status: 'research',
    phase: 5,
    description: 'Gig economy and contract tracking',
    contribution: 'Complex domain validation',
    relatedProjects: ['domain-adapter-system', 'decision-trail'],
    keyInsights: ['Contracts as entities', 'Payment tracking critical', 'Time tracking accurate'],
    dateRange: '2024 Q4'
  },
  {
    id: 'search-projection',
    name: 'Search → Projection Engine',
    status: 'research',
    phase: 5,
    description: 'Generated mini-sites from search results',
    contribution: 'On-demand projection creation',
    relatedProjects: ['projection-schemas', 'cascade-engine'],
    keyInsights: ['Projections are dynamic', 'Generated content, not static', 'Information architecture scalable'],
    dateRange: '2024 Q4'
  },

  // Phase 6: Public & Scale
  {
    id: 'accessibility-layer',
    name: 'Accessibility & Compliance',
    status: 'active',
    phase: 6,
    description: 'WCAG 2.1, GDPR, inclusion',
    contribution: 'Universal access and trust',
    relatedProjects: ['laboratoire', 'portfolio'],
    keyInsights: ['Accessibility from start', 'Compliance as foundation', 'Privacy by design'],
    dateRange: '2024 Q4-2025 Q1'
  },
  {
    id: 'public-launch',
    name: 'Public Launch Infrastructure',
    status: 'active',
    phase: 6,
    description: 'Marketing, documentation, support',
    contribution: 'Reach and adoption',
    relatedProjects: ['laboratoire', 'genealogie', 'portfolio'],
    keyInsights: ['Education is launch', 'Proof is credibility', 'Community matters'],
    dateRange: '2025 Q1'
  }
];

interface TimelineViewState {
  selectedPhase: number | null;
  selectedProject: string | null;
}

export const Genealogie: React.FC = () => {
  const [view, setView] = useState<TimelineViewState>({
    selectedPhase: null,
    selectedProject: null
  });

  const phases = [
    { num: 1, name: 'Discovery', color: '#f97316' },
    { num: 2, name: 'Architecture', color: '#3b82f6' },
    { num: 3, name: 'Implementation', color: '#8b5cf6' },
    { num: 4, name: 'Interface', color: '#06b6d4' },
    { num: 5, name: 'Expansion', color: '#ec4899' },
    { num: 6, name: 'Public & Scale', color: '#10b981' }
  ];

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'archived':
        return '#6b7280';
      case 'prototype':
        return '#f59e0b';
      case 'research':
        return '#8b5cf6';
      case 'merged':
        return '#3b82f6';
      default:
        return '#cbd5e1';
    }
  };

  const selectedProject = genealogyProjects.find(p => p.id === view.selectedProject);
  const filteredProjects = view.selectedPhase
    ? genealogyProjects.filter(p => p.phase === view.selectedPhase)
    : genealogyProjects;

  return (
    <div className="genealogie">
      <header className="genealogie-header">
        <h1>🧬 GÉNÉALOGIE AIME</h1>
        <p>From 30+ Separate Projects to One Unified Architecture</p>
      </header>

      <section className="genealogie-intro">
        <article>
          <h2>The Story of AIME</h2>
          <p>
            AIME didn't emerge fully formed. It's the convergence of <strong>30+ projects</strong>,
            each exploring different aspects of the same problem: <strong>how to help humans manage chaos</strong>.
          </p>
          <p>
            This genealogy shows:
          </p>
          <ul>
            <li>Which projects contributed which ideas</li>
            <li>Which branches were abandoned or merged</li>
            <li>How separate research threads converged</li>
            <li>The evolutionary path from discovery → launch</li>
          </ul>
        </article>
      </section>

      <section className="phases-overview">
        <h2>6 Phases of Development</h2>
        <div className="phases-grid">
          {phases.map(phase => (
            <button
              key={phase.num}
              className={`phase-card ${view.selectedPhase === phase.num ? 'active' : ''}`}
              onClick={() => setView({ ...view, selectedPhase: phase.num === view.selectedPhase ? null : phase.num })}
              style={{
                borderColor: phase.color,
                background: view.selectedPhase === phase.num ? `${phase.color}20` : 'transparent'
              }}
            >
              <div className="phase-number" style={{ background: phase.color }}>{phase.num}</div>
              <div className="phase-name">{phase.name}</div>
              <div className="project-count">
                {genealogyProjects.filter(p => p.phase === phase.num).length} projects
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="genealogy-tree">
        <h2>Project Genealogy</h2>
        <div className="projects-list">
          {filteredProjects.map(project => (
            <div
              key={project.id}
              className={`project-node ${view.selectedProject === project.id ? 'selected' : ''}`}
              onClick={() => setView({ ...view, selectedProject: project.id })}
              style={{ borderLeftColor: getStatusColor(project.status) }}
            >
              <div className="project-header">
                <h3>{project.name}</h3>
                <span className="status-badge" style={{ background: getStatusColor(project.status) }}>
                  {project.status}
                </span>
              </div>
              <p className="project-date">{project.dateRange}</p>
              <p className="project-description">{project.description}</p>
              <p className="project-contribution">
                <strong>Contribution:</strong> {project.contribution}
              </p>
            </div>
          ))}
        </div>
      </section>

      {selectedProject && (
        <section className="project-detail">
          <div className="detail-card">
            <button
              className="close-btn"
              onClick={() => setView({ ...view, selectedProject: null })}
            >
              ✕
            </button>

            <h2>{selectedProject.name}</h2>

            <div className="detail-grid">
              <div className="detail-section">
                <h3>📍 Status</h3>
                <span
                  className="status-badge"
                  style={{ background: getStatusColor(selectedProject.status) }}
                >
                  {selectedProject.status}
                </span>
              </div>

              <div className="detail-section">
                <h3>📅 Date Range</h3>
                <p>{selectedProject.dateRange}</p>
              </div>

              <div className="detail-section">
                <h3>🎯 Phase</h3>
                <p>{phases[selectedProject.phase - 1]?.name || 'Unknown'}</p>
              </div>
            </div>

            <div className="detail-section full-width">
              <h3>📖 Description</h3>
              <p>{selectedProject.description}</p>
            </div>

            <div className="detail-section full-width">
              <h3>💡 Key Insights</h3>
              <ul>
                {selectedProject.keyInsights.map((insight, i) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
            </div>

            {selectedProject.relatedProjects.length > 0 && (
              <div className="detail-section full-width">
                <h3>🔗 Related Projects</h3>
                <div className="related-projects">
                  {selectedProject.relatedProjects.map(relId => {
                    const relProject = genealogyProjects.find(p => p.id === relId);
                    return relProject ? (
                      <button
                        key={relId}
                        className="related-link"
                        onClick={() =>
                          setView({ ...view, selectedProject: relId })
                        }
                      >
                        {relProject.name}
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="convergence-story">
        <article>
          <h2>How 30+ Projects Became One</h2>
          <p>
            Each project started independently, solving specific problems. But over time, a pattern
            emerged: <strong>the same fundamental architecture kept appearing</strong>.
          </p>

          <h3>🔄 Recurring Patterns</h3>
          <ul>
            <li>
              <strong>Memory vs. Views:</strong> Every project needed to distinguish data storage
              from presentation
            </li>
            <li>
              <strong>Relations Matter:</strong> Information becomes useful when connected
            </li>
            <li>
              <strong>Decisions Are Auditable:</strong> Users want to understand why data changed
            </li>
            <li>
              <strong>One Input, Multiple Outputs:</strong> Same data, many projections
            </li>
            <li>
              <strong>Natural Expression:</strong> Systems should understand human language
            </li>
          </ul>

          <h3>✨ The Convergence</h3>
          <p>
            By Phase 2 (Architecture), these patterns crystallized into <strong>AIME</strong>:
          </p>
          <ul>
            <li>One universal memory model (AIMemoryEntity)</li>
            <li>Multiple declarative projections (Timeline, Finance, Documents, Persons)</li>
            <li>Automatic synchronization (Cascade Engine)</li>
            <li>Auditable decisions (Decision Trail)</li>
            <li>Natural interaction (AI+ME paradigm)</li>
          </ul>

          <p>
            What started as separate experiments became a cohesive, unified system. AIME isn't
            new. It's the <strong>convergence of 6+ months of distributed research</strong>.
          </p>
        </article>
      </section>

      <section className="domains-roadmap">
        <h2>Domains Beyond Wedding</h2>
        <p>
          AIME's architecture isn't specific to weddings. It applies to any "chaotic domain" where
          users need to organize dispersed information.
        </p>

        <div className="domains-roadmap-grid">
          {[
            {
              domain: 'Wedding (Current)',
              status: 'active',
              entities: 15,
              projections: 4
            },
            {
              domain: 'Monde AIME (Associations)',
              status: 'prototype',
              entities: 12,
              projections: 3
            },
            {
              domain: 'Artists & Intermittents',
              status: 'research',
              entities: 10,
              projections: 5
            },
            {
              domain: 'Teams & Projects',
              status: 'planned',
              entities: 8,
              projections: 4
            },
            {
              domain: 'Medical Practices',
              status: 'research',
              entities: 20,
              projections: 6
            },
            {
              domain: 'University/Education',
              status: 'research',
              entities: 15,
              projections: 5
            }
          ].map((item, i) => (
            <div key={i} className="domain-roadmap-card">
              <h3>{item.domain}</h3>
              <p className="status">{item.status}</p>
              <div className="stats">
                <span>{item.entities} entities</span>
                <span>{item.projections} projections</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="genealogie-footer">
        <p>
          🧬 GÉNÉALOGIE documents the evolutionary path from research to product. Each project
          contributed essential insights. None were wasted.
        </p>
        <p>
          Questions about a specific project? Check the <a href="/laboratoire">LABORATOIRE</a> for
          deep dives, or <a href="/portfolio">PORTFOLIO</a> for screenshots.
        </p>
      </footer>
    </div>
  );
};

export default Genealogie;
