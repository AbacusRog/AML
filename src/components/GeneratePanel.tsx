import { useState } from 'react';
import { generateAll } from '../lib/docGen';
import { saveDirectorLinks } from '../lib/directorLinks';
import type { Client } from '../types';

interface Props {
  company: Client | null;
  directors: Client[];
}

export default function GeneratePanel({ company, directors }: Props) {
  const [wantLetter, setWantLetter] = useState(true);
  const [wantAml, setWantAml] = useState(true);
  const [reviewerName, setReviewerName] = useState('Roger Biddlecombe');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{ msg: string; err?: boolean }[]>([]);

  const disabled = busy || !(company || directors.length) || (!wantLetter && !wantAml);

  async function handleGenerate() {
    setBusy(true);
    setLog([]);
    if (company && directors.length) {
      // Quietly remember this pairing so it's auto-suggested next time —
      // no need for a separate save step in the common case.
      saveDirectorLinks(company.id, directors.map((d) => d.id)).catch(() => {});
    }
    await generateAll({
      company,
      directors,
      wantLetter,
      wantAml,
      reviewerName: reviewerName.trim(),
      onProgress: (msg, err) => setLog((l) => [{ msg, err }, ...l]),
    });
    setBusy(false);
  }

  return (
    <div>
      <div className="mb-4 space-y-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={wantLetter} onChange={(e) => setWantLetter(e.target.checked)} />
          Engagement letter (Word)
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={wantAml} onChange={(e) => setWantAml(e.target.checked)} />
          AML periodic review (PDF)
        </label>
      </div>

      <label className="block text-xs text-[#3E4C63] mb-1">Reviewer name (AML form)</label>
      <input
        type="text"
        value={reviewerName}
        onChange={(e) => setReviewerName(e.target.value)}
        className="w-full mb-4 px-3 py-2 border border-[#DAD5C9] rounded-sm outline-none focus:border-gold text-sm"
      />

      <button
        type="button"
        disabled={disabled}
        onClick={handleGenerate}
        className="w-full py-3 bg-gold hover:bg-goldDeep text-white rounded-sm font-semibold disabled:bg-[#DAD5C9] disabled:text-[#3E4C63] disabled:cursor-not-allowed"
      >
        {busy ? 'Generating…' : 'Generate & download'}
      </button>

      {log.length > 0 && (
        <div className="mt-3 text-xs text-[#3E4C63] max-h-40 overflow-y-auto">
          {log.map((l, i) => (
            <div key={i} className={`py-1 border-b border-dotted border-[#DAD5C9] ${l.err ? 'text-red-700' : ''}`}>
              {l.msg}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[#3E4C63] mt-4 leading-relaxed">
        Letters carry today's date. The AML review defaults every Yes/No/N-A row to <strong>Yes</strong>,
        overall risk to <strong>Low</strong>, and the decision to{' '}
        <strong>Continue without additional conditions</strong> — open the downloaded PDF to adjust any
        of that before sending.
      </p>
    </div>
  );
}
