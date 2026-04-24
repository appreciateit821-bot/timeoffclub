'use client';

import { Agentation as AgentationToolbar } from 'agentation';

export default function Agentation() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <AgentationToolbar />;
}
