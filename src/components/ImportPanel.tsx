import { useState, ChangeEvent } from 'react';
import { parseClientWorkbook, importClients } from '../lib/importClients';

export default function ImportPanel() {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus('Reading workbook…');
    try {
      const rows = await parseClientWorkbook(file);
      setStatus(`Importing ${rows.length} clients…`);
      const { imported, failed } = await importClients(rows, (done, total) =>
        setStatus(`Importing… ${done} / ${total}`)
      );
      setStatus(
        failed
          ? `Imported ${imported}, ${failed} failed — check the console for details.`
          : `Imported ${imported} clients.`
      );
    } catch (err) {
      setStatus(`Import failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <p className="text-xs text-[#3E4C63] mb-3">
        Only needed once, or whenever you want to refresh from a new export — existing clients are
        matched by client code and updated in place, not duplicated.
      </p>
      <label className="inline-block text-sm px-4 py-2 border border-[#DAD5C9] rounded-sm cursor-pointer hover:border-gold">
        {busy ? 'Working…' : 'Upload client export (.xlsx)'}
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={busy} />
      </label>
      {status && <p className="text-xs text-[#3E4C63] mt-3">{status}</p>}
    </div>
  );
}
