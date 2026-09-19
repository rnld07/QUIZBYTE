'use client';

import { useState, useTransition } from 'react';

import { removeQuestionMediaAction, setQuestionMediaUrlAction } from '@/lib/actions/media';
import { uploadQuestionMedia } from '@/lib/media/questionMedia';
import type { MediaKind } from '@/lib/media/mediaLimits';

interface MediaPanelProps {
  questionId: string;
  imageUrl: string | null;
  audioUrl: string | null;
}

interface UploadState {
  error: string | null;
  url: string | null;
  pending: boolean;
}

const idle: UploadState = { error: null, url: null, pending: false };

/**
 * Image + audio management for one question (upload, replace, remove, generate).
 *
 * Die Datei geht direkt in den Bucket und nicht durch eine Server-Action: die
 * hat in Next.js ein Rumpflimit von einem Megabyte, und daran scheiterte jedes
 * Bild ueber dieser Groesse, bevor die eigene Pruefung ueberhaupt lief. An den
 * Server geht danach nur noch die Adresse.
 */
export function MediaPanel({ questionId, imageUrl, audioUrl }: MediaPanelProps) {
  const [imageState, setImageState] = useState<UploadState>(idle);
  const [audioState, setAudioState] = useState<UploadState>(idle);
  const [removing, startRemove] = useTransition();

  const upload = async (kind: MediaKind, file: File | null) => {
    const setState = kind === 'image' ? setImageState : setAudioState;
    if (!file) {
      setState({ ...idle, error: 'Bitte eine Datei auswählen.' });
      return;
    }

    setState({ error: null, url: null, pending: true });
    const uploaded = await uploadQuestionMedia(kind, file);
    if (uploaded.error) {
      setState({ error: uploaded.error, url: null, pending: false });
      return;
    }

    const saved = await setQuestionMediaUrlAction(questionId, kind, uploaded.url ?? '');
    setState({ error: saved.error, url: saved.url, pending: false });
  };

  const imagePending = imageState.pending;
  const audioPending = audioState.pending;
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const currentImage = imageState.url ?? imageUrl;
  const currentAudio = audioState.url ?? audioUrl;

  const generateAudio = async () => {
    setGenerating(true);
    setGenerateMessage(null);
    try {
      const response = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      });
      const payload = (await response.json()) as { error?: string; audioUrl?: string };
      if (!response.ok) {
        setGenerateMessage(payload.error ?? 'Audio konnte nicht erzeugt werden.');
      } else {
        setGenerateMessage('Audio erzeugt. Seite neu laden, um es anzuhören.');
        window.location.reload();
      }
    } catch {
      setGenerateMessage('Audio konnte nicht erzeugt werden.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="sticky">
      <div className="card" style={{ marginBottom: 14 }}>
        <h2>Bild (1:1)</h2>
        {currentImage ? (
          <div className="media-preview">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote admin preview, no optimisation needed */}
            <img src={currentImage} alt="Fragebild" />
          </div>
        ) : (
          <p className="help">Kein Bild hinterlegt.</p>
        )}
        {imageState.error ? <div className="error">{imageState.error}</div> : null}
        <form
          className="btn-row"
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem('file');
            void upload('image', input instanceof HTMLInputElement ? (input.files?.[0] ?? null) : null);
          }}
        >
          <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required />
          <button type="submit" className="btn btn--sm" disabled={imagePending}>
            {imagePending ? 'Wird hochgeladen…' : currentImage ? 'Ersetzen' : 'Hochladen'}
          </button>
          {currentImage ? (
            <button
              type="button"
              className="btn btn--danger btn--sm"
              disabled={removing}
              onClick={() => startRemove(() => removeQuestionMediaAction(questionId, 'image'))}
            >
              Entfernen
            </button>
          ) : null}
        </form>
      </div>

      <div className="card">
        <h2>Audio</h2>
        {currentAudio ? (
          <audio controls src={currentAudio} preload="none" />
        ) : (
          <p className="help">Kein Audio hinterlegt.</p>
        )}
        {audioState.error ? <div className="error">{audioState.error}</div> : null}
        <form
          className="btn-row"
          style={{ marginBottom: 10 }}
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem('file');
            void upload('audio', input instanceof HTMLInputElement ? (input.files?.[0] ?? null) : null);
          }}
        >
          <input type="file" name="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/wav" required />
          <button type="submit" className="btn btn--sm" disabled={audioPending}>
            {audioPending ? 'Wird hochgeladen…' : currentAudio ? 'Ersetzen' : 'Hochladen'}
          </button>
          {currentAudio ? (
            <button
              type="button"
              className="btn btn--danger btn--sm"
              disabled={removing}
              onClick={() => startRemove(() => removeQuestionMediaAction(questionId, 'audio'))}
            >
              Entfernen
            </button>
          ) : null}
        </form>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => void generateAudio()} disabled={generating}>
          {generating ? 'Wird erzeugt…' : 'Audio generieren (ElevenLabs)'}
        </button>
        <p className="help" style={{ marginTop: 8 }}>
          Erzeugt die Audiodatei einmalig serverseitig und speichert sie. Benötigt ELEVENLABS_API_KEY auf dem Server.
        </p>
        {generateMessage ? <p className="help">{generateMessage}</p> : null}
      </div>
    </div>
  );
}
