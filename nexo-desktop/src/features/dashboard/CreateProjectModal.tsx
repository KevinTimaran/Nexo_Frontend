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
          <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
            {t("projects.create.details")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("projects.create.detailsPlaceholder")}
            rows={3}
            className="
              w-full rounded-xl text-slate-800 dark:text-zinc-100 text-xs sm:text-sm p-3 placeholder:text-slate-400 dark:placeholder:text-zinc-500
              bg-slate-100/50 dark:bg-black/40
              border border-slate-200 dark:border-white/5
              shadow-inner dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]
              focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400
              transition-all duration-200 resize-none
            "
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/80 dark:border-white/10">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="!rounded-xl !bg-blue-600 hover:!bg-blue-500 !text-white shadow-sm"
            icon={<Plus className="w-4 h-4" />}
          >
            {t("projects.create.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
