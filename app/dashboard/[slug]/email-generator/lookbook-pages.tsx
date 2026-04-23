"use client";

import React from "react";
import type { LookbookPage } from "@/lib/email-generator/lookbook-plan";
import { BRAND } from "@/lib/email-generator/brand";

const PAGE_W = 794;
const PAGE_H = 1123;
const { palette: P, fonts: F } = BRAND;

export const LOOKBOOK_PAGE_WIDTH = PAGE_W;
export const LOOKBOOK_PAGE_HEIGHT = PAGE_H;

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: `${PAGE_W}px`,
        height: `${PAGE_H}px`,
        backgroundColor: P.black,
        color: P.white,
        position: "relative",
        overflow: "hidden",
        fontFamily: F.sans,
      }}
    >
      {children}
    </div>
  );
}

function CoverPage({ page }: { page: Extract<LookbookPage, { kind: "cover" }> }) {
  return (
    <PageShell>
      <div style={{ position: "absolute", top: 48, left: 0, right: 0, textAlign: "center" }}>
        <span
          style={{
            fontFamily: F.serif,
            fontSize: 18,
            fontWeight: 300,
            color: P.gold,
            letterSpacing: 10,
            textTransform: "uppercase",
          }}
        >
          {page.wordmark}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 60,
          right: 60,
          height: 520,
          overflow: "hidden",
          backgroundColor: P.charcoal,
        }}
      >
        {page.heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.heroUrl}
            crossOrigin="anonymous"
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : null}
      </div>
      <div
        style={{
          position: "absolute",
          top: 690,
          left: 70,
          right: 70,
          textAlign: "center",
        }}
      >
        {page.subheadline && (
          <div
            style={{
              fontFamily: F.sans,
              fontSize: 11,
              color: P.gold,
              letterSpacing: 4,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            {page.subheadline}
          </div>
        )}
        <div
          style={{
            fontFamily: F.serif,
            fontSize: 46,
            fontWeight: 300,
            letterSpacing: 1.5,
            lineHeight: 1.1,
            marginBottom: 28,
            color: P.white,
          }}
        >
          {page.theme}
        </div>
        {page.lead && (
          <div
            style={{
              fontFamily: F.serif,
              fontSize: 15,
              lineHeight: 1.75,
              fontStyle: "italic",
              color: P.greyText,
              maxWidth: 560,
              margin: "0 auto",
            }}
          >
            {page.lead}
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: F.sans,
          fontSize: 9,
          color: P.greyText,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        The Lookbook
      </div>
    </PageShell>
  );
}

function ProductsPage({ page }: { page: Extract<LookbookPage, { kind: "products" }> }) {
  const IMG_H = 280;
  const GAP = 36;
  const items = page.products.slice(0, 4);
  const rows: typeof items[] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <PageShell>
      <div style={{ position: "absolute", top: 60, left: 60, right: 60 }}>
        <div
          style={{
            fontFamily: F.sans,
            fontSize: 11,
            color: P.gold,
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 18,
          }}
        >
          {page.sectionLabel}
        </div>
        {page.narrative && (
          <div
            style={{
              fontFamily: F.serif,
              fontSize: 15,
              lineHeight: 1.7,
              fontStyle: "italic",
              color: P.white,
              maxWidth: 600,
            }}
          >
            {page.narrative}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          top: 240,
          left: 60,
          right: 60,
          display: "flex",
          flexDirection: "column",
          gap: GAP,
        }}
      >
        {rows.map((row, ri) => (
          <div
            key={ri}
            style={{ display: "flex", gap: GAP, width: "100%" }}
          >
            {row.map((p, i) => (
              <div key={i} style={{ flex: "1 1 0", minWidth: 0 }}>
                <div
                  style={{
                    width: "100%",
                    height: IMG_H,
                    backgroundColor: P.charcoal,
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      crossOrigin="anonymous"
                      alt={p.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : null}
                </div>
                <div
                  style={{
                    fontFamily: F.serif,
                    fontSize: 20,
                    fontWeight: 300,
                    color: P.white,
                    marginBottom: 4,
                    textAlign: "center",
                    letterSpacing: 0.5,
                  }}
                >
                  {p.name}
                </div>
                {p.description && (
                  <div
                    style={{
                      fontFamily: F.sans,
                      fontSize: 9,
                      color: P.greyText,
                      letterSpacing: 2.5,
                      textTransform: "uppercase",
                      marginBottom: 6,
                      textAlign: "center",
                    }}
                  >
                    {p.description}
                  </div>
                )}
                {p.dimensions && (
                  <div
                    style={{
                      fontFamily: F.sans,
                      fontSize: 9,
                      color: P.greyText,
                      fontStyle: "italic",
                      marginBottom: 8,
                      textAlign: "center",
                    }}
                  >
                    {p.dimensions}
                  </div>
                )}
                <div
                  style={{
                    fontFamily: F.serif,
                    fontSize: 18,
                    fontWeight: 300,
                    color: P.gold,
                    textAlign: "center",
                    letterSpacing: 1,
                  }}
                >
                  R {p.priceZar.toLocaleString("en-ZA")}
                </div>
              </div>
            ))}
            {row.length === 1 ? <div style={{ flex: "1 1 0" }} /> : null}
          </div>
        ))}
      </div>
    </PageShell>
  );
}

function ContactPage({ page }: { page: Extract<LookbookPage, { kind: "contact" }> }) {
  return (
    <PageShell>
      <div
        style={{
          position: "absolute",
          top: 160,
          left: 60,
          right: 60,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: F.serif,
            fontSize: 34,
            fontWeight: 300,
            color: P.gold,
            letterSpacing: 12,
            textTransform: "uppercase",
            marginBottom: 48,
          }}
        >
          {BRAND.wordmark}
        </div>
        <div
          style={{
            fontFamily: F.serif,
            fontSize: 22,
            lineHeight: 1.5,
            fontStyle: "italic",
            color: P.white,
            maxWidth: 520,
            margin: "0 auto 56px auto",
          }}
        >
          &ldquo;Every piece we select, every detail we refine, exists for one reason — to make your space unmistakably yours.&rdquo;
        </div>
        <div
          style={{
            width: 60,
            height: 1,
            backgroundColor: P.gold,
            margin: "0 auto 48px auto",
          }}
        />
        <div
          style={{
            fontFamily: F.sans,
            fontSize: 11,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: P.greyText,
            lineHeight: 2.6,
          }}
        >
          <div>WhatsApp &middot; {page.phone}</div>
          <div>{page.website.replace(/^https?:\/\//, "")}</div>
          <div>Instagram {page.instagram}</div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: F.sans,
          fontSize: 10,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: P.greyText,
        }}
      >
        Link Interiors &middot; Johannesburg
      </div>
    </PageShell>
  );
}

export function LookbookPageView({
  page,
  pageNumber,
}: {
  page: LookbookPage;
  pageNumber: number;
}) {
  return (
    <div data-lookbook-page={pageNumber}>
      {page.kind === "cover" && <CoverPage page={page} />}
      {page.kind === "products" && <ProductsPage page={page} />}
      {page.kind === "contact" && <ContactPage page={page} />}
    </div>
  );
}
