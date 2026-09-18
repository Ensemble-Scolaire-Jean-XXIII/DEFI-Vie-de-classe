import { useTheme } from "../contexts/ThemeContext";
import { PageHeaderProps } from "../types/models";

export default function PageHeader({
  title,
  description,
  children,
}: PageHeaderProps) {
  const { t } = useTheme();

  return (
    <div className="shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="text-center sm:text-left min-w-0 w-full sm:w-auto">
        <h1 className={`${t.title} tracking-tight drop-shadow-md`}>{title}</h1>
        <p className={`${t.textMuted} mt-1 text-sm`}>{description}</p>
      </div>
      {children && (
        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-start shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
