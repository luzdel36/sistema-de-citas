import { config } from "./negocio";

const MODELO = "claude-sonnet-5";
const API_BASE = "https://api.anthropic.com/v1/messages";

/**
 * Memoria de conversación en RAM, por número de teléfono. Vive mientras la función
 * serverless sigue "caliente" y se pierde en cada arranque en frío — mismo trato que
 * el resto del proyecto (nada de base de datos todavía). Suficiente para probar;
 * si el bot funciona bien, el siguiente escalón es Vercel KV o Supabase.
 */
type Turno = { rol: "user" | "assistant"; texto: string };
const conversaciones = new Map<string, Turno[]>();
const MAX_TURNOS = 12;

function historial(numero: string): Turno[] {
  return conversaciones.get(numero) ?? [];
}

function guardarTurno(numero: string, turno: Turno): void {
  const turnos = [...historial(numero), turno].slice(-MAX_TURNOS);
  conversaciones.set(numero, turnos);
}

function systemPrompt(): string {
  const { negocio, oferta, landing } = config;

  const preguntas = landing.preguntas
    .map((q) => `P: ${q.p}\nR: ${q.r}`)
    .join("\n\n");

  return [
    `Eres el asistente de WhatsApp de ${negocio.nombre}, una firma inmobiliaria en ${negocio.ciudad}.`,
    `Respondes SIEMPRE en español de México, nunca en inglés, sin importar en qué idioma te escriban.`,
    `Sé breve: 2-4 líneas por mensaje, como se escribe en WhatsApp, no como correo.`,
    ``,
    `Lo que ofrecen: ${oferta.nombre} (${oferta.duracionMinutos} min, ${oferta.precioTexto}).`,
    `Incluye: ${oferta.incluye.join("; ")}.`,
    ``,
    `Para quién es: ${landing.paraQuien.join("; ")}.`,
    `Para quién NO es: ${landing.noParaQuien.join("; ")}.`,
    ``,
    `Preguntas frecuentes ya resueltas (úsalas tal cual cuando apliquen):`,
    preguntas,
    ``,
    `Tu trabajo:`,
    `1. Responder dudas usando SOLO la información de arriba. No inventes precios, fechas de entrega ni datos legales que no estén aquí.`,
    `2. Si la persona se ve interesada, guiarla a agendar su presentación en ${negocio.sitio}.`,
    `3. Si preguntan algo que no está en tu información (negociar precio, condiciones especiales, quejas, algo legal específico, o cualquier cosa donde una respuesta mal dada pueda costar una venta o un problema), NO improvises: marca escalar=true.`,
    ``,
    `Responde ÚNICAMENTE con un JSON válido, sin texto extra, con esta forma exacta:`,
    `{"respuesta": "texto que se le manda al prospecto por WhatsApp", "escalar": true o false, "motivo": "si escalar es true, por qué; si no, cadena vacía"}`,
  ].join("\n");
}

export type ResultadoChatbot = {
  respuesta: string;
  escalar: boolean;
  motivo: string;
};

function respuestaFallback(): ResultadoChatbot {
  return {
    respuesta:
      "Gracias por tu mensaje. En un momento un asesor te contesta por aquí mismo.",
    escalar: true,
    motivo: "No se pudo generar una respuesta automática (error o formato inesperado).",
  };
}

export async function responder(numero: string, mensajeEntrante: string): Promise<ResultadoChatbot> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Falta la variable de entorno ANTHROPIC_API_KEY");

  const turnosPrevios = historial(numero);

  const respuesta = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 400,
      system: systemPrompt(),
      messages: [
        ...turnosPrevios.map((t) => ({ role: t.rol, content: t.texto })),
        { role: "user", content: mensajeEntrante },
      ],
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    console.error("Claude API error:", respuesta.status, detalle);
    return respuestaFallback();
  }

  const datos = await respuesta.json();
  const texto: string = datos?.content?.[0]?.text ?? "";

  let resultado: ResultadoChatbot;
  try {
    const parseado = JSON.parse(texto);
    resultado = {
      respuesta: String(parseado.respuesta ?? ""),
      escalar: Boolean(parseado.escalar),
      motivo: String(parseado.motivo ?? ""),
    };
    if (!resultado.respuesta) throw new Error("respuesta vacía");
  } catch {
    console.error("No se pudo interpretar la respuesta del modelo:", texto);
    return respuestaFallback();
  }

  guardarTurno(numero, { rol: "user", texto: mensajeEntrante });
  guardarTurno(numero, { rol: "assistant", texto: resultado.respuesta });

  return resultado;
}
