import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import type { NewProjectInput } from "../../domain/types";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: NewProjectInput) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t("projects.create.nameRequired"));
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ name, description });
      setName("");
      setDescription("");
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
      title={t("projects.create.title")}
      description={t("projects.create.description")}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t("projects.create.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("projects.create.namePlaceholder")}
          error={error || undefined}
          autoFocus
        />

        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs font-medium text-[var(--text-main)] dark:text-[var(--text-muted)]">
            {t("projects.create.details")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("projects.create.detailsPlaceholder")}
            rows={3}
            className="
              w-full rounded-xl text-[var(--text-main)] text-xs sm:text-sm p-3 placeholder:text-[var(--text-muted)] dark:placeholder:text-[var(--text-muted)]
              bg-[var(--bg-app)] dark:bg-[var(--bg-app)]
              border border-[var(--border-main)] dark:border-[var(--border-main)]
              shadow-inner dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]
              focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)] dark:focus:border-[var(--color-accent)]
              transition-all duration-200 resize-none
            "
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-main)] dark:border-[var(--border-main)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="!rounded-xl !bg-[var(--color-primary)] hover:!bg-[var(--color-accent)] !text-[var(--text-main)] shadow-sm"
            icon={<Plus className="w-4 h-4" />}
          >
            {t("projects.create.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
