import "server-only";

/**
 * How the guide hears you, on Together AI: short pieces of mic audio turned
 * into text. Whisper first (the best at picking a word out from under the
 * voice), Parakeet if it's unavailable.
 */
export const STT = {
  models: ["openai/whisper-large-v3", "nvidia/parakeet-tdt-0.6b-v3"],
  label: "Whisper on Together AI",
};

/** Text of one piece of 16 kHz mono WAV. Throws when every model fails; the message has the status, as "model 401: ...". */
export async function transcribe(wav: ArrayBuffer, key: string, signal?: AbortSignal) {
  let last = "";
  for (const model of STT.models) {
    const form = new FormData();
    form.set("file", new Blob([wav], { type: "audio/wav" }), "talk.wav");
    form.set("model", model);
    form.set("language", "en");
    form.set("temperature", "0");
    form.set("response_format", "json");
    try {
      const r = await fetch("https://api.together.ai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal });
      if (r.ok) return String(((await r.json()) as { text?: unknown }).text ?? "").trim();
      last = `${model} ${r.status}: ${(await r.text()).slice(0, 160)}`;
      // a bad key or no credit fails the same way on every model
      if (r.status === 401 || r.status === 402 || r.status === 403) break;
    } catch (e) {
      if (signal?.aborted) throw e;
      last = `${model}: ${(e as Error).message}`;
    }
  }
  throw new Error(last || "no model");
}
