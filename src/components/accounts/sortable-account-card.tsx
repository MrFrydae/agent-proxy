"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AccountCard } from "./account-card";
import type { AccountPublic } from "@/types";

interface SortableAccountCardProps {
  account: AccountPublic;
  onUpdate: () => void;
  onDelete: () => void;
  isReordering: boolean;
  isFirst?: boolean;
}

export function SortableAccountCard({
  account,
  onUpdate,
  onDelete,
  isReordering,
  isFirst,
}: SortableAccountCardProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: account.id,
    disabled: !isReordering,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: "relative",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccountCard
        account={account}
        onUpdate={onUpdate}
        onDelete={onDelete}
        isReordering={isReordering}
        isFirst={isFirst}
        dragHandleProps={isReordering ? { attributes, listeners } : undefined}
      />
    </div>
  );
}
