"use client";

import { useState } from "react";
import clsx from "clsx";
import { useStaff } from "@/lib/StaffContext";
import { Modal } from "@/components/ui/Modal";
import type { StaffMember } from "@/lib/types";

export function StaffSwitcher() {
  const { staffMembers, currentStaff, actorName, switchToStaff, switchToOwner } =
    useStaff();
  const [open, setOpen] = useState(false);
  const [pinFor, setPinFor] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  if (staffMembers.length === 0) return null;

  const closeAll = () => {
    setOpen(false);
    setPinFor(null);
    setPinInput("");
    setPinError(false);
  };

  const attemptPin = (staff: StaffMember) => {
    if (switchToStaff(staff, pinInput)) {
      closeAll();
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded border border-paper-line px-3 py-1.5 text-left text-xs font-medium text-ink-soft transition-colors hover:border-brass hover:text-brass-dark"
      >
        Working as: <span className="font-semibold">{actorName}</span> · Switch
      </button>

      {open && (
        <Modal title="Switch user" onClose={closeAll}>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                switchToOwner();
                closeAll();
              }}
              className={clsx(
                "rounded-md border px-4 py-2.5 text-left text-sm font-medium transition-colors",
                !currentStaff
                  ? "border-brass bg-brass-soft/60 text-brass-dark"
                  : "border-paper-line text-ink-soft hover:border-brass"
              )}
            >
              Owner / Admin {!currentStaff && "(current)"}
            </button>

            {staffMembers.map((m) => (
              <div key={m.id} className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setPinFor(m.id);
                    setPinError(false);
                  }}
                  className={clsx(
                    "rounded-md border px-4 py-2.5 text-left text-sm font-medium transition-colors",
                    currentStaff?.id === m.id
                      ? "border-brass bg-brass-soft/60 text-brass-dark"
                      : "border-paper-line text-ink-soft hover:border-brass"
                  )}
                >
                  {m.name}{" "}
                  <span className="text-xs font-normal text-ink-faint">
                    ({m.role}){currentStaff?.id === m.id ? " · current" : ""}
                  </span>
                </button>
                {pinFor === m.id && (
                  <div className="flex items-center gap-2 pl-2">
                    <input
                      autoFocus
                      type="password"
                      inputMode="numeric"
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setPinError(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") attemptPin(m);
                      }}
                      placeholder="Enter PIN"
                      className="tabular w-32 rounded-md border border-paper-line bg-paper px-3 py-1.5 text-sm outline-none focus:border-brass"
                    />
                    <button
                      onClick={() => attemptPin(m)}
                      className="rounded-md bg-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-paper-raised"
                    >
                      Confirm
                    </button>
                    {pinError && (
                      <span className="text-xs text-stamp-red">Wrong PIN</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
