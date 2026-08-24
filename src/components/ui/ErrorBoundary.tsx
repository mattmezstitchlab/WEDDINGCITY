import { Component, CSSProperties, ErrorInfo, ReactNode } from 'react';
import {
  BRAND_ACCENT,
  BRAND_BG,
  BRAND_SURFACE,
  BRAND_BORDER,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
  BRAND_TEXT_MUTED,
} from '../../game/brand';
import { reportDiagnostic, DiagnosticSource } from '../../game/diagnostics';

// ---------------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------------------------------------------------------------------
// There was no error boundary anywhere. Any exception thrown during render
// unmounted the whole React tree and left a blank black page with no message —
// indistinguishable from a slow load. The user could not tell the app had
// crashed, and nothing was recorded.
//
// Two usages:
//   - a root boundary, so the app degrades to a readable screen;
//   - scoped boundaries (e.g. around the 3D canvas), so one failing subsystem
//     does not take the entire interface down with it.
//
// Styling deliberately reuses the existing BRAND_* tokens: no new visual
// identity is introduced.
// ---------------------------------------------------------------------------

interface Props {
  children: ReactNode;
  /** Shown in the fallback, e.g. "Monde 3D". Omit for the root boundary. */
  label?: string;
  /** Diagnostics bucket this subtree belongs to. */
  source?: DiagnosticSource;
  /** Compact inline fallback instead of the full-screen one. */
  inline?: boolean;
  /** Optional wrapper around the inline fallback, to preserve host layout. */
  fallbackWrapperStyle?: CSSProperties;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    reportDiagnostic({
      source: this.props.source ?? 'render',
      severity: 'error',
      code: this.props.label ? `render_failed_${this.props.label}` : 'render_failed',
      error,
      detail: { componentStack: info.componentStack, boundary: this.props.label ?? 'root' },
    });
  }

  private handleReload = () => {
    // Reset in place first: many render errors come from transient state, and
    // a full page reload would discard unsaved work for nothing.
    this.setState({ error: null, info: null });
  };

  private handleHardReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const label = this.props.label;

    if (this.props.inline) {
      const inlineCard = (
        <div
          style={{
            maxWidth: 420,
            padding: '14px 16px',
            borderRadius: 12,
            border: `1px solid ${BRAND_BORDER}`,
            background: BRAND_SURFACE,
            color: BRAND_TEXT_SECONDARY,
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          <div style={{ color: BRAND_ACCENT, fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {label ?? 'Module'} indisponible
          </div>
          <div style={{ marginTop: 6 }}>{error.message}</div>
          <button
            onClick={this.handleReload}
            style={{
              marginTop: 10,
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${BRAND_BORDER}`,
              background: 'transparent',
              color: BRAND_TEXT_PRIMARY,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      );
      return this.props.fallbackWrapperStyle
        ? <div style={this.props.fallbackWrapperStyle}>{inlineCard}</div>
        : inlineCard;
    }

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: BRAND_BG,
          color: BRAND_TEXT_PRIMARY,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: '100%',
            background: BRAND_SURFACE,
            border: `1px solid ${BRAND_BORDER}`,
            borderRadius: 20,
            padding: '28px 30px',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: BRAND_ACCENT,
            }}
          >
            Wedding City — Interruption
          </div>

          <h1 style={{ margin: '12px 0 8px', fontSize: 20, fontWeight: 600, color: BRAND_TEXT_PRIMARY }}>
            {label ? `Le module « ${label} » a rencontré une erreur.` : 'L’application a rencontré une erreur.'}
          </h1>

          <p style={{ margin: '0 0 18px', fontSize: 13, lineHeight: 1.6, color: BRAND_TEXT_SECONDARY }}>
            Vos données locales n’ont pas été effacées. L’incident a été enregistré dans le
            System Nerve Center avec sa cause technique.
          </p>

          <div
            style={{
              background: BRAND_BG,
              border: `1px solid ${BRAND_BORDER}`,
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 11,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: BRAND_TEXT_MUTED,
              maxHeight: 160,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error.name}: {error.message}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              onClick={this.handleReload}
              style={{
                flex: 1,
                padding: '11px 16px',
                borderRadius: 10,
                border: 'none',
                background: BRAND_ACCENT,
                color: '#08090d',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reprendre
            </button>
            <button
              onClick={this.handleHardReload}
              style={{
                padding: '11px 16px',
                borderRadius: 10,
                border: `1px solid ${BRAND_BORDER}`,
                background: 'transparent',
                color: BRAND_TEXT_PRIMARY,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
