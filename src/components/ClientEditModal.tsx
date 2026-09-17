import { useState, FormEvent } from 'react';
import { supabase } from '../supabaseClient';
import type { Client, ClientInsert } from '../types';

interface Props {
  client: Client | null; // null = creating a new client
  onClose: () => void;
  onSaved: (client: Client) => void;
  onDeleted: (id: string) => void;
}

const blank: ClientInsert = {
  code: '',
  name: '',
  type: '',
  addr1: '',
  addr2: '',
  town: '',
  county: '',
  postcode: '',
  contact_number: '',
  email: '',
  company_number: '',
};

export default function ClientEditModal({ client, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<ClientInsert>(client ? { ...client } : blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof ClientInsert) {
    return {
      value: form[key] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = { ...form, code: form.code.trim() || null };
    const query = client
      ? supabase.from('doc_generator_clients').update(payload).eq('id', client.id).select().single()
      : supabase.from('doc_generator_clients').insert(payload).select().single();
    const { data, error } = await query;
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved(data as Client);
  }

  async function handleDelete() {
    if (!client) return;
    if (!confirm(`Delete ${client.name}? This can't be undone.`)) return;
    setBusy(true);
    const { error } = await supabase.from('doc_generator_clients').delete().eq('id', client.id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDeleted(client.id);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-[#DAD5C9] rounded-sm p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
      >
        <h2 className="text-lg mb-4" style={{ fontFamily: 'Georgia, serif' }}>
          {client ? 'Edit client' : 'Add client'}
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Client code" {...field('code')} />
          <Field label="Client type" {...field('type')} placeholder="e.g. Limited Company (By Shares)" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field label="Company number" {...field('company_number')} placeholder="e.g. 12345678" />
        </div>
        <Field label="Client name" {...field('name')} required className="mb-3" />
        <Field label="Address line 1" {...field('addr1')} className="mb-3" />
        <Field label="Address line 2" {...field('addr2')} className="mb-3" />
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Field label="Town" {...field('town')} />
          <Field label="County" {...field('county')} />
          <Field label="Postcode" {...field('postcode')} />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Field label="Contact number" {...field('contact_number')} />
          <Field label="Email" {...field('email')} type="email" />
        </div>

        {error && <p className="text-sm text-red-700 mb-3">{error}</p>}

        <div className="flex items-center justify-between gap-2">
          <div>
            {client && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="text-sm text-red-700 hover:underline"
              >
                Delete client
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-[#DAD5C9] rounded-sm hover:border-gold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-sm bg-gold hover:bg-goldDeep text-white rounded-sm font-semibold disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  className,
  required,
  ...rest
}: {
  label: string;
  className?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-[#3E4C63] mb-1">{label}</label>
      <input
        {...rest}
        required={required}
        className="w-full px-3 py-2 border border-[#DAD5C9] rounded-sm outline-none focus:border-gold text-sm"
      />
    </div>
  );
}
