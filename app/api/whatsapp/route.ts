import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/negocio";
import { responder } from "@/lib/chatbot";
import { enviarMensaje, leerMensajeEntrante } from "@/lib/whatsappCloud";

/** Meta llama a este GET una sola vez, al conectar el webhook, para confirmar que es tuyo. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const modo = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const desafio = params.get("hub.challenge");

  if (modo === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(desafio, { status: 200 });
  }
  return new NextResponse("Token de verificación inválido", { status: 403 });
}

/** Meta manda un POST por cada mensaje nuevo que le llega a tu número de WhatsApp. */
export async function POST(request: NextRequest) {
  const payload = await request.json();
  const mensaje = leerMensajeEntrante(payload);

  // No es un mensaje de texto de un prospecto (puede ser un "leído", una reacción, etc.)
  if (!mensaje) return NextResponse.json({ ok: true });

  try {
    const resultado = await responder(mensaje.de, mensaje.texto);
    await enviarMensaje(mensaje.de, resultado.respuesta);

    if (resultado.escalar) {
      const numeroDueno = config.negocio.whatsapp.replace(/\D/g, "");
      const aviso = [
        `Un prospecto necesita que le contestes tú directo.`,
        `De: ${mensaje.nombreContacto || mensaje.de} (${mensaje.de})`,
        `Dijo: "${mensaje.texto}"`,
        `Motivo: ${resultado.motivo}`,
      ].join("\n");
      await enviarMensaje(numeroDueno, aviso);
    }
  } catch (error) {
    console.error("Error procesando mensaje de WhatsApp:", error);
  }

  return NextResponse.json({ ok: true });
}
