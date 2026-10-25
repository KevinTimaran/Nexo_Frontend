import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import type { ConceptKind, ConceptNode, ConceptStatus } from "../../domain/types";

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (node: Omit<ConceptNode, "id">) => void;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({ isOpen, onClose, onAdd }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<ConceptKind>("concept");
  const [status, setStatus] = useState<ConceptStatus>("exploring");
  const [metadata] = useState("User added");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      description: description.trim() || "Custom concept entry",
      kind,
      status,
      metadata,
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
    });

    setTitle("");
    setDescription("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("canvas.node.addTitle", { defaultValue: "Añadir Concepto al Lienzo" })}
      description={t("canvas.node.addSubtitle", { defaultValue: "Incorpora una nueva idea, validación o riesgo a tu constelación." })}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t("canvas.node.titleLabel", { defaultValue: "Título del Concepto" })}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("canvas.node.titlePlaceholder", { defaultValue: "ej. Sistema de recomendación inteligente" })}
          autoFocus
        />

        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-caption font-medium text-muted">
            {t("canvas.node.descLabel", { defaultValue: "Descripción" })}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("canvas.node.descPlaceholder", { defaultValue: "Detalles e hipótesis de este concepto..." })}
            rows={3}
            className="w-full bg-surface-secondary/70 border border-line-soft rounded-2xl text-fg text-body p-3 placeholder:text-muted focus-ring transition-colors resize-none backdrop-blur-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-muted">
              {t("canvas.node.kindLabel", { defaultValue: "Tipo de Nodo" })}
            </label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ConceptKind)}
              className="bg-surface-secondary/70 border border-line-soft rounded-xl text-fg text-body p-2.5 focus-ring backdrop-blur-xs"
            >
              <option value="concept">{t("kinds.concept")}</option>
              <option value="viability">{t("kinds.viability")}</option>
              <option value="risk">{t("kinds.risk")}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-muted">
              {t("canvas.node.statusLabel", { defaultValue: "Estado Inicial" })}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ConceptStatus)}
              className="bg-surface-secondary/70 border border-line-soft rounded-xl text-fg text-body p-2.5 focus-ring backdrop-blur-xs"
            >
              <option value="exploring">{t("nodeStatus.exploring")}</option>
              <option value="confirmed">{t("nodeStatus.confirmed")}</option>
              <option value="review">{t("nodeStatus.review")}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-line-soft">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary" icon={<Plus className="w-4 h-4" />}>
            {t("canvas.node.submit", { defaultValue: "Crear Concepto" })}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
