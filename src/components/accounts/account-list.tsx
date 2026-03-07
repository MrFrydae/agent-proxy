"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { ArrowUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SortableAccountCard } from "./sortable-account-card";
import { toast } from "sonner";
import type { AccountPublic } from "@/types";

function ProviderGroup({
  provider,
  label,
  groupAccounts,
  isReordering,
  onToggleReorder,
  onDragEnd,
  onUpdate,
  onDelete,
  sensors,
}: {
  provider: string;
  label: string;
  groupAccounts: AccountPublic[];
  isReordering: boolean;
  onToggleReorder: () => void;
  onDragEnd: (event: DragEndEvent, provider: string) => void;
  onUpdate: () => void;
  onDelete: () => void;
  sensors: ReturnType<typeof useSensors>;
}) {
  const showReorderButton = groupAccounts.length >= 2;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        {showReorderButton && (
          <Button
            variant={isReordering ? "default" : "outline"}
            size="sm"
            className="relative z-10"
            onClick={onToggleReorder}
          >
            {isReordering ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Done
              </>
            ) : (
              <>
                <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                Reorder
              </>
            )}
          </Button>
        )}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={(event) => onDragEnd(event, provider)}
      >
        <SortableContext
          items={groupAccounts.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {groupAccounts.map((account, index) => (
              <SortableAccountCard
                key={account.id}
                account={account}
                onUpdate={onUpdate}
                onDelete={onDelete}
                isReordering={isReordering}
                isFirst={index === 0}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

export function AccountList({ refreshKey }: { refreshKey?: number }) {
  const [accounts, setAccounts] = useState<AccountPublic[]>([]);
  const [reorderMode, setReorderMode] = useState<Record<string, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchAccounts = useCallback(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts, refreshKey]);

  const toggleReorder = useCallback((provider: string) => {
    setReorderMode((prev) => ({ ...prev, [provider]: !prev[provider] }));
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent, provider: string) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Compute reordered IDs from current state
      const groupAccounts = accounts.filter((a) => a.provider === provider);
      const oldIndex = groupAccounts.findIndex((a) => a.id === active.id);
      const newIndex = groupAccounts.findIndex((a) => a.id === (over.id as string));
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(groupAccounts, oldIndex, newIndex);
      const orderedIds = reordered.map((a) => a.id);

      // Optimistic update
      setAccounts((prev) => {
        const otherAccounts = prev.filter((a) => a.provider !== provider);
        const withPriority = reordered.map((a, i) => ({ ...a, priority: i + 1 }));
        return [...otherAccounts, ...withPriority].sort((a, b) => {
          if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
          return a.priority - b.priority;
        });
      });

      // Persist
      try {
        const res = await fetch("/api/accounts/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        });
        if (!res.ok) throw new Error("Failed");
      } catch {
        toast.error("Failed to save new order");
        fetchAccounts();
      }
    },
    [accounts, fetchAccounts]
  );

  const anthropicAccounts = accounts.filter((a) => a.provider === "anthropic");
  const openaiAccounts = accounts.filter((a) => a.provider === "openai");

  return (
    <div className="space-y-6">
      {accounts.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No accounts yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-6">
          {anthropicAccounts.length > 0 && (
            <ProviderGroup
              provider="anthropic"
              label="Anthropic (Claude)"
              groupAccounts={anthropicAccounts}
              isReordering={!!reorderMode["anthropic"]}
              onToggleReorder={() => toggleReorder("anthropic")}
              onDragEnd={handleDragEnd}
              onUpdate={fetchAccounts}
              onDelete={fetchAccounts}
              sensors={sensors}
            />
          )}
          {openaiAccounts.length > 0 && (
            <ProviderGroup
              provider="openai"
              label="OpenAI (Codex)"
              groupAccounts={openaiAccounts}
              isReordering={!!reorderMode["openai"]}
              onToggleReorder={() => toggleReorder("openai")}
              onDragEnd={handleDragEnd}
              onUpdate={fetchAccounts}
              onDelete={fetchAccounts}
              sensors={sensors}
            />
          )}
        </div>
      )}
    </div>
  );
}
