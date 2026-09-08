import { ReactNode } from "react";
import { useTheme } from "../contexts/ThemeContext";

export default function ScrollableTableCard({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTheme();

  return (
    <div
      className={`${t.card} flex flex-col flex-1 min-h-0 overflow-hidden p-0! shadow-[0_0_25px_0px_rgba(0,0,0,0.18)]`}
    >
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
        {children}
      </div>
      {footer && (
        <div className="p-3 border-t border-(--border-color) flex items-center justify-between bg-(--bg-card) shrink-0">
          {footer}
        </div>
      )}
    </div>
  );
}
