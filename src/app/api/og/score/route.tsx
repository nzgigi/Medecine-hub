import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { parseScoreShareParams } from "@/lib/shareScore";
import { verifyScoreShareSignature } from "@/lib/server/scoreShareSignature";

export const runtime = "nodejs";

const FALLBACK_IMAGE_PATH = "/brand/banner-v2.png";

const WIDTH = 1200;
const HEIGHT = 630;

let cachedLogoDataUri: string | null = null;

function getLogoDataUri(): string | null {
  if (cachedLogoDataUri) return cachedLogoDataUri;

  try {
    const filePath = path.join(process.cwd(), "public", "brand", "favicon-icon.png");
    const buffer = fs.readFileSync(filePath);
    cachedLogoDataUri = `data:image/png;base64,${buffer.toString("base64")}`;
    return cachedLogoDataUri;
  } catch {
    return null;
  }
}

function getScoreTheme(score: number) {
  if (score >= 16) return { accent: "#34d399", glow: "#065f46" };
  if (score >= 10) return { accent: "#fbbf24", glow: "#78350f" };
  return { accent: "#f87171", glow: "#7f1d1d" };
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const params = parseScoreShareParams(Object.fromEntries(searchParams.entries()));
  const { matiere, annee, score } = params;

  if (!verifyScoreShareSignature(params, searchParams.get("sig"))) {
    return Response.redirect(new URL(FALLBACK_IMAGE_PATH, origin), 302);
  }

  const theme = getScoreTheme(score);
  const logo = getLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          backgroundColor: "#151512",
          backgroundImage:
            "linear-gradient(135deg, #1d1c18 0%, #151512 55%, #0d0d0b 100%)",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -160,
            width: 480,
            height: 480,
            borderRadius: 9999,
            backgroundColor: theme.glow,
            opacity: 0.35,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            left: -140,
            width: 420,
            height: 420,
            borderRadius: 9999,
            backgroundColor: "#065f46",
            opacity: 0.18,
            display: "flex",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              width={64}
              height={64}
              style={{ borderRadius: 16 }}
              alt=""
            />
          )}
          <span style={{ fontSize: 34, fontWeight: 800, color: "#ffffff" }}>
            Medecine Hub
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: theme.accent,
            }}
          >
            Résultat obtenu
          </span>

          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ fontSize: 176, fontWeight: 900, color: "#ffffff" }}>
              {score.toFixed(2)}
            </span>
            <span style={{ fontSize: 60, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
              /20
            </span>
          </div>

          <span
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: "rgba(255,255,255,0.85)",
              maxWidth: 900,
              textAlign: "center",
            }}
          >
            {matiere} · {annee}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid rgba(255,255,255,0.12)",
            paddingTop: 26,
          }}
        >
          <span style={{ fontSize: 26, fontWeight: 800, color: theme.accent }}>
            medecinehub.fr
          </span>
          <span style={{ fontSize: 22, color: "rgba(255,255,255,0.55)" }}>
            QCM gratuits de médecine - DFASM1 &amp; DFASM2
          </span>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT }
  );
}
