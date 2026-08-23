export type HealthStatus =
  | 'OK'
  | 'PARTIAL'
  | 'ERROR'
  | 'NOT_IMPLEMENTED'
  | 'CONFIGURATION_REQUIRED'
  | 'UNKNOWN';

export type FeatureMaturity = 'REAL' | 'PARTIAL' | 'SIMULATED' | 'MISSING' | 'UNKNOWN';

export type ErrorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SystemModuleHealth {
  id: string;
  name: string;
  category: 'core' | 'world_3d' | 'data' | 'ai_engine' | 'audio' | 'integration';
  status: HealthStatus;
  maturity: FeatureMaturity;
  description: string;
  dependencies: string[];
  lastTestTimestamp?: string;
  latencyMs?: number;
  errorsCount: number;
  testResultSummary: string;
  fixable: boolean;
  activeActionLabel?: string;
}

export interface SystemDiagnosticError {
  id: string;
  moduleId: string;
  moduleName: string;
  title: string;
  problem: string;
  cause: string;
  severity: ErrorSeverity;
  source: string;
  detectedAt: string;
  status: 'OPEN' | 'DIAGNOSING' | 'RESOLVING' | 'RESOLVED';
  fixActionLabel: string;
  fixActionType: 'conflict_fix' | 'storage_clean' | 'timeline_recalibrate' | 'connector_reauth' | 'cache_repair';
  resolvedAt?: string;
}

export interface SystemHealthReport {
  overallHealthScore: number;
  totalModules: number;
  okModules: number;
  partialModules: number;
  errorModules: number;
  configRequiredModules: number;
  unknownModules: number;
  lastFullScanAt: string;
  isScanning: boolean;
}
