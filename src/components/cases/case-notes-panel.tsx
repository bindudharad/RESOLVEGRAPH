"use client";

import { useState } from "react";
import { MessageSquare, Send, User } from "lucide-react";
import { useDemoCases } from "@/hooks/use-demo-cases";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/common/toast";

interface CaseNotesPanelProps {
  caseId: string;
}

export function CaseNotesPanel({ caseId }: CaseNotesPanelProps) {
  const { getCaseNotes, addCaseNote } = useDemoCases();
  const [noteText, setNoteText] = useState("");
  const { toast } = useToast();

  const notes = getCaseNotes(caseId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    addCaseNote(caseId, noteText.trim());
    setNoteText("");
    toast({
      tone: "success",
      title: "Internal Note Added (Demo)",
      description: "Appended to session activity log. Temporary demonstration record.",
    });
  };

  return (
    <div className="rg-card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-fg">Internal Triage Notes</h3>
          <p className="mt-0.5 text-[12.5px] text-subtle">
            Collaborative case annotations visible only to administrative triage officers.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-faint">
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{notes.length} notes logged</span>
        </div>
      </div>

      {/* Note submission form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add an internal observation, carrier update, or review note…"
          rows={3}
          className="w-full rounded-md border border-line bg-[#0a1120] p-3 text-[13px] text-fg placeholder:text-faint transition-[border-color,box-shadow] focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-brand)_35%,transparent)]"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] text-faint">
            Session storage only · Disappears on page refresh
          </span>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!noteText.trim()}
            icon={<Send className="h-3.5 w-3.5" />}
          >
            Post Note
          </Button>
        </div>
      </form>

      {/* Notes list */}
      <div className="mt-2 flex flex-col divide-y divide-line">
        {notes.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-faint">
            No internal notes logged yet for case {caseId}.
          </p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="flex flex-col gap-1 py-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold text-[#a08bff]">
                    <User className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[12.5px] font-medium text-fg">
                    {note.author}
                  </span>
                  <span className="rounded bg-surface-3 px-1.5 py-0.2 text-[10px] font-medium text-subtle">
                    Triage Officer
                  </span>
                </div>
                <span className="font-mono text-[11px] text-faint">
                  {formatDateTime(note.timestamp)}
                </span>
              </div>
              <p className="mt-1 pl-8 text-[12.5px] leading-relaxed text-muted">
                {note.text}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
