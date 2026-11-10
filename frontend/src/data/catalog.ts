// Experimentos y textos tomados del proyecto Unity (Assets/_Project/Experiments/*.asset).

export interface ExperimentInfo {
  id: string;
  title: string;
  tasks: string[];
}

export const EXPERIMENTS: ExperimentInfo[] = [
  { id: 'T0', title: 'Tutorial: controles y primer circuito', tasks: ['V_R1'] },
  { id: 'N1', title: 'Ley de Ohm en un circuito mixto', tasks: ['V1', 'V2', 'V3', 'I_total', 'I_R2', 'I_R4'] },
  { id: 'N1D', title: 'Ley de Ohm (armado desde cero)', tasks: ['V1', 'V2', 'V3', 'I_total', 'I_R2', 'I_R4'] },
  { id: 'N2', title: 'Leyes de Kirchhoff con dos fuentes', tasks: ['V_R1', 'V_R2', 'V_R3', 'I_R1', 'I_R2', 'I_R3'] },
];

export const DEFAULT_SUBJECT = 'Electrónica Digital';
export const SUBJECTS = [DEFAULT_SUBJECT];

export const VERDICT_LABELS: Record<string, string> = {
  Correct: 'Correcta',
  OutOfTolerance: 'Valor incorrecto',
  ReversedPolarity: 'Puntas invertidas',
  SinRegistrar: 'No la midió',
};

/** Fallas del circuito que en un laboratorio real dañarían algo: cuentan como error. */
export const SERIOUS_ISSUES = new Set(['ShortCircuit', 'ExcessivePower', 'ConflictingSources', 'LedOvercurrent', 'LedReverseOverVoltage']);

export function experimentTitle(id: string, fallback = ''): string {
  return EXPERIMENTS.find((e) => e.id === id)?.title ?? (fallback || id);
}
