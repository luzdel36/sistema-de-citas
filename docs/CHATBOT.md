# Chatbot de WhatsApp

Contesta mensajes de WhatsApp automáticamente usando la información que ya tienes en
`negocio.config.json` (oferta, dolores, beneficios, preguntas frecuentes). Si alguien
pregunta algo que no está ahí, no improvisa: te avisa a ti por WhatsApp y le dice al
prospecto que en un momento le contestas.

Vive dentro de este mismo proyecto (`app/api/whatsapp`), así que se publica solo, junto
con la página de citas, cada vez que subes un cambio a GitHub.

---

## Lo que necesitas antes de empezar

- Una cuenta en [developers.facebook.com](https://developers.facebook.com) (usa tu Facebook
  normal, es gratis).
- Una cuenta en [console.anthropic.com](https://console.anthropic.com) con una API key
  (tiene costo por uso, pero es centavos por conversación).
- Este proyecto ya publicado en Vercel (ver [INSTALAR.md](INSTALAR.md)).

---

## 1. Crea la app de WhatsApp en Meta

1. Entra a [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Crear app**.
2. Tipo de app: **Empresa**. Ponle el nombre que quieras (ej. "GeniusHaus Bot").
3. Dentro de la app, busca el producto **WhatsApp** y aprieta **Configurar**.
4. En **API Setup** vas a ver:
   - Un **número de prueba** ya listo para usar (gratis, no necesitas SIM nueva).
   - Un **token temporal** (dura 24 horas — más abajo vemos cómo sacar uno permanente).
   - El **Phone number ID**, un número largo que vas a necesitar.
5. En **To** (destinatarios de prueba), agrega tu propio WhatsApp para poder probar el bot
   contigo mismo primero.

## 2. Saca un token permanente

El token que te da la pantalla de API Setup expira en 24 horas — sirve para probar ahí
mismo, pero no para producción.

1. Ve a **Configuración de la empresa** (business.facebook.com/settings) → **Usuarios del
   sistema**.
2. Crea un usuario del sistema (rol: Administrador).
3. Generar token → selecciona tu app de WhatsApp → marca el permiso
   `whatsapp_business_messaging` → **Generar token**.
4. Copia ese token. No expira solo (aunque lo puedes revocar cuando quieras).

## 3. Conecta las variables en Vercel

1. En tu proyecto de Vercel → **Settings** → **Environment Variables**.
2. Agrega:

   | Nombre | Valor |
   | --- | --- |
   | `WHATSAPP_TOKEN` | el token permanente del paso 2 |
   | `WHATSAPP_PHONE_NUMBER_ID` | el Phone number ID del paso 1 |
   | `WHATSAPP_VERIFY_TOKEN` | invéntate cualquier texto, ej. `geniushaus-verifica-2026` |
   | `ANTHROPIC_API_KEY` | tu API key de console.anthropic.com |

3. Aprieta **Save** y luego vuelve a publicar el proyecto (**Deployments** → los tres
   puntos del último → **Redeploy**) para que tome las variables nuevas.

## 4. Conecta el webhook

1. De vuelta en developers.facebook.com, dentro de tu app → **WhatsApp** → **Configuration**.
2. En **Webhook**, aprieta **Edit**.
3. **Callback URL:** `https://TU-PROYECTO.vercel.app/api/whatsapp`
4. **Verify token:** el mismo texto que pusiste en `WHATSAPP_VERIFY_TOKEN`.
5. **Verify and save**. Si todo está bien conectado, Meta te lo confirma al instante — si
   falla, revisa que hayas publicado (redeploy) después de agregar las variables.
6. Abajo, en **Webhook fields**, activa `messages`.

## 5. Pruébalo

Desde el WhatsApp que agregaste como destinatario de prueba (paso 1), mándale un mensaje
al número de prueba de Meta. El bot te debería contestar en unos segundos usando la
información de tu `negocio.config.json`.

Prueba también algo que el bot NO deba saber (por ejemplo "¿me hacen descuento si pago de
contado?") — debería avisarte a ti por WhatsApp en vez de inventar una respuesta.

---

## Los límites (para que no te sorprendan)

- **La memoria de la conversación se pierde si el bot lleva rato sin uso.** Corre en una
  función que "se enfría" — mientras está caliente recuerda los últimos mensajes de cada
  persona, pero tras un rato sin tráfico, empieza de cero con el siguiente mensaje. Para
  probar es más que suficiente; si esto ya está generando ventas y quieres memoria
  permanente, el siguiente escalón es agregar una base de datos (Vercel KV o Supabase).
- **Solo contesta texto**, no audios, imágenes ni ubicación.
- **El número de prueba de Meta solo le puede escribir a los destinatarios que agregaste
  a mano** (hasta 5). Para que le conteste a cualquier prospecto real, hay que pasar por
  la verificación de negocio de Meta y usar tu número real — ese es el paso después de
  probar que el bot contesta bien.
- **Cuando decida "escalar"**, te manda el aviso a ti mismo por WhatsApp (al número que
  pusiste en `negocio.whatsapp` dentro de `negocio.config.json`). Asegúrate de que ese
  número también esté en tu lista de destinatarios de prueba mientras estás en modo
  prueba.

## Cómo lo personalizas

El comportamiento del bot vive en [`lib/chatbot.ts`](../lib/chatbot.ts), en la función
`systemPrompt()`. Ahí le decimos qué información puede usar (jalada directo de
`negocio.config.json`) y cuándo debe escalarte a ti en vez de improvisar. Si notas que
contesta cosas que no debería, ese es el archivo que hay que ajustar.
