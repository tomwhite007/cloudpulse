import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnlockSandboxModal } from '../components/unlock-sandbox-modal';
import {
  assertNoAxeViolations,
  clickControl,
  renderPresenter,
  usePresenterTestLifecycle,
} from './presenter-harness';

usePresenterTestLifecycle();

describe('UnlockSandboxModal', () => {
  it('submits the passphrase and closes on success', async () => {
    const onClose = vi.fn();
    const onUnlocked = vi.fn();
    const unlockImpl = vi.fn(async () => ({ ok: true as const }));

    await renderPresenter(
      <UnlockSandboxModal open onClose={onClose} onUnlocked={onUnlocked} unlockImpl={unlockImpl} />,
    );

    fireEvent.change(screen.getByLabelText('Passphrase'), {
      target: { value: 'cloudpulse-evaluator-2026' },
    });
    await clickControl(screen.getByRole('button', { name: 'Submit passphrase' }));

    expect(unlockImpl).toHaveBeenCalledWith('cloudpulse-evaluator-2026');
    expect(onUnlocked).toHaveBeenCalledTimes(1);
  });

  it('shows an error when the passphrase is rejected', async () => {
    const unlockImpl = vi.fn(async () => ({ ok: false as const, message: 'Invalid passphrase' }));

    await renderPresenter(
      <UnlockSandboxModal open onClose={vi.fn()} onUnlocked={vi.fn()} unlockImpl={unlockImpl} />,
    );

    fireEvent.change(screen.getByLabelText('Passphrase'), { target: { value: 'nope' } });
    await clickControl(screen.getByRole('button', { name: 'Submit passphrase' }));

    expect(screen.getByRole('alert').textContent).toBe('Invalid passphrase');
    expect(screen.getByRole('dialog', { name: 'Unlock Live Sandbox' })).toBeDefined();
  });

  it('has no WCAG 2.1 AA axe violations when open', async () => {
    await renderPresenter(<UnlockSandboxModal open onClose={vi.fn()} onUnlocked={vi.fn()} />);
    await assertNoAxeViolations(screen.getByRole('dialog', { name: 'Unlock Live Sandbox' }));
  });
});
