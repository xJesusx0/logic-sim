export const LOGIC_COLORS = {
  // Wire and Pin stroke/fill colors
  STATE_1: '#3b82f6', // Blue (Active)
  STATE_0: '#9ca3af', // Gray (Inactive)
  STATE_Z: '#6b7280', // Darker gray (High Impedance / Disconnected)
  STATE_X: '#f97316', // Orange (Unknown / Error)
  DEFAULT: '#000000',

  // LED/Component Background colors
  LED_1: '#93c5fd', // Light Blue
  LED_0: '#e5e7eb', // Light Gray
  LED_Z: '#d1d5db',
  LED_X: '#fdba74', // Light Orange
} as const;
