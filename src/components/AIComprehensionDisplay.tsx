/**
 * SECTION 5: Complete ME↔AI Loop
 * 
 * AI Comprehension Display
 * 
 * Shows user:
 * - "I understood you said: ..."
 * - "This will impact: ..."
 * - "Here's what I recommend: ..."
 * - Asks: "Is this correct?"
 * 
 * User can:
 * - Confirm (decision recorded)
 * - Correct (decision updated)
 * - Ask follow-up questions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AIMemoryEntity } from '../architecture/aiMemory';
import { CascadeInstruction } from '../architecture/projectionSchemas';

export interface AIComprehension {
  understood: string; // "I understood you said: ..."
  impacts: CascadeInstruction[]; // Which projections will change
  recommendations: string[]; // What AI suggests
  confidence: number; // 0-1 how certain is the AI
  uncertainties?: string[]; // Things that are unclear
}

interface AIComprehensionDisplayProps {
  comprehension: AIComprehension | null;
  loading: boolean;
  onConfirm: () => Promise<void>;
  onCorrect: (correction: string) => Promise<void>;
  onAskFollowUp: (question: string) => Promise<void>;
  entity?: AIMemoryEntity;
}

/**
 * Component: AI Comprehension Display
 * 
 * Shows AI's understanding of user action and asks for confirmation
 */
export const AIComprehensionDisplay: React.FC<AIComprehensionDisplayProps> = ({
  comprehension,
  loading,
  onConfirm,
  onCorrect,
  onAskFollowUp,
  entity
}) => {
  const [confirmPending, setConfirmPending] = useState(false);
  const [correction, setCorrection] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [showCorrection, setShowCorrection] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  if (!comprehension && !loading) return null;

  if (loading) {
    return (
      <div className="ai-comprehension ai-comprehension--loading">
        <p>AI is analyzing your input...</p>
        <div className="spinner" />
      </div>
    );
  }

  if (!comprehension) return null;

  const handleConfirm = async () => {
    setConfirmPending(true);
    try {
      await onConfirm();
    } finally {
      setConfirmPending(false);
    }
  };

  const handleCorrect = async () => {
    if (!correction.trim()) return;
    try {
      await onCorrect(correction);
      setCorrection('');
      setShowCorrection(false);
    } catch (err) {
      console.error('Correction failed:', err);
    }
  };

  const handleFollowUp = async () => {
    if (!followUp.trim()) return;
    try {
      await onAskFollowUp(followUp);
      setFollowUp('');
      setShowFollowUp(false);
    } catch (err) {
      console.error('Follow-up failed:', err);
    }
  };

  const confidencePercent = Math.round(comprehension.confidence * 100);
  const confidenceColor = 
    comprehension.confidence > 0.8 ? 'high' :
    comprehension.confidence > 0.5 ? 'medium' :
    'low';

  return (
    <div className="ai-comprehension">
      {/* Step 1: What AI Understood */}
      <section className="ai-comprehension__section ai-comprehension__understood">
        <h3>What I Understood</h3>
        <div className="ai-comprehension__understood-text">
          <p>{comprehension.understood}</p>
          <div className={`ai-comprehension__confidence confidence-${confidenceColor}`}>
            <span className="confidence-label">
              Confidence: {confidencePercent}%
            </span>
            <div className="confidence-bar">
              <div 
                className="confidence-fill"
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Step 2: Uncertainties (if any) */}
      {comprehension.uncertainties && comprehension.uncertainties.length > 0 && (
        <section className="ai-comprehension__section ai-comprehension__uncertainties">
          <h3>I'm Less Sure About:</h3>
          <ul className="ai-comprehension__uncertainty-list">
            {comprehension.uncertainties.map((uncertainty, idx) => (
              <li key={idx} className="ai-comprehension__uncertainty-item">
                <span className="uncertainty-icon">?</span>
                {uncertainty}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Step 3: What Will Change */}
      <section className="ai-comprehension__section ai-comprehension__impacts">
        <h3>This Will Impact</h3>
        <div className="ai-comprehension__impacts-grid">
          {comprehension.impacts.map((impact, idx) => (
            <div key={idx} className="ai-comprehension__impact-card">
              <div className="impact-projection">
                {impact.source_projection.toUpperCase()}
              </div>
              <div className="impact-reason">
                {impact.reason}
              </div>
              <div className="impact-entities">
                {impact.target_entity_type}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 4: Recommendations */}
      {comprehension.recommendations.length > 0 && (
        <section className="ai-comprehension__section ai-comprehension__recommendations">
          <h3>My Recommendations</h3>
          <ul className="ai-comprehension__recommendation-list">
            {comprehension.recommendations.map((rec, idx) => (
              <li key={idx} className="ai-comprehension__recommendation-item">
                <span className="recommendation-icon">💡</span>
                {rec}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Step 5: Correction Form (if user wants to correct) */}
      {showCorrection && (
        <section className="ai-comprehension__section ai-comprehension__correction">
          <h3>Please Correct Me</h3>
          <textarea
            className="ai-comprehension__correction-input"
            placeholder="What did I misunderstand? Please be specific..."
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            rows={3}
          />
          <div className="ai-comprehension__correction-actions">
            <button
              className="btn btn-primary"
              onClick={handleCorrect}
              disabled={!correction.trim()}
            >
              Submit Correction
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowCorrection(false)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Step 6: Follow-up Question Form (if user has questions) */}
      {showFollowUp && (
        <section className="ai-comprehension__section ai-comprehension__follow-up">
          <h3>Ask Me Anything</h3>
          <textarea
            className="ai-comprehension__follow-up-input"
            placeholder="What would you like to know about this change?"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            rows={3}
          />
          <div className="ai-comprehension__follow-up-actions">
            <button
              className="btn btn-primary"
              onClick={handleFollowUp}
              disabled={!followUp.trim()}
            >
              Ask
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowFollowUp(false)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Action Buttons */}
      <section className="ai-comprehension__section ai-comprehension__actions">
        <button
          className="btn btn-primary btn-large"
          onClick={handleConfirm}
          disabled={confirmPending || showCorrection || showFollowUp}
        >
          {confirmPending ? 'Confirming...' : '✓ Yes, This Is Correct'}
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={() => setShowCorrection(!showCorrection)}
          disabled={confirmPending || showFollowUp}
        >
          ✎ I Need to Correct Something
        </button>
        
        <button
          className="btn btn-secondary"
          onClick={() => setShowFollowUp(!showFollowUp)}
          disabled={confirmPending || showCorrection}
        >
          ? Ask a Follow-Up Question
        </button>
      </section>

      {/* Decision Trail Preview */}
      {entity && entity.decision_trail && entity.decision_trail.length > 0 && (
        <section className="ai-comprehension__section ai-comprehension__decision-trail">
          <h3>Decision History for This Item</h3>
          <div className="ai-comprehension__decision-list">
            {entity.decision_trail.slice(0, 3).map((decision, idx) => (
              <div key={idx} className="ai-comprehension__decision-item">
                <div className="decision-time">
                  {new Date(decision.timestamp).toLocaleDateString()}
                </div>
                <div className="decision-who">
                  by {decision.validated_by}
                </div>
                <div className="decision-what">
                  {decision.correction ? 'Corrected' : 'Confirmed'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

/**
 * Hook: Generate AI Comprehension from user action
 * 
 * Takes user's change and generates:
 * - What AI understood
 * - Confidence level
 * - What will change
 * - Recommendations
 */
export function useAIComprehension(entity: AIMemoryEntity | null, changes: any) {
  const [comprehension, setComprehension] = useState<AIComprehension | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entity || !changes || Object.keys(changes).length === 0) {
      setComprehension(null);
      return;
    }

    setLoading(true);

    // TODO: Call AI comprehension service
    // This would:
    // 1. Analyze user's change
    // 2. Generate natural language understanding
    // 3. Identify cascades
    // 4. Detect uncertainties
    // 5. Generate recommendations
    
    // For now, placeholder
    setTimeout(() => {
      setComprehension({
        understood: `Update ${entity.content?.entity_type || 'item'} with new values`,
        impacts: [],
        recommendations: [],
        confidence: 0.8
      });
      setLoading(false);
    }, 500);
  }, [entity, JSON.stringify(changes)]);

  return { comprehension, loading };
}

/**
 * Service: AI Comprehension Engine
 * 
 * Generates natural language understanding of user actions
 */
export class AIComprehensionEngine {
  /**
   * Analyze user change and generate comprehension
   */
  static async analyze(
    entity: AIMemoryEntity,
    changes: any,
    cascades: CascadeInstruction[]
  ): Promise<AIComprehension> {
    // TODO: Implement AI comprehension logic
    
    // For wedding domain example:
    if (entity.domain === 'wedding') {
      const entityType = entity.content?.entity_type;
      const changedFields = Object.keys(changes.content || {});
      
      let understood = '';
      
      if (entityType === 'vendor' && changedFields.includes('cost')) {
        const vendor = entity.content?.name || 'vendor';
        const oldCost = entity.content?.cost || 0;
        const newCost = changes.content?.cost || 0;
        understood = `Update vendor "${vendor}" cost from €${oldCost} to €${newCost}`;
      } else if (entityType === 'guest') {
        understood = `Update guest ${entity.content?.name || 'details'}`;
      }
      
      return {
        understood,
        impacts: cascades || [],
        recommendations: this.getRecommendations(entity, changes),
        confidence: 0.85,
        uncertainties: this.detectUncertainties(entity, changes)
      };
    }
    
    return {
      understood: 'Update item',
      impacts: cascades || [],
      recommendations: [],
      confidence: 0.5
    };
  }

  /**
   * Detect what AI is uncertain about
   */
  private static detectUncertainties(entity: AIMemoryEntity, changes: any): string[] {
    const uncertainties: string[] = [];
    
    // TODO: Implement uncertainty detection
    // Examples:
    // - If cost is very high, ask if it's correct
    // - If guest RSVP status changes, ask if this was intentional
    // - If document is very old, ask if it's still current
    
    return uncertainties;
  }

  /**
   * Generate recommendations based on change
   */
  private static getRecommendations(entity: AIMemoryEntity, changes: any): string[] {
    const recommendations: string[] = [];
    
    // TODO: Implement recommendations
    // Examples:
    // - "This vendor cost is higher than similar vendors"
    // - "Consider if you need to reschedule the timeline"
    // - "This impacts the budget for X, Y, and Z categories"
    
    return recommendations;
  }
}
