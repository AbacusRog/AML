import JSZip from 'jszip';
import { PDFDocument, PDFCheckBox } from 'pdf-lib';
import { saveAs } from 'file-saver';
import type { Client } from '../types';

import companyTemplateUrl from '../assets/Engagement_Letter_Limited_Company_TEMPLATE.docx?url';
import directorTemplateUrl from '../assets/Engagement_Letter_2026_TEMPLATE.docx?url';
import amlTemplateUrl from '../assets/Client_AML_Periodic_Review_Fillable.pdf?url';

export function fullAddress(c: Pick<Client, 'addr1' | 'addr2' | 'town' | 'county' | 'postcode'>): string {
  return [c.addr1, c.addr2, c.town, c.county, c.postcode].filter(Boolean).join(', ');
}

export function todayLong(): string {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function inOneYear(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function safeFilename(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '').trim();
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] as string)
  );
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load template at ${url}`);
  return res.arrayBuffer();
}

/** Fill a Word "Schedule of Services" template (name / address / date merge fields). */
export async function fillDocx(
  kind: 'company' | 'director',
  data: { name: string; address: string; date: string }
): Promise<Blob> {
  const url = kind === 'company' ? companyTemplateUrl : directorTemplateUrl;
  const buf = await fetchArrayBuffer(url);
  const zip = await JSZip.loadAsync(buf);
  const path = 'word/document.xml';
  let xml = await zip.file(path)!.async('string');
  xml = xml
    .replace('{name}', escapeXml(data.name))
    .replace('{address}', escapeXml(data.address || ''))
    .replace('{date}', escapeXml(data.date));
  zip.file(path, xml);
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Fill the AML periodic review PDF's real AcroForm fields for one client/director.
 * Every Yes/No/N-A row defaults to Yes, overall risk to Low, decision to
 * "Continue without additional conditions" — all still live checkboxes the
 * reviewer can flip before sending.
 */
export async function fillAmlPdf(row: Client, reviewerName: string): Promise<Blob> {
  const buf = await fetchArrayBuffer(amlTemplateUrl);
  const pdfDoc = await PDFDocument.load(buf);
  const form = pdfDoc.getForm();

  const setText = (fname: string, val: string) => {
    try {
      form.getTextField(fname).setText(val || '');
    } catch {
      /* field not present in this template — skip */
    }
  };
  const check = (fname: string) => {
    try {
      form.getCheckBox(fname).check();
    } catch {
      /* field not present — skip */
    }
  };

  setText('detail_0', row.name); // Client name / legal entity
  setText('detail_1', ''); // Trading name (if different)
  setText('detail_2', row.code); // Client reference
  setText('detail_3', ''); // Company / charity / trust number
  setText('detail_4', fullAddress(row)); // Registered / home address
  setText('detail_5', ''); // Nature of business or occupation
  setText('detail_6', ''); // Services provided by the practice
  setText('detail_7', ''); // Relationship start date
  setText('detail_8', todayLong()); // Review date
  setText('detail_9', reviewerName); // Reviewer name

  // Section review-point checkboxes vary in row count per section (found by
  // inspecting the form), so match by name pattern rather than a fixed range.
  form.getFields().forEach((field) => {
    const fname = field.getName();
    if (/^s\d+_\d+_0$/.test(fname) && field instanceof PDFCheckBox) {
      field.check(); // "Yes" column
    }
  });
  check('overall_risk_0'); // Low
  check('decision_0'); // Continue without additional conditions
  setText('next_review', inOneYear());
  setText('reviewer_sign', reviewerName);

  try {
    form.updateFieldAppearances();
  } catch {
    /* non-fatal — appearances regenerate on open in most viewers anyway */
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export interface GenerateOptions {
  company: Client | null;
  directors: Client[];
  wantLetter: boolean;
  wantAml: boolean;
  reviewerName: string;
  onProgress?: (message: string, isError?: boolean) => void;
}

/** Generate and download every requested document for the selected company/directors. */
export async function generateAll({
  company,
  directors,
  wantLetter,
  wantAml,
  reviewerName,
  onProgress,
}: GenerateOptions): Promise<void> {
  const jobs: { row: Client; kind: 'company' | 'director' }[] = [];
  if (company) jobs.push({ row: company, kind: 'company' });
  directors.forEach((d) => jobs.push({ row: d, kind: 'director' }));

  for (const { row, kind } of jobs) {
    try {
      if (wantLetter) {
        const blob = await fillDocx(kind, { name: row.name, address: fullAddress(row), date: todayLong() });
        saveAs(blob, `Engagement Letter - ${safeFilename(row.name)}.docx`);
        onProgress?.(`Engagement letter ready — ${row.name}`);
        await delay(250);
      }
      if (wantAml) {
        const blob = await fillAmlPdf(row, reviewerName);
        saveAs(blob, `AML Review - ${safeFilename(row.name)}.pdf`);
        onProgress?.(`AML review ready — ${row.name}`);
        await delay(250);
      }
    } catch (err) {
      onProgress?.(`Failed for ${row.name}: ${(err as Error).message}`, true);
    }
  }
}
