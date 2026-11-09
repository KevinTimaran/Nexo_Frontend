import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Lightbulb,
  Leaf,
  Scale,
  Rocket,
  Book,
  Compass,
  Folder as FolderIcon,
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import type { NewProjectInput, ProjectIcon, Folder } from "../../domain/types";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: NewProjectInput) => Promise<void>;
  folders?: Folder[];
  initialFolderId?: string | null;
}

const PROJECT_ICONS: Array<{
  key: ProjectIcon;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "lightbulb", label: "Idea / Innovación", icon: Lightbulb },
  { key: "leaf", label: "Sostenibilidad", icon: Leaf },
  { key: "scale", label: "Legal / Regulación", icon: Scale },
  { key: "rocket", label: "Lanzamiento / Estrategia", icon: Rocket },
  { key: "book", label: "Educación / Investigación", icon: Book },
  { key: "compass", label: "Exploración / Visión", icon: Compass },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  folders = [],
  initialFolderId = null,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<ProjectIcon>("lightbulb");
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t("projects.create.nameRequired", "El nombre del proyecto es obligatorio"));
      return;
    }

    if (description.length > 150) {
      setError(t("projects.create.descriptionTooLong", "La descripción no puede exceder 150 caracteres"));
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim().slice(0, 150),
        icon,
        folderId: folderId || null,
      });
      setName("");
      setDescription("");
      setIcon("lightbulb");
      setFolderId(initialFolderId);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("projects.create.error", "Error al crear el proyecto");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("projects.create.title", "Nuevo proyecto")}
      description={t("projects.create.description", "Configura tu nuevo espacio de trabajo conceptual")}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name input */}
        <Input
          label={t("projects.create.name", "Nombre del proyecto")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("projects.create.namePlaceholder", "Ej. Plataforma de reciclaje inteligente")}
          error={error || undefined}
          maxLength={60}
          autoFocus
        />

        {/* Curated Icon Selector */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs font-medium text-[var(--text-main)] dark:text-[var(--text-muted)]">
            Ícono temático
          </label>
          <div
            className="grid grid-cols-6 gap-2 p-1.5 rounded-2xl bg-[var(--bg-app)] border border-[var(--line)]"
            role="radiogroup"
            aria-label="Ícono temático del proyecto"
          >
            {PROJECT_ICONS.map((item) => {
              const IconComp = item.icon;
              const isSelected = icon === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setIcon(item.key)}
                  role="radio"
                  aria-checked={isSelected}
                  title={item.label}
                  className={`
                    flex flex-col items-center justify-center p-2.5 rounded-xl transition-all duration-200 cursor-pointer
                    ${
                      isSelected
                        ? "bg-accent-primary/20 text-accent-primary border border-accent-primary shadow-xs ring-2 ring-accent-primary/30"
                        : "text-muted hover:text-fg hover:bg-hover border border-transparent"
                    }
                  `}
                >
                  <IconComp className="w-5 h-5 shrink-0" />
                  <span className="text-[10px] mt-1 font-medium capitalize truncate w-full text-center">
                    {item.key}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Folder Selector */}
        {folders.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            <label className="text-xs font-medium text-[var(--text-main)] flex items-center gap-1.5">
              <FolderIcon className="w-3.5 h-3.5" />
              Carpeta de destino
            </label>
            <select
              value={folderId || ""}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="
                w-full rounded-xl text-[var(--text-main)] text-xs sm:text-sm p-2.5
                bg-[var(--bg-app)]
                border border-[var(--line)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]
                transition-all cursor-pointer
              "
            >
              <option value="">Sin carpeta (Raíz)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Description / Details */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs font-medium text-[var(--text-main)]">
            {t("projects.create.details", "Detalles o hipótesis inicial")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={150}
            placeholder={t(
              "projects.create.detailsPlaceholder",
              "Describe brevemente la idea, el público objetivo o los objetivos principales..."
            )}
            rows={3}
            className="
              w-full rounded-xl text-[var(--text-main)] text-xs sm:text-sm p-3 placeholder:text-[var(--text-muted)]
              bg-[var(--bg-app)]
              border border-[var(--line)]
              shadow-inner
              focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]
              transition-all duration-200 resize-none
            "
          />
          <div className="flex justify-end">
            <span className="text-muted text-xs">
              {description.length}/150
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--line)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel", "Cancelar")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="!rounded-xl shadow-sm"
            icon={<Plus className="w-4 h-4" />}
          >
            {t("projects.create.submit", "Crear proyecto")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
