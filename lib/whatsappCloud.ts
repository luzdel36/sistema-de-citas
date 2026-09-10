/** Envío y recepción de mensajes vía WhatsApp Cloud API (Meta), para el chatbot. */

const API_BASE = "https://graph.facebook.com/v21.0";

function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre}`);
  return valor;
}

export async function enviarMensaje(numeroDestino: string, texto: string): Promise<void> {
  const token = requerido("WHATSAPP_TOKEN");
  const phoneNumberId = requerido("WHATSAPP_PHONE_NUMBER_ID");

  const respuesta = await fetch(`${API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: numeroDestino,
      type: "text",
      text: { body: texto },
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`WhatsApp Cloud API respondió ${respuesta.status}: ${detalle}`);
  }
}

export type MensajeEntrante = {
  de: string;
  texto: string;
  nombreContacto: string;
};

/** Extrae el primer mensaje de texto de un payload de webhook de WhatsApp Cloud API. */
export function leerMensajeEntrante(payload: unknown): MensajeEntrante | null {
  try {
    const entry = (payload as any)?.entry?.[0];
    const cambio = entry?.changes?.[0]?.value;
    const mensaje = cambio?.messages?.[0];
    if (!mensaje || mensaje.type !== "text") return null;

    const nombreContacto = cambio?.contacts?.[0]?.profile?.name ?? "";
    return {
      de: mensaje.from,
      texto: mensaje.text?.body ?? "",
      nombreContacto,
    };
  } catch {
    return null;
  }
}
