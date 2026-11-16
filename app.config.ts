export default defineAppConfig({
  ui: {
    colors: {
      primary: "violet",
      neutral: "zinc",
    },
    card: {
      slots: {
        root: "rounded-lg overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-none ring-0",
        header: "px-4 py-3.5 sm:px-5 border-b border-zinc-100 dark:border-zinc-800",
        body: "p-4 sm:p-5",
        footer: "px-4 py-3 sm:px-5 border-t border-zinc-100 dark:border-zinc-800",
      },
    },
    formField: {
      slots: {
        root: "min-w-0",
        labelWrapper: "mb-1.5 flex min-w-0 items-center justify-between gap-2",
        label: "truncate text-sm font-medium text-default",
        hint: "shrink-0 text-xs text-muted",
        help: "mt-1.5 text-xs text-muted",
        error: "mt-1.5 text-xs text-error",
      },
    },
    input: {
      defaultVariants: {
        size: "md",
        variant: "outline",
      },
    },
    select: {
      defaultVariants: {
        size: "md",
        variant: "outline",
      },
    },
    selectMenu: {
      defaultVariants: {
        size: "md",
        variant: "outline",
      },
    },
    textarea: {
      defaultVariants: {
        size: "md",
        variant: "outline",
      },
    },
    slideover: {
      slots: {
        header: "shrink-0 px-4 py-3 sm:px-5",
        body: "min-h-0 flex-1 overflow-y-auto p-4 sm:p-5",
        footer: "shrink-0 px-4 py-3 sm:px-5",
        title: "text-base font-semibold text-highlighted",
      },
      variants: {
        side: {
          right: {
            content: "max-w-full sm:max-w-lg",
          },
        },
      },
    },
    table: {
      slots: {
        root: "relative overflow-auto",
        th: "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted",
        td: "px-4 py-3 text-sm text-default whitespace-nowrap align-middle",
        empty: "py-12 text-center text-sm text-muted",
        loading: "py-12 text-center",
      },
    },
    button: {
      defaultVariants: {
        color: "primary",
      },
    },
    badge: {
      defaultVariants: {
        color: "primary",
      },
    },
  },
});
