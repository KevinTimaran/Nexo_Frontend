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
    <Modal isOpen={isOpen} onClose={onClose} title="Add Concept Node">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Concept Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Peer-to-peer textbook resale"
          autoFocus
        />

        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-caption font-medium text-muted">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details about this concept..."
            rows={2}
            className="w-full bg-elevated border border-line rounded-xl text-fg text-body p-3 placeholder:text-muted focus-ring transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-muted">Kind</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ConceptKind)}
              className="bg-elevated border border-line rounded-xl text-fg text-body p-2 focus-ring"
            >
              <option value="concept">Concept</option>
              <option value="viability">Viability</option>
              <option value="risk">Risk</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-caption font-medium text-muted">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ConceptStatus)}
              className="bg-elevated border border-line rounded-xl text-fg text-body p-2 focus-ring"
            >
              <option value="exploring">Exploring</option>
              <option value="confirmed">Confirmed</option>
              <option value="review">Needs Review</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary" icon={<Plus className="w-4 h-4" />}>
            Add Concept
          </Button>
        </div>
      </form>
    </Modal>
  );
};
