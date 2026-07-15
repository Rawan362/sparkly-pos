"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import { useLocations } from "@/lib/useLocations";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { Stamp } from "@/components/ui/Stamp";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldInputClass } from "@/components/ui/Field";
import type { Location } from "@/lib/types";

export default function LocationsPage() {
  const { sellerId } = useSeller();
  const { t } = useSettings();
  const { locations, loading, reload } = useLocations();
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (id: string, patch: Partial<Location>) => {
    const { error } = await supabase.from("locations").update(patch).eq("id", id);
    if (error) setError(error.message);
    else reload();
  };

  const makeDefault = async (id: string) => {
    if (!sellerId) return;
    await supabase.from("locations").update({ is_default: false }).eq("chat_id", sellerId);
    await supabase.from("locations").update({ is_default: true }).eq("id", id);
    reload();
  };

  const remove = async (loc: Location) => {
    if (!locations || locations.length <= 1) {
      setError("A seller needs at least one location — add another before removing this one.");
      return;
    }
    if (loc.is_default) {
      setError("Set a different location as default before removing this one.");
      return;
    }
    if (!window.confirm(`Remove "${loc.name}"? Stock records for this location will remain but won't show anywhere.`)) {
      return;
    }
    const { error } = await supabase.from("locations").delete().eq("id", loc.id);
    if (error) setError(error.message);
    else reload();
  };

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <p className="mb-1 text-sm">
            <Link href="/settings" className="text-ink-soft hover:text-ink">
              {t("Settings")}
            </Link>
            <span className="text-ink-faint"> / {t("Locations")}</span>
          </p>
          <h1 className="text-2xl font-semibold">{t("Locations")}</h1>
          <p className="text-sm text-ink-soft">
            {t("Everywhere you sell from. Stock is tracked separately per location.")}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised"
        >
          {t("+ Add Location")}
        </button>
      </div>

      {showAdd && sellerId && (
        <AddLocationModal
          sellerId={sellerId}
          onClose={() => setShowAdd(false)}
          onCreated={reload}
        />
      )}

      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-stamp-red/40 bg-stamp-red-soft px-4 py-2.5 text-sm text-stamp-red">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 font-medium hover:opacity-70">
            {t("Dismiss")}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-ink-soft">{t("Loading locations…")}</p>
      ) : !locations || locations.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          {t("No locations yet.")}
        </div>
      ) : (
        <div className="paper-card overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-medium">{t("Name")}</th>
                <th className="px-4 py-3 font-medium">{t("Address")}</th>
                <th className="px-4 py-3 font-medium">{t("City")}</th>
                <th className="px-4 py-3 font-medium">{t("Country")}</th>
                <th className="px-4 py-3 font-medium">{t("Default")}</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id} className="border-b border-paper-line last:border-0">
                  <td className="px-2 py-1.5 font-medium" dir="auto">
                    <InlineEdit value={loc.name} onSave={(v) => update(loc.id, { name: v })} />
                  </td>
                  <td className="px-2 py-1.5 text-ink-soft" dir="auto">
                    <InlineEdit
                      value={loc.address ?? ""}
                      placeholder="—"
                      onSave={(v) => update(loc.id, { address: v || null })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-ink-soft" dir="auto">
                    <InlineEdit
                      value={loc.city ?? ""}
                      placeholder="—"
                      onSave={(v) => update(loc.id, { city: v || null })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-ink-soft" dir="auto">
                    <InlineEdit
                      value={loc.country ?? ""}
                      placeholder="—"
                      onSave={(v) => update(loc.id, { country: v || null })}
                    />
                  </td>
                  <td className="px-4 py-1.5">
                    {loc.is_default ? (
                      <Stamp tone="brass">{t("Default")}</Stamp>
                    ) : (
                      <button
                        onClick={() => makeDefault(loc.id)}
                        className="text-xs font-medium text-ink-soft underline decoration-dotted hover:text-brass-dark"
                      >
                        {t("Set as default")}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    <button
                      onClick={() => remove(loc)}
                      className="text-xs font-medium text-stamp-red hover:opacity-70"
                    >
                      {t("Remove")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddLocationModal({
  sellerId,
  onClose,
  onCreated,
}: {
  sellerId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useSettings();
  const [form, setForm] = useState({ name: "", address: "", city: "", country: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase.from("locations").insert({
      chat_id: sellerId,
      name: form.name.trim(),
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      is_default: false,
    });
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <Modal title={t("New Location")} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={t("Name")}>
          <input
            autoFocus
            dir="auto"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={fieldInputClass}
          />
        </Field>
        <Field label={t("Address")}>
          <input
            dir="auto"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className={fieldInputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("City")}>
            <input
              dir="auto"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className={fieldInputClass}
            />
          </Field>
          <Field label={t("Country")}>
            <input
              dir="auto"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              className={fieldInputClass}
            />
          </Field>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-paper-line px-4 py-2 text-sm font-medium text-ink-soft"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? t("Saving…") : t("Create location")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
