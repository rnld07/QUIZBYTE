'use client';

import { useActionState, useState, useTransition } from 'react';

import { removeQuestionMediaAction, uploadQuestionMediaAction } from '@/lib/actions/media';
import type { MediaActionState } from '@/lib/actions/media';

interface MediaPanelProps {
  questionId: string;
  imageUrl: string | null;
  audioUrl: string | null;
}

const initialState: MediaActionState = { error: null, url: null };

/** Image + audio management for one question (upload, replace, remove, generate). */
export function MediaPanel({ questionId, imageUrl, audioUrl }: MediaPanelProps) {
  const uploadImage = uploadQuestionMediaAction.bind(null, questionId, 'image');
  const uploadAudio = uploadQuestionMediaAction.bind(null, questionId, 'audio');
  const [imageState, imageAction, imagePending] = useActionState(uploadImage, initialState);
  const [audioState, audioAction, audioPending] = useActionState(uploadAudio, initialState);
  const [removing, startRemove] = useTransition();
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
        <form action={imageAction} className="btn-row">
          <input type="file" name="file" accept="image/png,image/jpeg,image/webp" required />
          <button type="submit" className="btn btn--sm" disabled={imagePending}>
            {currentImage ? 'Ersetzen' : 'Hochladen'}
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
        <form action={audioAction} className="btn-row" style={{ marginBottom: 10 }}>
          <input type="file" name="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/wav" required />
          <button type="submit" className="btn btn--sm" disabled={audioPending}>
            {currentAudio ? 'Ersetzen' : 'Hochladen'}
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
