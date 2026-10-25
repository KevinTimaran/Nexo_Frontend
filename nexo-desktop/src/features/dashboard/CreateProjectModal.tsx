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
          <label className="text-caption font-medium text-muted">
            {t("projects.create.details")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("projects.create.detailsPlaceholder")}
            rows={3}
            className="
              w-full rounded-xl text-fg text-body p-3 placeholder:text-muted/60
              bg-surface/85 dark:bg-white/[0.04]
              border border-line dark:border-white/10
              backdrop-blur-md
              shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)]
              dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
              focus:outline-none focus:ring-2 focus:ring-concept-fg/25 focus:border-concept-fg
              transition-all duration-200 resize-none
            "
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line/60 dark:border-white/10">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={<Plus className="w-4 h-4" />}
          >
            {t("projects.create.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
