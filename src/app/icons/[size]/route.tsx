import { ImageResponse } from "next/og";

const SIZES = [180, 192, 512] as const;

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

export const dynamicParams = false;

/** Gera os ícones PNG do PWA a partir de um único desenho, sem arquivos binários no repositório. */
export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#059669",
        }}
      >
        <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
          <path d="m12 14 4-4" stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round" />
          <path d="M3.34 19a10 10 0 1 1 17.32 0" stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
