import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./App.module.css";

// ----- Toasts -----------------------------------------------------------

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  ttl: number;
}

interface ToastAPI {
  toast: (
    message: string,
    opts?: {
      kind?: ToastKind;
      actionLabel?: string;
      onAction?: () => void;
      ttl?: number;
    }
  ) => void;
}

const ToastContext = createContext<ToastAPI | null>(null);

let toastCounter = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
    const t = timers.current[id];
    if (t) {
      clearTimeout(t);
      delete timers.current[id];
    }
  }, []);

  const toast = useCallback<ToastAPI["toast"]>(
    (message, opts) => {
      const id = ++toastCounter;
      const kind = opts?.kind ?? "success";
      const ttl = opts?.ttl ?? (opts?.actionLabel ? 6000 : 3200);
      setToasts((ts) => [
        ...ts,
        {
          id,
          kind,
          message,
          actionLabel: opts?.actionLabel,
          onAction: opts?.onAction,
          ttl,
        },
      ]);
      timers.current[id] = setTimeout(() => dismiss(id), ttl);
    },
    [dismiss]
  );

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={styles.toastStack} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${
              t.kind === "error"
                ? styles.toastError
                : t.kind === "info"
                ? styles.toastInfo
                : styles.toastSuccess
            }`}
          >
            <span className={styles.toastMessage}>{t.message}</span>
            {t.actionLabel && (
              <button
                type="button"
                className={styles.toastAction}
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              className={styles.toastDismiss}
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

// ----- Confirm dialog ---------------------------------------------------

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmAPI = (opts: ConfirmOpts) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmAPI | null>(null);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<
    (ConfirmOpts & { resolve: (v: boolean) => void }) | null
  >(null);

  const confirm = useCallback<ConfirmAPI>((opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const close = (v: boolean) => {
    if (!state) return;
    state.resolve(v);
    setState(null);
  };

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className={styles.modalOverlay}
          onClick={() => close(false)}
          role="presentation"
        >
          <div
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-title" className={styles.confirmTitle}>
              {state.title}
            </h3>
            {state.message && (
              <p className={styles.confirmMessage}>{state.message}</p>
            )}
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancel}
                onClick={() => close(false)}
              >
                {state.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className={
                  state.destructive
                    ? styles.confirmDestructive
                    : styles.confirmPrimary
                }
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmLabel ?? "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export function useConfirm(): ConfirmAPI {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}

// ----- Keyboard-offset hook (for keyboard-aware overlays) --------------

/** How many CSS pixels of the layout viewport are covered by the virtual
 * keyboard (plus iOS's form-accessory strip). Zero when the keyboard is
 * closed or the API is unavailable. Callers apply this as `padding-bottom`
 * inside a scrollable overlay so content can scroll fully into view above
 * the keyboard. */
export function useKeyboardOffset(active: boolean): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      // `offsetTop` accounts for the URL bar sitting above the visual
      // viewport; the residual is the keyboard's bite from the layout viewport.
      const bite = window.innerHeight - vv.height - vv.offsetTop;
      setOffset(Math.max(0, bite));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);
  return offset;
}

// ----- Search overlay --------------------------------------------------
//
// The <input> stays mounted whether the overlay is open or closed, so the
// tap that opens it delivers a real user-gesture focus event — iOS pops
// the keyboard synchronously with no programmatic-focus workarounds.
// The overlay covers `top:0; bottom:0` so its background paints through
// the keyboard-accessory strip; the scrollable results get
// `padding-bottom = keyboardOffset` so the last tile scrolls fully into
// view above the keyboard.

interface SearchOverlayProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  placeholder?: string;
  countLabel?: React.ReactNode;
  children: React.ReactNode;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  open,
  onOpen,
  onClose,
  searchTerm,
  setSearchTerm,
  placeholder = "Search",
  countLabel,
  children,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardOffset = useKeyboardOffset(open);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        inputRef.current?.blur();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const handleCancel = () => {
    setSearchTerm("");
    inputRef.current?.blur();
    onClose();
  };

  return (
    <div
      className={`${styles.searchWrapper} ${
        open ? styles.searchWrapperOpen : ""
      }`}
      role={open ? "dialog" : undefined}
      aria-label={open ? "Search" : undefined}
    >
      <div className={styles.searchBar}>
        <div className={styles.searchInputWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">
            <Icon.Search size={18} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={onOpen}
            placeholder={placeholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="done"
          />
          {searchTerm && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setSearchTerm("");
                inputRef.current?.focus();
              }}
              className={styles.clearSearch}
              aria-label="Clear search"
            >
              <Icon.Close size={16} />
            </button>
          )}
        </div>
        {open && (
          <button
            type="button"
            className={styles.searchOverlayCancel}
            // preventDefault on mousedown keeps the input focused
            // through the click; we blur explicitly in the handler
            // so the keyboard closes cleanly on exit.
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCancel}
          >
            Cancel
          </button>
        )}
      </div>
      {open && countLabel && (
        <div className={styles.searchOverlayCount}>{countLabel}</div>
      )}
      {open && (
        <div
          className={styles.searchOverlayResults}
          style={{
            paddingBottom: `calc(${keyboardOffset}px + 1rem + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// ----- Mobile-friendly sheet / modal -----------------------------------

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({
  open,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.sheetOverlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.sheetHeader}>
          <h2 className={styles.sheetTitle}>{title}</h2>
          <button
            type="button"
            className={styles.sheetClose}
            onClick={onClose}
            aria-label="Close"
          >
            <Icon.Close />
          </button>
        </div>
        <div className={styles.sheetBody}>{children}</div>
      </div>
    </div>
  );
};

// ----- Icons -----------------------------------------------------------

interface IconProps {
  size?: number;
  className?: string;
}

const iconStyle = (size = 20): React.CSSProperties => ({
  width: size,
  height: size,
  display: "block",
  strokeWidth: 2,
  stroke: "currentColor",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

export const Icon = {
  Today: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 3v3M16 3v3" />
      <circle cx="12" cy="14" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  ),
  History: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  Meal: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <path d="M4 3v8a3 3 0 0 0 3 3v7" />
      <path d="M7 3v8" />
      <path d="M20 3c-2.5 0-4 2-4 5v3h4" />
      <path d="M20 3v18" />
    </svg>
  ),
  Settings: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  Plus: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Minus: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  ),
  Close: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  ),
  Trash: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Search: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  ),
  Chevron: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  Copy: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  ),
  Dots: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  Dumbbell: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <path d="M2 12h2M20 12h2" />
      <rect x="4" y="8" width="3" height="8" rx="1" />
      <rect x="17" y="8" width="3" height="8" rx="1" />
      <path d="M7 12h10" />
    </svg>
  ),
  Rest: ({ size, className }: IconProps) => (
    <svg viewBox="0 0 24 24" style={iconStyle(size)} className={className} aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  ),
};
