import type { TaskCategory } from '../types/task';

export interface CategoryConfig {
  id: TaskCategory;
  label: string;
  primaryColor: string;
  backgroundColor: string;
  borderColor: string;
}

// Confluence Genetics brand-aligned category colors
export const CATEGORIES: CategoryConfig[] = [
  { id: 'seed-pro', label: 'Seed Pro', primaryColor: 'var(--color-seed-pro)', backgroundColor: 'var(--color-seed-pro-bg)', borderColor: 'var(--color-seed-pro-border)' },
  { id: 'agronomy', label: 'Agronomy', primaryColor: 'var(--color-agronomy)', backgroundColor: 'var(--color-agronomy-bg)', borderColor: 'var(--color-agronomy-border)' },
  { id: 'sales', label: 'Sales', primaryColor: 'var(--color-sales)', backgroundColor: 'var(--color-sales-bg)', borderColor: 'var(--color-sales-border)' },
  { id: 'testing', label: 'Testing', primaryColor: 'var(--color-testing)', backgroundColor: 'var(--color-testing-bg)', borderColor: 'var(--color-testing-border)' },
  { id: 'samples', label: 'Samples', primaryColor: 'var(--color-samples)', backgroundColor: 'var(--color-samples-bg)', borderColor: 'var(--color-samples-border)' },
];

const VALID_CATEGORY_IDS = new Set<TaskCategory>(CATEGORIES.map(c => c.id));

export const isValidCategory = (id: string): id is TaskCategory =>
  VALID_CATEGORY_IDS.has(id as TaskCategory);

const UNKNOWN_CATEGORY_CONFIG: CategoryConfig = {
  id: 'seed-pro' as TaskCategory,
  label: 'Unknown',
  primaryColor: 'var(--color-gray-400)',
  backgroundColor: 'var(--color-gray-100)',
  borderColor: 'var(--color-gray-500)',
};

export const getCategoryConfig = (id: TaskCategory): CategoryConfig => {
  const config = CATEGORIES.find(c => c.id === id);
  if (config) {
    return config;
  }

  if (import.meta.env.DEV) {
    console.warn(`[getCategoryConfig] Unknown category ID: "${id}". This may indicate data corruption.`);
  }

  return UNKNOWN_CATEGORY_CONFIG;
};
