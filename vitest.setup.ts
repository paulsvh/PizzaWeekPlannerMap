import { vi } from 'vitest';

// Neutralize the `server-only` guard so server modules can be imported in tests.
vi.mock('server-only', () => ({}));

// Register @testing-library/jest-dom matchers for component tests.
import '@testing-library/jest-dom/vitest';
