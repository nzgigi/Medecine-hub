"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Info } from "lucide-react";

interface ConfirmOptions {
  title?: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface DangerConfirmOptions {
  title?: string;
  detail?: string;
  confirmWord?: string;
  confirmLabel?: string;
}

interface PromptOptions {
  title?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
}

type DialogState =
  | { kind: "alert"; message: string; resolve: () => void }
  | {
      kind: "confirm";
      message: string;
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "danger-confirm";
      message: string;
      options: DangerConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      kind: "prompt";
      message: string;
      options: PromptOptions;
      resolve: (value: string | null) => void;
    };

interface DialogsApi {
  alert: (message: string) => Promise<void>;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  dangerConfirm: (message: string, options?: DangerConfirmOptions) => Promise<boolean>;
  prompt: (message: string, options?: PromptOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogsApi | null>(null);

export function useDialogs(): DialogsApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialogs doit être utilisé sous DialogProvider");
  return ctx;
}

function DialogOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl dark:border-stone-800 dark:bg-[#1a1917]">
        {children}
      </div>
    </div>
  );
}

function DialogButtons({
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmDisabled,
  danger,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  onCancel?: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          {cancelLabel || "Annuler"}
        </button>
      )}
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirmDisabled}
        className={`rounded-lg px-4 py-2 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
          danger ? "bg-red-600 hover:bg-red-700" : "bg-emerald-700 hover:bg-emerald-600"
        }`}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

function AlertDialog({ message, resolve }: { message: string; resolve: () => void }) {
  return (
    <DialogOverlay>
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Info className="h-5 w-5" />
        </div>
        <p className="whitespace-pre-wrap pt-1.5 text-sm font-semibold text-stone-800 dark:text-stone-100">
          {message}
        </p>
      </div>
      <DialogButtons confirmLabel="OK" onConfirm={resolve} />
    </DialogOverlay>
  );
}

function ConfirmDialog({
  message,
  options,
  resolve,
}: {
  message: string;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}) {
  return (
    <DialogOverlay>
      <div className="flex items-start gap-3">
        <div
          className={`rounded-lg p-2 ${
            options.danger
              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          }`}
        >
          {options.danger ? <AlertTriangle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
        </div>
        <div className="min-w-0 pt-1.5">
          {options.title && (
            <p className="mb-1 text-sm font-black text-stone-950 dark:text-white">
              {options.title}
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm font-semibold text-stone-700 dark:text-stone-200">
            {message}
          </p>
          {options.detail && (
            <p className="mt-2 whitespace-pre-wrap rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              {options.detail}
            </p>
          )}
        </div>
      </div>
      <DialogButtons
        cancelLabel={options.cancelLabel}
        confirmLabel={options.confirmLabel || "Confirmer"}
        danger={options.danger}
        onCancel={() => resolve(false)}
        onConfirm={() => resolve(true)}
      />
    </DialogOverlay>
  );
}

function DangerConfirmDialog({
  message,
  options,
  resolve,
}: {
  message: string;
  options: DangerConfirmOptions;
  resolve: (value: boolean) => void;
}) {
  const confirmWord = options.confirmWord || "SUPPRIMER";
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <DialogOverlay>
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-red-50 p-2 text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 pt-1.5">
          {options.title && (
            <p className="mb-1 text-sm font-black text-stone-950 dark:text-white">
              {options.title}
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm font-semibold text-stone-700 dark:text-stone-200">
            {message}
          </p>
          {options.detail && (
            <p className="mt-2 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              {options.detail}
            </p>
          )}
        </div>
      </div>

      <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Tape {confirmWord} pour confirmer
      </label>
      <input
        ref={inputRef}
        autoFocus
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && typed === confirmWord) resolve(true);
        }}
        placeholder={confirmWord}
        className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-950 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100 dark:focus:ring-red-950/30"
      />

      <DialogButtons
        confirmLabel={options.confirmLabel || "Supprimer définitivement"}
        danger
        confirmDisabled={typed !== confirmWord}
        onCancel={() => resolve(false)}
        onConfirm={() => resolve(true)}
      />
    </DialogOverlay>
  );
}

function PromptDialog({
  message,
  options,
  resolve,
}: {
  message: string;
  options: PromptOptions;
  resolve: (value: string | null) => void;
}) {
  const [value, setValue] = useState(options.defaultValue || "");

  return (
    <DialogOverlay>
      {options.title && (
        <p className="mb-1 text-sm font-black text-stone-950 dark:text-white">{options.title}</p>
      )}
      <p className="whitespace-pre-wrap text-sm font-semibold text-stone-700 dark:text-stone-200">
        {message}
      </p>
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && value.trim()) resolve(value.trim());
        }}
        placeholder={options.placeholder}
        className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-stone-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 dark:border-stone-700 dark:bg-[#151512] dark:text-stone-100 dark:focus:ring-emerald-900/30"
      />
      <DialogButtons
        confirmLabel={options.confirmLabel || "OK"}
        confirmDisabled={!value.trim()}
        onCancel={() => resolve(null)}
        onConfirm={() => resolve(value.trim())}
      />
    </DialogOverlay>
  );
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);

  const alert = useCallback((message: string) => {
    return new Promise<void>((resolve) => {
      setState({
        kind: "alert",
        message,
        resolve: () => {
          setState(null);
          resolve();
        },
      });
    });
  }, []);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setState({
        kind: "confirm",
        message,
        options,
        resolve: (value) => {
          setState(null);
          resolve(value);
        },
      });
    });
  }, []);

  const dangerConfirm = useCallback((message: string, options: DangerConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setState({
        kind: "danger-confirm",
        message,
        options,
        resolve: (value) => {
          setState(null);
          resolve(value);
        },
      });
    });
  }, []);

  const prompt = useCallback((message: string, options: PromptOptions = {}) => {
    return new Promise<string | null>((resolve) => {
      setState({
        kind: "prompt",
        message,
        options,
        resolve: (value) => {
          setState(null);
          resolve(value);
        },
      });
    });
  }, []);

  return (
    <DialogContext.Provider value={{ alert, confirm, dangerConfirm, prompt }}>
      {children}
      {state?.kind === "alert" && <AlertDialog message={state.message} resolve={state.resolve} />}
      {state?.kind === "confirm" && (
        <ConfirmDialog message={state.message} options={state.options} resolve={state.resolve} />
      )}
      {state?.kind === "danger-confirm" && (
        <DangerConfirmDialog
          message={state.message}
          options={state.options}
          resolve={state.resolve}
        />
      )}
      {state?.kind === "prompt" && (
        <PromptDialog message={state.message} options={state.options} resolve={state.resolve} />
      )}
    </DialogContext.Provider>
  );
}
