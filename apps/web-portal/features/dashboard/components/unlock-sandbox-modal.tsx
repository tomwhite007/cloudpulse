import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Unlock } from 'lucide-react';
import { postUnlockPassphrase } from '../utils/unlock-api';

const UNLOCK_FOCUS_RING =
  'focus:outline-none focus:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950';

export function UnlockSandboxModal({
  open,
  onClose,
  onUnlocked,
  unlockImpl = postUnlockPassphrase,
}: {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
  unlockImpl?: typeof postUnlockPassphrase;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setPassphrase('');
      setError(null);
      setIsSubmitting(false);
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = passphrase.trim();
    if (!trimmed) {
      setError('Enter the evaluator passphrase.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const result = await unlockImpl(trimmed);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onUnlocked();
  }

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
            <Lock className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-white">
              Unlock Live Sandbox
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-zinc-400">
              Enter the evaluator passphrase to load live AWS telemetry.
            </p>
          </div>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="relative flex items-center">
            <label htmlFor={inputId} className="sr-only">
              Passphrase
            </label>
            <input
              ref={inputRef}
              id={inputId}
              name="passphrase"
              type="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              required
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder="Enter evaluator passphrase"
              className={`w-full rounded-xl border border-white/10 bg-zinc-900 py-3 pl-4 pr-12 text-sm text-white placeholder:text-zinc-400 ${UNLOCK_FOCUS_RING} transition-all`}
            />
            <button
              type="submit"
              disabled={isSubmitting || !passphrase.trim()}
              aria-label="Submit passphrase"
              aria-busy={isSubmitting}
              className={`absolute right-2 flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 ${UNLOCK_FOCUS_RING}`}
            >
              <Unlock className="size-4" aria-hidden="true" />
            </button>
          </div>
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white ${UNLOCK_FOCUS_RING}`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
