/**
 * SECTION 10: LABORATOIRE Page Component
 * 
 * Dedicated research and architecture space for AIME
 * Shows:
 * - AI+ME paradigm documentation
 * - Cascade system demonstrations
 * - Decision trail examples
 * - Architecture principles
 * - Research timeline
 * - Real-world use cases
 */

import React, { useState } from 'react';
import './laboratoire.css';

interface CaseDemonstration {
  title: string;
  description: string;
  scenario: string;
  ai_understanding: string;
  cascade_effects: string[];
  decision_trail_example: {
    validated_by: string;
    timestamp: string;
    original_extraction: string;
    correction?: string;
    reason_for_certainty: string;
  };
}

const laboratoireDemonstrations: CaseDemonstration[] = [
  {
    title: 'DJ Cost Update',
    description: 'User updates DJ cost from €1000 to €1500 with 500€ deposit',
    scenario: 'ME: "Le DJ Martin coûte finalement 1500€, avec 500€ dacompte."',
    ai_understanding: 'AI: I understand that DJ Martin now costs €1500 total, with €500 paid as advance, leaving €1000 due at the event. This impacts the wedding budget, the payment schedule, and the vendor record.',
    cascade_effects: [
      'Timeline: DJ moment shows updated cost and payment status',
      'Finance: Budget line updated, remaining balance updated, cash flow recalculated',
      'Documents: Vendor contract updated with new terms',
      'Persons: Vendor record shows payment status'
    ],
    decision_trail_example: {
      validated_by: 'user:mattmez',
      timestamp: '2024-08-27T15:30:00Z',
      original_extraction: 'DJ Martin: €1000',
      correction: 'DJ Martin: €1500 (€500 advance)',
      reason_for_certainty: 'User explicitly confirmed during AI comprehension review'
    }
  },
  {
    title: 'Guest Dietary Restriction',
    description: 'User adds allergies for a guest attending multiple events',
    scenario: 'ME: "Sophie Dubois a une allergie aux fruits à coque, elle vient au cocktail et à la réception."',
    ai_understanding: 'AI: Sophie Dubois (guest) has a nut allergy and attends two events: cocktail (6 PM) and reception (8 PM). Catering team needs to know about this restriction for both events.',
    cascade_effects: [
      'Timeline: Both events show nut-free requirement',
      'Documents: Catering checklist flagged for Sophie',
      'Persons: Sophie\'s profile shows allergy and affected events',
      'Documents: Vendor email template to catering includes restriction'
    ],
    decision_trail_example: {
      validated_by: 'user:mattmez',
      timestamp: '2024-08-27T14:15:00Z',
      original_extraction: 'Sophie Dubois: fruits à coque allergy',
      reason_for_certainty: 'User confirmed allergy via update, affects critical safety concern'
    }
  },
  {
    title: 'Budget Reallocation',
    description: 'User realizes flowers are more expensive, redistributes budget',
    scenario: 'ME: "Les fleurs, c\'est 800 au lieu de 500. Je prends 300 sur la décoration intérieure."',
    ai_understanding: 'AI: Flowers cost increased by €300 (€500→€800). You want to reduce interior decoration budget by €300. Total wedding budget stays the same, but decorator and florist budgets shift.',
    cascade_effects: [
      'Finance: Budget line items rebalanced',
      'Documents: Updated vendor quote for florist (higher)',
      'Timeline: Budget impact projection shown',
      'Documents: Memo to decorator about budget reduction'
    ],
    decision_trail_example: {
      validated_by: 'user:mattmez',
      timestamp: '2024-08-27T13:45:00Z',
      original_extraction: 'Flowers: €500, Interior: €500',
      correction: 'Flowers: €800, Interior: €200',
      reason_for_certainty: 'User explicitly made budget trade-off decision'
    }
  }
];

const AIeMEPrinciples = [
  {
    title: 'ME: Expression of Chaos',
    description: 'The human expresses their world naturally: intentions, questions, decisions, stories',
    examples: [
      'Natural language (French preferred)',
      'Incremental corrections',
      'Contextual references',
      'Implicit knowledge (e.g., "Sophie" → person in guest list)'
    ]
  },
  {
    title: 'AI: Comprehension & Synthesis',
    description: 'System understands and shows its interpretation before acting',
    examples: [
      'Natural language summary',
      'Impact prediction',
      'Missing information flagged',
      'Confidence level shown'
    ]
  },
  {
    title: '+ (Plus): Universal Transformation',
    description: 'Not a simple "Add" button. Gateway to all operations.',
    examples: [
      'Create new entity',
      'Import from external source',
      'Search and retrieve',
      'Connect entities',
      'Transform data',
      'Execute action'
    ]
  },
  {
    title: 'MÉMOIRE: Single Source of Truth',
    description: 'One coherent memory: entities, facts, relations, decisions',
    examples: [
      'AI Memory Entity type (domain-agnostic)',
      'Decision trail (every change auditable)',
      'Relations tracked explicitly',
      'No duplication across projections'
    ]
  },
  {
    title: 'Cascades: Automatic Synchronization',
    description: 'Projections auto-sync when data changes. No manual updates.',
    examples: [
      'Edit in Finance → Timeline updates',
      'Update vendor → Documents updated',
      'Add guest → Multiple events affected',
      'All cascade atomically (all-or-nothing)'
    ]
  }
];

const ArchitectureComponents = [
  {
    name: 'AIMemoryEntity',
    role: 'Universal data type',
    description: 'Abstract entity that can be vendor, guest, decision, document, person, location, etc.',
    domains: ['Wedding', 'Monde AIME', 'Artists/Intermittents', 'Associations', 'Teams', 'Custom']
  },
  {
    name: 'ProjectionSchema',
    role: 'View specification',
    description: 'Declarative schema for how each projection reads/writes/cascades',
    examples: ['Timeline', 'Finance', 'Documents', 'Persons']
  },
  {
    name: 'CascadeEngine',
    role: 'Automatic sync',
    description: 'Identifies affected projections when entity changes, executes cascades atomically',
    speed: '1000+ entities in <100ms'
  },
  {
    name: 'QuerySystem',
    role: 'Read operations',
    description: 'Stateless queries of AIME memory with filtering, sorting, pagination',
    example: 'Get all wedding vendors with cost >€1000'
  },
  {
    name: 'MutationSystem',
    role: 'Write operations',
    description: 'Validates, mutates entity, triggers cascades, records decision',
    validation: 'Type-safe, cascade-aware, decision-trail-producing'
  },
  {
    name: 'DecisionRecord',
    role: 'Audit trail',
    description: 'Every fact change has timestamp, validator, original→corrected, reason, reversibility',
    governance: 'Enables compliance (fiscal, legal, GDPR)'
  }
];

const ResearchEvolution = [
  {
    phase: 'Discovery (2024 Q1-Q2)',
    projects: ['WeddingCity', 'AIME-ARCHIVE', 'NEXUS prototypes'],
    breakthrough: 'Identified "One Memory, Multiple Projections" principle'
  },
  {
    phase: 'Architecture (2024 Q2-Q3)',
    projects: ['AIME MEMORY system', 'Cascade Engine', 'Decision Trail'],
    breakthrough: 'AI+ME paradigm crystallized as UX core'
  },
  {
    phase: 'Implementation (2024 Q3-Q4)',
    projects: ['React integration', 'Dual-write validation', 'Cutover strategy'],
    breakthrough: 'End-to-end ME→AI→MEMORY→PROJECTIONS loop working'
  },
  {
    phase: 'Expansion (2025 Q1+)',
    projects: ['Multi-domain support', 'GÉNÉALOGIE mapping', 'Public launch'],
    breakthrough: 'AIME becomes platform for any chaotic domain'
  }
];

interface TabState {
  activeTab: 'overview' | 'demonstrations' | 'architecture' | 'research' | 'cascade-demo';
}

export const Laboratoire: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabState['activeTab']>('overview');

  return (
    <div className="laboratoire">
      <header className="laboratoire-header">
        <h1>🔬 LABORATOIRE AIME</h1>
        <p>Research, Architecture, and Design Principles</p>
      </header>

      <nav className="laboratoire-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'demonstrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('demonstrations')}
        >
          Demonstrations
        </button>
        <button
          className={`tab ${activeTab === 'architecture' ? 'active' : ''}`}
          onClick={() => setActiveTab('architecture')}
        >
          Architecture
        </button>
        <button
          className={`tab ${activeTab === 'cascade-demo' ? 'active' : ''}`}
          onClick={() => setActiveTab('cascade-demo')}
        >
          Cascade Demo
        </button>
        <button
          className={`tab ${activeTab === 'research' ? 'active' : ''}`}
          onClick={() => setActiveTab('research')}
        >
          Research Timeline
        </button>
      </nav>

      <main className="laboratoire-content">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <section className="tab-content">
            <article>
              <h2>What is LABORATOIRE?</h2>
              <p>
                LABORATOIRE is the research and architecture space of AIME. It documents:
              </p>
              <ul>
                <li>The AI+ME paradigm (how humans and systems collaborate)</li>
                <li>Cascade demonstrations (automatic synchronization)</li>
                <li>Decision trail examples (audit trails and reversibility)</li>
                <li>Architecture components (memory, projections, query/mutation)</li>
                <li>Research evolution (from discovery to implementation)</li>
                <li>Real-world use cases across domains</li>
              </ul>
            </article>

            <article>
              <h2>AI + ME: The Core Paradigm</h2>
              <div className="paradigm-diagram">
                <div className="paradigm-column">
                  <h3>ME</h3>
                  <p>Human expression:</p>
                  <ul>
                    <li>Intent</li>
                    <li>Question</li>
                    <li>Story</li>
                    <li>Decision</li>
                    <li>Correction</li>
                  </ul>
                </div>

                <div className="paradigm-column central">
                  <h3>+</h3>
                  <p>Transformation:</p>
                  <ul>
                    <li>Create</li>
                    <li>Import</li>
                    <li>Search</li>
                    <li>Connect</li>
                    <li>Transform</li>
                  </ul>
                </div>

                <div className="paradigm-column">
                  <h3>AI</h3>
                  <p>System understanding:</p>
                  <ul>
                    <li>Comprehension</li>
                    <li>Proposal</li>
                    <li>Impact</li>
                    <li>Question</li>
                    <li>Suggestion</li>
                  </ul>
                </div>
              </div>
            </article>

            <article>
              <h2>The Problem AIME Solves</h2>
              <p>
                Humans arrive with <strong>chaos</strong>: dispersed information, documents, dates, 
                people, money, constraints, and ideas. They expect the system to:
              </p>
              <ol>
                <li><strong>Understand</strong> their intention and context</li>
                <li><strong>Ask</strong> for missing information</li>
                <li><strong>Propose</strong> structure and next steps</li>
                <li><strong>Adapt</strong> as decisions evolve</li>
                <li><strong>Connect</strong> related information automatically</li>
                <li><strong>Show</strong> consequences before changes are applied</li>
              </ol>
              <p>
                AIME doesn't replace human judgment. It <strong>augments</strong> it by understanding 
                the whole world and showing impacts of decisions before they're made.
              </p>
            </article>
          </section>
        )}

        {/* DEMONSTRATIONS TAB */}
        {activeTab === 'demonstrations' && (
          <section className="tab-content">
            <h2>Real-World Cascade Demonstrations</h2>
            <p>
              These are actual examples of how ME→AI→MEMORY→CASCADES→PROJECTIONS works in practice.
            </p>

            {laboratoireDemonstrations.map((demo, idx) => (
              <article key={idx} className="demonstration">
                <h3>{demo.title}</h3>
                <p className="demo-description">{demo.description}</p>

                <div className="demo-section">
                  <h4>1️⃣ ME (User Expression)</h4>
                  <blockquote>{demo.scenario}</blockquote>
                </div>

                <div className="demo-section">
                  <h4>2️⃣ AI (System Comprehension)</h4>
                  <blockquote>{demo.ai_understanding}</blockquote>
                </div>

                <div className="demo-section">
                  <h4>3️⃣ + (Confirmation)</h4>
                  <p>User reviews understanding and confirms or corrects.</p>
                </div>

                <div className="demo-section">
                  <h4>4️⃣ MEMORY (Decision Trail)</h4>
                  <pre>
                    {JSON.stringify(demo.decision_trail_example, null, 2)}
                  </pre>
                </div>

                <div className="demo-section">
                  <h4>5️⃣ CASCADES (Automatic Sync)</h4>
                  <ul>
                    {demo.cascade_effects.map((effect, i) => (
                      <li key={i}>{effect}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ARCHITECTURE TAB */}
        {activeTab === 'architecture' && (
          <section className="tab-content">
            <h2>Architecture Components</h2>
            <p>
              These are the core building blocks that power AIME. Each component has a specific role 
              in the AI+ME flow.
            </p>

            <div className="architecture-grid">
              {ArchitectureComponents.map((component, idx) => (
                <article key={idx} className="component-card">
                  <h3>{component.name}</h3>
                  <p className="role">{component.role}</p>
                  <p>{component.description}</p>

                  <div className="component-details">
                    {('domains' in component) && (
                      <div>
                        <strong>Domains:</strong>
                        <ul>
                          {component.domains?.map((d: string) => (
                            <li key={d}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {('examples' in component) && (
                      <div>
                        <strong>Examples:</strong>
                        <ul>
                          {component.examples?.map((e: string) => (
                            <li key={e}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {('speed' in component) && (
                      <div>
                        <strong>Performance:</strong> {component.speed}
                      </div>
                    )}
                    {('validation' in component) && (
                      <div>
                        <strong>Guarantee:</strong> {component.validation}
                      </div>
                    )}
                    {('governance' in component) && (
                      <div>
                        <strong>Governance:</strong> {component.governance}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <article className="principles-section">
              <h2>Core Principles</h2>
              {AIeMEPrinciples.map((principle, idx) => (
                <div key={idx} className="principle">
                  <h4>{principle.title}</h4>
                  <p>{principle.description}</p>
                  <strong>Examples:</strong>
                  <ul>
                    {principle.examples.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          </section>
        )}

        {/* CASCADE DEMO TAB */}
        {activeTab === 'cascade-demo' && (
          <section className="tab-content">
            <h2>Cascade System Demonstration</h2>
            <article>
              <h3>What is a Cascade?</h3>
              <p>
                When you edit data in one projection, AIME automatically updates related data in 
                all other affected projections. This is called a <strong>cascade</strong>.
              </p>
              <p>
                For example, if you update a vendor's cost in the Finance projection:
              </p>

              <div className="cascade-flow">
                <div className="cascade-step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Edit in Finance</h4>
                    <p>User changes DJ cost to €1500</p>
                  </div>
                </div>

                <div className="cascade-arrow">→</div>

                <div className="cascade-step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Mutation System</h4>
                    <p>Validates change, records decision</p>
                  </div>
                </div>

                <div className="cascade-arrow">→</div>

                <div className="cascade-step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Cascade Engine</h4>
                    <p>Identifies affected projections</p>
                  </div>
                </div>

                <div className="cascade-arrow">→</div>

                <div className="cascade-step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>Auto-Sync</h4>
                    <p>Timeline, Documents, Persons update automatically</p>
                  </div>
                </div>
              </div>

              <h3>Key Properties</h3>
              <ul>
                <li><strong>Atomic:</strong> All cascades succeed or all fail (no partial updates)</li>
                <li><strong>Fast:</strong> 1000+ entities sync in &lt;100ms</li>
                <li><strong>Reversible:</strong> Every decision is auditable and can be corrected</li>
                <li><strong>Transparent:</strong> User sees impacts before confirming</li>
              </ul>

              <h3>Cascade Rules (Wedding Domain)</h3>
              <pre>
                {`When Vendor.cost changes:
  → Budget.line_item.amount updates
  → Timeline.event.cost updates
  → Documents.contract.amount updates
  → Persons.vendor.payment_schedule recalculates

When Guest is added to Event:
  → Timeline.event.guest_count updates
  → Finance.catering.per_person_cost recalculates
  → Documents.invitation.recipient_list updates
  → Persons.guest.events list updated

When Document is linked:
  → Timeline.event.documents list updated
  → Persons.person.documents list updated (if applicable)
  → Finance.budget.supporting_docs flag updated`}
              </pre>
            </article>
          </section>
        )}

        {/* RESEARCH TIMELINE TAB */}
        {activeTab === 'research' && (
          <section className="tab-content">
            <h2>Research Evolution</h2>
            <p>
              AIME is the result of 6+ months of research, experimentation, and architectural 
              refinement across 30+ projects and prototypes.
            </p>

            <div className="research-timeline">
              {ResearchEvolution.map((phase, idx) => (
                <div key={idx} className="timeline-phase">
                  <div className="phase-marker">{idx + 1}</div>
                  <div className="phase-content">
                    <h3>{phase.phase}</h3>
                    <p>
                      <strong>Projects:</strong> {phase.projects.join(', ')}
                    </p>
                    <p>
                      <strong>🎯 Breakthrough:</strong> {phase.breakthrough}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <article>
              <h2>Domains Beyond Wedding</h2>
              <p>
                AIME architecture is domain-agnostic. It applies to any "chaotic domain" where 
                users arrive with dispersed information:
              </p>

              <div className="domains-grid">
                {[
                  {
                    name: 'Wedding',
                    entities: ['Vendors', 'Guests', 'Events', 'Budget', 'Documents']
                  },
                  {
                    name: 'Monde AIME',
                    entities: ['Donations', 'Expenses', 'Volunteers', 'Projects', 'Reports']
                  },
                  {
                    name: 'Artists & Intermittents',
                    entities: ['Contracts', 'Gigs', 'Payments', 'Hours', 'Employers']
                  },
                  {
                    name: 'Associations',
                    entities: ['Members', 'Events', 'Budget', 'Volunteers', 'Documents']
                  },
                  {
                    name: 'Teams & Projects',
                    entities: ['Members', 'Tasks', 'Budget', 'Timeline', 'Deliverables']
                  }
                ].map((domain, i) => (
                  <div key={i} className="domain-card">
                    <h4>{domain.name}</h4>
                    <ul>
                      {domain.entities.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}
      </main>

      <footer className="laboratoire-footer">
        <p>
          🔬 LABORATOIRE is a live research space. It documents the architecture, principles, 
          and demonstrations of AIME.
        </p>
        <p>
          Questions? Suggestions? Check 👉 <a href="/genealogie">GÉNÉALOGIE</a> for the project 
          history, or 👉 <a href="/portfolio">PORTFOLIO</a> for visual proof.
        </p>
      </footer>
    </div>
  );
};

export default Laboratoire;
