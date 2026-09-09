import { NextResponse } from 'next/server';

import { STORAGE_BUCKETS } from '@quizbyte/database';

import { getElevenLabsEnv } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/audio/generate  { questionId }
 *
 * Generates the question audio ONCE via ElevenLabs (server-side, API key never
 * leaves the server), stores the MP3 in Supabase Storage and saves audio_url on
 * the question. The mobile app only ever plays the stored file.
 *
 * Returns 501 while ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID are not configured.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });

  const elevenLabs = getElevenLabsEnv();
  if (!elevenLabs) {
    return NextResponse.json(
      { error: 'Audio-Generierung ist nicht konfiguriert (ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID fehlen).' },
      { status: 501 },
    );
  }

  const body = (await request.json().catch(() => null)) as { questionId?: string } | null;
  const questionId = body?.questionId;
  if (!questionId) return NextResponse.json({ error: 'questionId fehlt.' }, { status: 400 });

  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select('id, question_text')
    .eq('id', questionId)
    .maybeSingle();
  if (questionError || !question) return NextResponse.json({ error: 'Frage nicht gefunden.' }, { status: 404 });
  if (!question.question_text.trim()) return NextResponse.json({ error: 'Die Frage hat noch keinen Text.' }, { status: 400 });

  // ElevenLabs text-to-speech (https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
  const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabs.voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': elevenLabs.apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: question.question_text,
      model_id: 'eleven_multilingual_v2',
    }),
  });

  if (!ttsResponse.ok) {
    const detail = await ttsResponse.text().catch(() => '');
    console.error('[audio/generate] ElevenLabs error', ttsResponse.status, detail);
    return NextResponse.json({ error: 'ElevenLabs hat die Anfrage abgelehnt.' }, { status: 502 });
  }

  const audio = await ttsResponse.arrayBuffer();
  const path = `${question.id}/${Date.now()}.mp3`;
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.questionAudio)
    .upload(path, audio, { contentType: 'audio/mpeg', cacheControl: '31536000', upsert: false });
  if (uploadError) return NextResponse.json({ error: `Upload fehlgeschlagen: ${uploadError.message}` }, { status: 500 });

  const { data: publicUrl } = supabase.storage.from(STORAGE_BUCKETS.questionAudio).getPublicUrl(path);
  const { error: updateError } = await supabase.from('questions').update({ audio_url: publicUrl.publicUrl }).eq('id', question.id);
  if (updateError) return NextResponse.json({ error: `Speichern fehlgeschlagen: ${updateError.message}` }, { status: 500 });

  return NextResponse.json({ audioUrl: publicUrl.publicUrl });
}
