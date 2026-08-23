import { useState, useRef, useEffect } from 'react';
import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_SURFACE,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import { processAgentQuery } from '../../game/researchEngine';
import { ChatMessage } from '../../types/wedding';
import { IconSparkles, IconWorld } from './Icons';

interface SpatialAiAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenResearch?: (category?: string) => void;
}

export function SpatialAiAgentDrawer({ isOpen, onClose, onOpenResearch }: SpatialAiAgentDrawerProps) {
  const store = weddingStore;
  const project = store.currentProject;
  const metrics = store.getBudgetMetrics();
  const activeTrack = store.getActiveTrack();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'agent',
      text: `Bonjour ! Je suis l’Agent Spatial de Wedding City. Je supervise les données du mariage de ${project.coupleNames} et fais le pont avec le Web en temps réel. Que souhaitez-vous savoir, chercher ou orchestrer ?`,
      timestamp: 'En direct',
      actionButtons: [
        { label: '📊 Bilan Budget & Acomptes', actionType: 'search', targetId: 'budget' },
        { label: '🍽️ Où est le traiteur ?', actionType: 'teleport', targetId: 'place_reception' },
        { label: '📷 Qui est le photographe ?', actionType: 'teleport', targetId: 'place_photo_spot' },
        { label: '🎵 État de la DJ Zone', actionType: 'teleport', targetId: 'place_dancefloor' },
      ],
    },
  ]);

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const q = textToSend || inputText;
    if (!q.trim()) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      const reply = processAgentQuery(q, {
        coupleNames: project.coupleNames,
        weddingDate: project.weddingDate,
        totalBudget: metrics.totalCommitted,
        paidBudget: metrics.paidDocsTotal,
        conflictsCount: metrics.unresolvedConflicts,
        guestsCount: project.guestCountTarget,
        activeTrackTitle: `${activeTrack.title} (${activeTrack.artist})`,
      });

      setMessages((prev) => [...prev, reply]);
    }, 400);
  };

  const handleActionButton = (btn: { actionType: string; targetId?: string }) => {
    if (btn.actionType === 'teleport' && btn.targetId) {
      if (btn.targetId === 'worldmap') {
        store.cameraTargetPos = [0, 2, 0];
        store.clearSelection();
      } else {
        store.focusPlace(btn.targetId);
      }
    } else if (btn.actionType === 'search') {
      if (btn.targetId === 'dj_zone') {
        store.setDjBoothOpen(true);
      } else if (btn.targetId === 'conflicts') {
        onClose();
      } else if (onOpenResearch) {
        onOpenResearch(btn.targetId === 'all_vendors' || btn.targetId === 'budget' ? 'all' : btn.targetId);
      }
    } else if (btn.actionType === 'fix_conflict' && btn.targetId) {
      store.resolveConflict(btn.targetId);
    }
  };

  return (
    <div style={drawerCardStyle}>
      {/* Header */}
      <div style={drawerHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={agentAvatarStyle}>
            <IconSparkles size={14} color={BRAND_ACCENT} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#ffffff' }}>
              AGENT SPATIAL & KNOWLEDGE GRAPH
            </div>
            <div style={{ fontSize: 9.5, color: BRAND_TEXT_MUTED, marginTop: 1 }}>
              Intelligence Spatiale & Recherche Web Directe
            </div>
          </div>
        </div>
        <button onClick={onClose} style={closeBtnStyle}>✕</button>
      </div>

      {/* Proactive Missing Info / Alert Strip */}
      {metrics.unresolvedConflicts > 0 && (
        <div style={alertStripStyle}>
          <div style={{ fontSize: 10, color: '#f43f5e', fontWeight: 700 }}>
            ⚠️ {metrics.unresolvedConflicts} anomalie(s) détectée(s) dans l'orchestration
          </div>
          <div style={{ fontSize: 9.5, color: '#fda4af', marginTop: 1 }}>
            Décalage photographe ou acompte en attente.
          </div>
        </div>
      )}

      {/* Messages Thread */}
      <div style={messagesScrollContainerStyle}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={msgBubbleStyle(msg.sender === 'user')}>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
                {msg.text}
              </p>

              {/* Action Buttons inside message */}
              {msg.actionButtons && msg.actionButtons.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {msg.actionButtons.map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleActionButton(btn)}
                      style={actionChipBtnStyle}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ fontSize: 9, color: BRAND_TEXT_MUTED, marginTop: 2, padding: '0 4px' }}>
              {msg.timestamp}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Suggestions */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '6px 0', borderTop: `1px solid ${BRAND_BORDER}` }}>
        {[
          'Où est le traiteur ?',
          'État de mes acomptes',
          'Qui est le photographe ?',
          'Trouve-moi un saxophoniste',
          'Voyage de noces',
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => handleSend(prompt)}
            style={quickPromptBtnStyle}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Text Input Form */}
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input
          type="text"
          placeholder="Posez une question sur votre mariage ou le Web..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={chatInputStyle}
        />
        <button onClick={() => handleSend()} style={sendBtnStyle}>
          Envoyer
        </button>
      </div>
    </div>
  );
}

const drawerCardStyle: React.CSSProperties = {
  position: 'absolute',
  top: 70,
  right: 16,
  width: 360,
  maxHeight: 'calc(100vh - 160px)',
  display: 'flex',
  flexDirection: 'column',
  background: 'rgba(18, 21, 30, 0.95)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 20,
  padding: '16px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
  zIndex: 48,
  color: BRAND_TEXT_PRIMARY,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const drawerHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: `1px solid ${BRAND_BORDER}`,
  paddingBottom: 8,
};

const agentAvatarStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 7,
  background: 'rgba(226, 180, 72, 0.12)',
  border: `1px solid ${BRAND_ACCENT}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 13,
  cursor: 'pointer',
};

const alertStripStyle: React.CSSProperties = {
  background: 'rgba(244, 63, 94, 0.1)',
  border: '1px solid rgba(244, 63, 94, 0.4)',
  borderRadius: 8,
  padding: '6px 10px',
  margin: '8px 0',
};

const messagesScrollContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  paddingRight: 4,
  margin: '8px 0',
  maxHeight: 280,
};

const msgBubbleStyle = (isUser: boolean): React.CSSProperties => ({
  maxWidth: '88%',
  background: isUser ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
  color: isUser ? '#08090d' : '#f8fafc',
  border: isUser ? 'none' : `1px solid ${BRAND_BORDER}`,
  borderRadius: 12,
  padding: '8px 12px',
});

const actionChipBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(255, 255, 255, 0.08)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '3px 7px',
  color: '#ffffff',
  fontSize: 10,
  fontWeight: 600,
  cursor: 'pointer',
};

const quickPromptBtnStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '3px 8px',
  color: BRAND_TEXT_SECONDARY,
  fontSize: 10,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};

const chatInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(0, 0, 0, 0.35)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 8,
  padding: '8px 10px',
  color: '#ffffff',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
};

const sendBtnStyle: React.CSSProperties = {
  background: BRAND_ACCENT,
  color: '#08090d',
  border: 'none',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};
