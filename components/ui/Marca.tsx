import { config } from "@/lib/negocio";

type Tamano = "sm" | "md" | "lg";

type Props = {
  tamano?: Tamano;
  /** Muestra solo el logo, sin el nombre del negocio. */
  soloLogo?: boolean;
  className?: string;
};

const porTamano: Record<Tamano, { caja: string; circulo: string; nombre: string }> = {
  sm: { caja: "size-9 text-sm rounded-xl", circulo: "size-9", nombre: "text-lg" },
  md: { caja: "size-11 text-base rounded-2xl", circulo: "size-11", nombre: "text-xl" },
  lg: { caja: "size-14 text-xl rounded-2xl", circulo: "size-14", nombre: "text-2xl sm:text-3xl" },
};

export default function Marca({
  tamano = "md",
  soloLogo = false,
  className = "",
}: Props) {
  const medida = porTamano[tamano];

  return (
    <span className={["inline-flex items-center gap-3", className].filter(Boolean).join(" ")}>
      {config.negocio.logoImagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={config.negocio.logoImagen}
          alt=""
          aria-hidden="true"
          width={56}
          height={56}
          className={[medida.circulo, "shrink-0 rounded-full"].join(" ")}
        />
      ) : (
        <span
          aria-hidden="true"
          className={[
            medida.caja,
            "grid shrink-0 place-items-center bg-marca text-sobre-marca",
            "font-display font-bold leading-none tracking-tight",
          ].join(" ")}
        >
          {config.negocio.logoTexto}
        </span>
      )}
      {!soloLogo && (
        <span className={[medida.nombre, "font-display font-semibold text-tinta"].join(" ")}>
          {config.negocio.nombre}
        </span>
      )}
    </span>
  );
}

/* También como exportación con nombre, para poder importarlo de las dos formas. */
export { Marca };
