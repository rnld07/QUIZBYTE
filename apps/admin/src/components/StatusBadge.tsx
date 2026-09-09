import type { Enums } from '@quizbyte/database';

const STATUS_LABELS: Record<Enums<'question_status'>, string> = {
  draft: 'Entwurf',
  review: 'Review',
  published: 'Veröffentlicht',
  archived: 'Archiviert',
};

const DIFFICULTY_LABELS: Record<Enums<'difficulty_level'>, string> = {
  easy: 'leicht',
  medium: 'mittel',
  hard: 'schwer',
};

export function StatusBadge({ status }: { status: Enums<'question_status'> }) {
  return <span className={`badge badge--${status}`}>{STATUS_LABELS[status]}</span>;
}

export function DifficultyBadge({ difficulty }: { difficulty: Enums<'difficulty_level'> }) {
  return <span className={`badge badge--${difficulty}`}>{DIFFICULTY_LABELS[difficulty]}</span>;
}

export { DIFFICULTY_LABELS, STATUS_LABELS };
