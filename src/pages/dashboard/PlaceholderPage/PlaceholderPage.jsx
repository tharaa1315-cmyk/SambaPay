import React from 'react';
import { EmptyState } from '../../../components/feedback/EmptyState/EmptyState';
import { Construction } from 'lucide-react';

export const PlaceholderPage = ({ title }) => {
  return (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-8)', color: 'var(--color-gray-900)' }}>
        {title}
      </h1>
      <EmptyState
        icon={Construction}
        title={`${title} Module`}
        description="This module is currently under construction and will be available in a future phase."
      />
    </div>
  );
};
