/**
 * SECTION 5: Complete ME↔AI Loop Tests
 * 
 * Tests for AI Comprehension Display and decision memorization
 * Demonstrates: ME (user) → AI (understands) → User confirms → Decision recorded
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  AIComprehensionDisplay,
  AIComprehensionEngine,
  useAIComprehension
} from '../src/components/AIComprehensionDisplay';
import { renderHook, act } from '@testing-library/react';
import { createEntity, addDecisionToTrail } from '../src/architecture/aiMemory';

describe('SECTION 5: Complete ME↔AI Loop', () => {
  describe('AI Comprehension Engine', () => {
    test('should generate comprehension for vendor cost change', async () => {
      const mockEntity = {
        id: 'vendor_1',
        domain: 'wedding',
        content: {
          entity_type: 'vendor',
          name: 'DJ Martin',
          cost: 1000
        }
      };

      const mockChanges = {
        content: {
          cost: 1500
        }
      };

      const comprehension = await AIComprehensionEngine.analyze(
        mockEntity as any,
        mockChanges,
        []
      );

      expect(comprehension).toBeDefined();
      expect(comprehension.understood).toBeTruthy();
      expect(comprehension.confidence).toBeGreaterThan(0);
      expect(comprehension.impacts).toBeDefined();
      expect(Array.isArray(comprehension.recommendations)).toBe(true);
    });

    describe('Universal Memory Provenance', () => {
      test('should create entity with explicit source and confidence fields', () => {
        const entity = createEntity('entity', 'wedding', { name: 'DJ Martin' }, 'user_1');

        expect(entity.source.source_kind).toBe('user');
        expect(entity.source.source_confidence).toBe('confirmed');
        expect(entity.confidence_level).toBe('estimated');
        expect(entity.decision_trail[0].confidence_before).toBe(0.5);
        expect(entity.decision_trail[0].confidence_after).toBe(0.5);
      });

      test('should update confidence when a decision is appended', () => {
        const entity = createEntity('entity', 'wedding', { name: 'DJ Martin' }, 'user_1');
        const updated = addDecisionToTrail(entity, {
          timestamp: new Date(),
          sequence_number: 99,
          validated_by: 'user_1',
          original_extraction: {
            facts: { name: 'DJ Martin' },
            certainty: 0.5,
            reasoning: 'initial'
          },
          impact_analysis: {
            changed_at: new Date(),
            changed_by: 'user_1',
            affected_projections: ['Timeline'],
            changes: [],
            cascaded_to: []
          },
          validation_source: 'user_confirmation',
          is_reversible: true,
          confidence_before: 0.5,
          confidence_after: 0.9
        });

        expect(updated.certainty).toBe(0.9);
        expect(updated.confidence_level).toBe('confirmed');
        expect(updated.decision_trail).toHaveLength(2);
      });
    });

    test('should detect uncertainties in vendor data', async () => {
      const mockEntity = {
        id: 'vendor_1',
        domain: 'wedding',
        content: {
          entity_type: 'vendor',
          name: 'Unknown Vendor',
          cost: 5000  // Very high cost
        }
      };

      const comprehension = await AIComprehensionEngine.analyze(
        mockEntity as any,
        { content: { cost: 10000 } },
        []
      );

      expect(comprehension.uncertainties).toBeDefined();
    });

    test('should generate natural language understanding', async () => {
      const mockEntity = {
        id: 'vendor_1',
        domain: 'wedding',
        content: {
          entity_type: 'vendor',
          name: 'DJ Martin',
          cost: 1000
        }
      };

      const comprehension = await AIComprehensionEngine.analyze(
        mockEntity as any,
        { content: { cost: 1500 } },
        []
      );

      // Should contain entity name and cost values
      expect(comprehension.understood).toContain('DJ Martin');
      expect(comprehension.understood).toContain('1000');
      expect(comprehension.understood).toContain('1500');
    });

    test('should generate recommendations based on context', async () => {
      const mockEntity = {
        id: 'vendor_1',
        domain: 'wedding',
        content: {
          entity_type: 'vendor',
          name: 'Photographer',
          cost: 2000
        }
      };

      const comprehension = await AIComprehensionEngine.analyze(
        mockEntity as any,
        { content: { cost: 3000 } },
        [
          {
            projection: 'Finance',
            reason: 'Budget total will increase',
            entities_affected: ['phase_1', 'phase_2']
          }
        ]
      );

      expect(comprehension.recommendations).toBeDefined();
      expect(Array.isArray(comprehension.recommendations)).toBe(true);
    });
  });

  describe('AI Comprehension Display Component', () => {
    test('should display loading state', () => {
      const mockComprehension = null;
      
      const { container } = render(
        <AIComprehensionDisplay
          comprehension={mockComprehension}
          loading={true}
          onConfirm={jest.fn()}
          onCorrect={jest.fn()}
          onAskFollowUp={jest.fn()}
        />
      );

      expect(container.querySelector('.ai-comprehension--loading')).toBeTruthy();
      expect(container.querySelector('.spinner')).toBeTruthy();
    });

    test('should display understood section', () => {
      const mockComprehension = {
        understood: 'Update vendor "DJ Martin" cost from €1000 to €1500',
        impacts: [],
        recommendations: [],
        confidence: 0.85
      };

      const { container } = render(
        <AIComprehensionDisplay
          comprehension={mockComprehension}
          loading={false}
          onConfirm={jest.fn()}
          onCorrect={jest.fn()}
          onAskFollowUp={jest.fn()}
        />
      );

      expect(screen.getByText(/What I Understood/i)).toBeTruthy();
      expect(screen.getByText(/DJ Martin/)).toBeTruthy();
      expect(container.querySelector('.confidence-bar')).toBeTruthy();
    });

    test('should display confidence level', () => {
      const mockComprehension = {
        understood: 'Update vendor cost',
        impacts: [],
        recommendations: [],
        confidence: 0.95
      };

      render(
        <AIComprehensionDisplay
          comprehension={mockComprehension}
          loading={false}
          onConfirm={jest.fn()}
          onCorrect={jest.fn()}
          onAskFollowUp={jest.fn()}
        />
      );

      expect(screen.getByText(/Confidence: 95%/)).toBeTruthy();
    });

    test('should display uncertainties if present', () => {
      const mockComprehension = {
        understood: 'Update vendor cost',
        impacts: [],
        recommendations: [],
        confidence: 0.7,
        uncertainties: [
          'Vendor name might be incomplete',
          'Cost seems unusually high'
        ]
      };

      render(
        <AIComprehensionDisplay
          comprehension={mockComprehension}
          loading={false}
          onConfirm={jest.fn()}
          onCorrect={jest.fn()}
          onAskFollowUp={jest.fn()}
        />
      );

      expect(screen.getByText(/I'm Less Sure About/i)).toBeTruthy();
      expect(screen.getByText(/Vendor name might be incomplete/)).toBeTruthy();
      expect(screen.getByText(/Cost seems unusually high/)).toBeTruthy();
    });

    test('should display impacts on other projections', () => {
      const mockComprehension = {
        understood: 'Update vendor cost',
        impacts: [
          {
            projection: 'Finance',
            reason: 'Budget total will increase',
            entities_affected: ['budget_1']
          },
          {
            projection: 'Timeline',
            reason: 'Phase totals will recalculate',
            entities_affected: ['phase_1', 'phase_2']
          }
        ],
        recommendations: [],
        confidence: 0.85
      };

      const { container } = render(
        <AIComprehensionDisplay
          comprehension={mockComprehension}
          loading={false}
          onConfirm={jest.fn()}
          onCorrect={jest.fn()}
          onAskFollowUp={jest.fn()}
        />
      );

      expect(screen.getByText(/This Will Impact/i)).toBeTruthy();
      expect(container.querySelectorAll('.ai-comprehension__impact-card')).toHaveLength(2);
    });

    test('should display recommendations', () => {
      const mockComprehension = {
        understood: 'Update vendor cost',
        impacts: [],
        recommendations: [
          'Consider reviewing similar vendor costs',
          'Check if timeline needs adjustment'
        ],
        confidence: 0.85
      };

      render(
        <AIComprehensionDisplay
          comprehension={mockComprehension}
          loading={false}
          onConfirm={jest.fn()}
          onCorrect={jest.fn()}
          onAskFollowUp={jest.fn()}
        />
      );

      expect(screen.getByText(/My Recommendations/i)).toBeTruthy();
      expect(screen.getByText(/Consider reviewing similar vendor costs/)).toBeTruthy();
    });

    test('should call onConfirm when user clicks confirm', async () => {
      const mockOnConfirm = jest.fn().mockResolvedValue(undefined);
      const mockComprehension = {
        understood: 'Update vendor cost',
        impacts: [],
        recommendations: [],
        confidence: 0.85
      };

      render(
        <AIComprehensionDisplay
          comprehension={mockComprehension}
          loading={false}
          onConfirm={mockOnConfirm}
          onCorrect={jest.fn()}
          onAskFollowUp={jest.fn()}
        />
      );

      const confirmButton = screen.getByText(/Yes, This Is Correct/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalled();
      });
    });

    test('should show correction form when user clicks correct button', () => {
      const mockComprehension = {
        understood: 'Update vendor cost',
        impacts: [],
        recommendations: [],
        confidence: 0.85
      };

      const { container } = render(
        <AIComprehensionDisplay
          comprehension={mockComprehension}
          loading={false}
          onConfirm={jest.fn()}
          onCorrect={jest.fn()}
          onAskFollowUp={jest.fn()}
        />
      );

      const correctButton = screen.getByText(/I Need to Correct Something/i);
      fireEvent.click(correctButton);

      expect(screen.getByText(/Please Correct Me/i)).toBeTruthy();
      expect(container.querySelector('.ai-comprehension__correction-input')).toBeTruthy();
    });

    test('should call onCorrect with correction text', async () => {
      const mockOnCorrect = jest.fn().mockResolvedValue(undefined);
      const mockComprehension = {
        understood: 'Update vendor cost',
        impacts: [],
        recommendations: [],
        confidence: 0.85
      };

      render(
        <AIComprehensionDisplay
          comprehension={mockComprehension}
          loading={false}
          onConfirm={jest.fn()}
          onCorrect={mockOnCorrect}
          onAskFollowUp={jest.fn()}
        />
      );

      const correctButton = screen.getByText(/I Need to Correct Something/i);
      fireEvent.click(correctButton);

      const input = screen.getByPlaceholderText(/What did I misunderstand/i);
      fireEvent.change(input, { target: { value: 'The cost should be €2000, not €1500' } });

      const submitButton = screen.getByText(/Submit Correction/i);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnCorrect).toHaveBeenCalledWith('The cost should be €2000, not €1500');
      });
    });

    test('should show follow-up form when user clicks ask button', () => {
      const mockComprehension = {
        understood: 'Update vendor cost',
        impacts: [],
        recommendations: [],
        confidence: 0.85
      };

      const { container } = render(
        <AIComprehensionDisplay
          comprehension={mockComprehension}
          loading={false}
          onConfirm={jest.fn()}
          onCorrect={jest.fn()}
          onAskFollowUp={jest.fn()}
        />
      );

      const askButton = screen.getByText(/Ask a Follow-Up Question/i);
      fireEvent.click(askButton);

      expect(screen.getByText(/Ask Me Anything/i)).toBeTruthy();
      expect(container.querySelector('.ai-comprehension__follow-up-input')).toBeTruthy();
    });

    test('should display decision trail if entity has one', () => {
      const mockEntity = {
        id: 'vendor_1',
        content: {},
        decision_trail: [
          {
            timestamp: new Date(),
            validated_by: 'mattmez',
            correction: null,
            validation_source: 'user_confirmation'
          }
        ]
      };

      const mockComprehension = {
        understood: 'Update vendor cost',
        impacts: [],
        recommendations: [],
        confidence: 0.85
      };

      render(
        <AIComprehensionDisplay
          comprehension={mockComprehension}
          loading={false}
          onConfirm={jest.fn()}
          onCorrect={jest.fn()}
          onAskFollowUp={jest.fn()}
          entity={mockEntity as any}
        />
      );

      expect(screen.getByText(/Decision History for This Item/i)).toBeTruthy();
    });
  });

  describe('useAIComprehension Hook', () => {
    test('should initialize with null comprehension', () => {
      const { result } = renderHook(() => useAIComprehension(null, null));
      
      expect(result.current.comprehension).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    test('should load comprehension when entity and changes provided', async () => {
      const mockEntity = {
        id: 'vendor_1',
        domain: 'wedding',
        content: { cost: 1000 }
      };

      const { result } = renderHook(() => 
        useAIComprehension(mockEntity as any, { content: { cost: 1500 } })
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.comprehension).toBeTruthy();
      });
    });

    test('should clear comprehension when changes cleared', () => {
      const mockEntity = {
        id: 'vendor_1',
        domain: 'wedding',
        content: { cost: 1000 }
      };

      const { result, rerender } = renderHook(
        ({ entity, changes }) => useAIComprehension(entity, changes),
        { initialProps: { entity: mockEntity as any, changes: { content: { cost: 1500 } } } }
      );

      expect(result.current.comprehension).toBeTruthy();

      rerender({ entity: mockEntity as any, changes: {} });

      expect(result.current.comprehension).toBeNull();
    });
  });

  describe('Decision Memorization Flow', () => {
    test('complete ME→AI→validation→decision flow', async () => {
      // Step 1: User expresses intent (ME)
      const userIntent = 'Update DJ Martin cost to €1500';

      // Step 2: AI comprehends user intent
      const mockEntity = {
        id: 'vendor_1',
        domain: 'wedding',
        content: {
          entity_type: 'vendor',
          name: 'DJ Martin',
          cost: 1000
        }
      };

      const comprehension = await AIComprehensionEngine.analyze(
        mockEntity as any,
        { content: { cost: 1500 } },
        []
      );

      expect(comprehension.understood).toBeTruthy();

      // Step 3: Show comprehension to user
      const mockConfirm = jest.fn().mockResolvedValue(undefined);
      const { getByText } = render(
        <AIComprehensionDisplay
          comprehension={comprehension}
          loading={false}
          onConfirm={mockConfirm}
          onCorrect={jest.fn()}
          onAskFollowUp={jest.fn()}
        />
      );

      // Step 4: User confirms understanding
      const confirmButton = getByText(/Yes, This Is Correct/i);
      fireEvent.click(confirmButton);

      // Step 5: Decision is recorded with audit trail
      await waitFor(() => {
        expect(mockConfirm).toHaveBeenCalled();
        // In real implementation, this would create DecisionRecord with:
        // {
        //   timestamp: now,
        //   validated_by: 'mattmez',
        //   original_extraction: { name: 'DJ Martin', cost: 1000 },
        //   correction: { cost: 1500 },
        //   reason_for_certainty: 'User confirmed',
        //   is_reversible: true
        // }
      });
    });
  });
});
