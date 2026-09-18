'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { STORAGE_BUCKETS } from '@quizbyte/database';

import { createStudySheetAction } from '@/lib/actions/studySheets';
import type { StudySheetActionState } from '@/lib/actions/studySheets';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface StudySheetFormProps {
  categories: { id: string; name: string }[];
  /** Folders the sheet can be filed into; empty until one is created. */
  folders: { id: string; title: string }[];
}

interface RenderedPage {
  /** The page as an image file, ready to be uploaded. */
  file: File;
  /** File extension matching the encoding – webp, or png as the fallback. */
  extension: string;
  /** Object URL for the thumbnail strip; revoked when the selection changes. */
  preview: string;
}

/**
 * How wide a rendered page is. Wide enough to read a study sheet on a phone
 * without turning every upload into a handful of megabytes.
 */
const PAGE_WIDTH = 1400;

const INITIAL: StudySheetActionState = { error: null, ok: false };

/**
 * Upload form for a study sheet.
 *
 * The PDF is turned into one image per page right here in the browser. That
 * keeps the server free of a PDF renderer (and of the native libraries one
 * needs), and it means the mobile app only ever deals with images – it shows
 * the pages, and offers the original PDF for download beside them.
 *
 * The files then go straight from here into storage; only their URLs travel
 * through the Server Action, whose body is capped at 1 MB.
 */
export function StudySheetForm({ categories, folders }: StudySheetFormProps) {
  const [state, formAction, pending] = useActionState(createStudySheetAction, INITIAL);
  const [pdf, setPdf] = useState<File | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  // "3 von 12 Seiten" while the files go up – an upload of a few megabytes is
  // not something to leave unexplained.
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // The action state keeps saying "ok" until the next submit, so the success
  // note needs a way of its own to go away.
  const [cleared, setCleared] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Object URLs are not garbage collected on their own.
  useEffect(() => () => pages.forEach((page) => URL.revokeObjectURL(page.preview)), [pages]);

  /**
   * Emptied on request, not automatically after a save: if the upload fails we
   * still have the rendered pages, and re-reading the PDF would be a wasted
   * couple of seconds.
   */
  const clear = () => {
    formRef.current?.reset();
    setPdf(null);
    setPages([]);
    setUploadError(null);
    setCleared(true);
  };

  const choosePdf = async (file: File | undefined) => {
    setRenderError(null);
    setUploadError(null);
    setPages([]);
    setPdf(file ?? null);
    setCleared(true);
    if (!file) return;

    setRendering(true);
    try {
      setPages(await renderPdfPages(file));
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : 'Das PDF konnte nicht gelesen werden.');
    } finally {
      setRendering(false);
    }
  };

  /**
   * Puts the files in storage first, then hands the action their URLs.
   *
   * The files cannot travel with the form: a Server Action body is capped at
   * 1 MB and a sheet runs to several megabytes. They go straight from here into
   * storage, on the admin's own session.
   */
  const submit = async (formData: FormData) => {
    setCleared(false);
    setUploadError(null);
    if (!pdf) {
      setUploadError('Bitte ein PDF auswählen.');
      return;
    }

    try {
      const stored = await uploadStudySheetFiles(pdf, pages, setUploading);
      formData.set('pdfUrl', stored.pdfUrl);
      for (const url of stored.pageUrls) formData.append('pageUrls', url);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Der Upload ist fehlgeschlagen.');
      return;
    } finally {
      setUploading(null);
    }

    formAction(formData);
  };

  return (
    <form
      ref={formRef}
      action={(formData) => {
        void submit(formData);
      }}
      className="card"
    >
      <div className="field">
        <label htmlFor="sheet-title">Titel</label>
        <input id="sheet-title" name="title" required minLength={3} maxLength={120} placeholder="z. B. OSI-Modell kompakt" />
      </div>

      <div className="field">
        <label htmlFor="sheet-description">Beschreibung</label>
        <textarea id="sheet-description" name="description" rows={3} maxLength={500} placeholder="Worum geht es auf diesem Lernzettel?" />
      </div>

      <div className="answers-grid">
        <div className="field">
          <label htmlFor="sheet-category">Kategorie (optional)</label>
          <select id="sheet-category" name="categoryId" defaultValue="">
            <option value="">Ohne Kategorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <p className="help">Mit Kategorie steht der Zettel in der App unter „Kategorien“ und lässt sich abfragen, ohne unter „Extra“.</p>
        </div>

        <div className="field">
          <label htmlFor="sheet-order">Sortierung</label>
          <input id="sheet-order" name="sortOrder" type="number" defaultValue={0} />
        </div>
      </div>

      <div className="field">
        <label htmlFor="sheet-folder">Ordner (optional)</label>
        <select id="sheet-folder" name="folderId" defaultValue="">
          <option value="">Ohne Ordner – steht einzeln in der App</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.title}
            </option>
          ))}
        </select>
        <p className="hint">
          Lernzettel in einem Ordner liegen in der App als Stapel übereinander. Der Ordner selbst steht an der Stelle seines
          ersten Lernzettels – die Sortierung oben gilt also weiter.
        </p>
      </div>

      <div className="field">
        <label htmlFor="sheet-pdf">PDF</label>
        <input
          id="sheet-pdf"
          name="pdf"
          type="file"
          accept="application/pdf"
          required
          onChange={(event) => void choosePdf(event.target.files?.[0])}
        />
        <p className="hint">
          Die Seiten werden beim Auswählen als Bilder gerendert – in der App wird der Lernzettel als Bildstrecke angezeigt,
          das PDF selbst steht zum Speichern daneben.
        </p>
      </div>

      {rendering ? <p className="hint">Seiten werden gerendert …</p> : null}
      {renderError ? <p className="error">{renderError}</p> : null}

      {pages.length > 0 ? (
        <div className="field">
          <label>Vorschau ({pages.length} Seiten)</label>
          <div className="sheet-preview">
            {pages.map((page, index) => (
              // eslint-disable-next-line @next/next/no-img-element -- blob: URL, not an optimisable asset
              <img key={page.preview} src={page.preview} alt={`Seite ${index + 1}`} className="sheet-preview__page" />
            ))}
          </div>
        </div>
      ) : null}

      {uploading ? <p className="hint">{uploading}</p> : null}
      {uploadError ? <p className="error">{uploadError}</p> : null}
      {state.error ? <p className="error">{state.error}</p> : null}
      {state.ok && !cleared ? (
        <div className="success btn-row">
          <span>Lernzettel gespeichert.</span>
          <button type="button" className="btn btn--sm" onClick={clear}>
            Nächsten hochladen
          </button>
        </div>
      ) : null}

      {/* Disabled after a save, so the same sheet cannot go up twice. */}
      <button
        type="submit"
        className="btn btn--primary"
        disabled={pending || rendering || uploading !== null || (state.ok && !cleared) || pages.length === 0}
      >
        {uploading ? 'Wird hochgeladen …' : pending ? 'Wird gespeichert …' : 'Lernzettel speichern'}
      </button>
    </form>
  );
}

/**
 * Uploads the PDF and its pages, and reports the public URLs.
 *
 * One folder per sheet, so removing it later is a single prefix. The pages go
 * up one at a time and numbered: the order is what makes them a document, and
 * a parallel upload would finish in whatever order the network felt like.
 */
async function uploadStudySheetFiles(
  pdf: File,
  pages: RenderedPage[],
  onProgress: (label: string) => void,
): Promise<{ pdfUrl: string; pageUrls: string[] }> {
  const supabase = createSupabaseBrowserClient();
  const bucket = supabase.storage.from(STORAGE_BUCKETS.studySheets);
  const folder = `${Date.now()}-${crypto.randomUUID()}`;

  onProgress('PDF wird hochgeladen …');
  const pdfPath = `${folder}/sheet.pdf`;
  const { error: pdfError } = await bucket.upload(pdfPath, pdf, {
    contentType: 'application/pdf',
    upsert: false,
    cacheControl: '31536000',
  });
  if (pdfError) throw new Error(`Das PDF konnte nicht hochgeladen werden: ${pdfError.message}`);

  const pageUrls: string[] = [];
  for (const [index, page] of pages.entries()) {
    onProgress(`Seite ${index + 1} von ${pages.length} …`);
    // Leading zeros so the storage listing keeps page order too.
    const path = `${folder}/page-${String(index + 1).padStart(3, '0')}.${page.extension}`;
    const { error } = await bucket.upload(path, page.file, {
      contentType: page.file.type,
      upsert: false,
      cacheControl: '31536000',
    });
    if (error) throw new Error(`Seite ${index + 1} konnte nicht hochgeladen werden: ${error.message}`);
    pageUrls.push(bucket.getPublicUrl(path).data.publicUrl);
  }

  return { pdfUrl: bucket.getPublicUrl(pdfPath).data.publicUrl, pageUrls };
}

/**
 * A page as an image file.
 *
 * WEBP where the browser can write it: a rendered page is mostly white, and at
 * this width a PNG runs to a megabyte or more per page while a high-quality
 * WEBP is a fraction of that – for a sheet that is uploaded once and then
 * downloaded by everyone. PNG is the fallback, and both are allowed by the
 * bucket. `toBlob` hands back a PNG on its own when it cannot do WEBP, which is
 * why the type is read off the blob instead of assumed.
 */
async function encodePage(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
}

/**
 * Renders every page of the PDF to an image.
 *
 * pdf.js is imported lazily so its bundle is only fetched once someone actually
 * opens this form, and its worker is wired up from the same package rather than
 * a CDN.
 */
async function renderPdfPages(file: File): Promise<RenderedPage[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

  const loading = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const document_ = await loading.promise;
  const pages: RenderedPage[] = [];

  try {
    for (let number = 1; number <= document_.numPages; number += 1) {
      const page = await document_.getPage(number);
      // Scale to a fixed width so a page is the same size whatever the paper was.
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: PAGE_WIDTH / base.width });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Der Browser kann gerade kein Bild zeichnen.');

      // A PDF page is transparent where nothing is drawn; without this the page
      // would come out black on a dark screen.
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: context, viewport }).promise;

      const blob = await encodePage(canvas);
      if (!blob) throw new Error(`Seite ${number} konnte nicht gerendert werden.`);
      const extension = blob.type === 'image/webp' ? 'webp' : 'png';
      pages.push({
        file: new File([blob], `page-${number}.${extension}`, { type: blob.type }),
        extension,
        preview: URL.createObjectURL(blob),
      });
    }
  } finally {
    // Frees the worker and the page cache – a 40-page PDF otherwise stays in
    // memory for as long as the form is open.
    await loading.destroy();
  }

  return pages;
}
