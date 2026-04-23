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
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 0,
          width: PAGE_W,
          textAlign: "center",
          fontFamily: F.serif,
          fontSize: 18,
          fontWeight: 300,
          color: P.gold,
          letterSpacing: 10,
          textTransform: "uppercase",
        }}
      >
        {page.wordmark}
      </div>
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 60,
          width: PAGE_W - 120,
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
      {page.subheadline && (
        <div
          style={{
            position: "absolute",
            top: 690,
            left: 0,
            width: PAGE_W,
            textAlign: "center",
            fontFamily: F.sans,
            fontSize: 11,
            color: P.gold,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          {page.subheadline}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: 730,
          left: 70,
          width: PAGE_W - 140,
          textAlign: "center",
          fontFamily: F.serif,
          fontSize: 44,
          fontWeight: 300,
          lineHeight: 1.1,
          letterSpacing: 1,
          color: P.white,
        }}
      >
        {page.theme}
      </div>
      {page.lead && (
        <div
          style={{
            position: "absolute",
            top: 870,
            left: 100,
            width: PAGE_W - 200,
            textAlign: "center",
            fontFamily: F.serif,
            fontSize: 14,
            lineHeight: 1.7,
            fontStyle: "italic",
            color: P.greyText,
          }}
        >
          {page.lead}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          width: PAGE_W,
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

function ProductCard({
  imageUrl,
  name,
  description,
  dimensions,
  priceZar,
  left,
  top,
  width,
  imgHeight,
}: {
  imageUrl?: string;
  name: string;
  description?: string;
  dimensions?: string;
  priceZar: number;
  left: number;
  top: number;
  width: number;
  imgHeight: number;
}) {
  const priceStr = "R " + priceZar.toLocaleString("en-ZA");
  const nameY = top + imgHeight + 16;
  const descY = nameY + 30;
  const dimY = description ? descY + 18 : descY;
  const priceBelow = dimensions ? dimY + 20 : (description ? descY + 20 : nameY + 32);
  return (
    <>
      <div
        style={{
          position: "absolute",
          top,
          left,
          width,
          height: imgHeight,
          backgroundColor: P.charcoal,
          overflow: "hidden",
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            crossOrigin="anonymous"
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : null}
      </div>
      <div
        style={{
          position: "absolute",
          top: nameY,
          left,
          width,
          textAlign: "center",
          fontFamily: F.serif,
          fontSize: 19,
          fontWeight: 300,
          color: P.white,
          letterSpacing: 0.5,
          lineHeight: 1.2,
        }}
      >
        {name}
      </div>
      {description && (
        <div
          style={{
            position: "absolute",
            top: descY,
            left,
            width,
            textAlign: "center",
            fontFamily: F.sans,
            fontSize: 9,
            color: P.greyText,
            letterSpacing: 2.5,
            textTransform: "uppercase",
            lineHeight: 1.2,
          }}
        >
          {description}
        </div>
      )}
      {dimensions && (
        <div
          style={{
            position: "absolute",
            top: dimY,
            left,
            width,
            textAlign: "center",
            fontFamily: F.sans,
            fontSize: 9,
            color: P.greyText,
            fontStyle: "italic",
            lineHeight: 1.2,
          }}
        >
          {dimensions}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: priceBelow,
          left,
          width,
          textAlign: "center",
          fontFamily: F.serif,
          fontSize: 18,
          fontWeight: 300,
          color: P.gold,
          letterSpacing: 1,
          lineHeight: 1.2,
        }}
      >
        {priceStr}
      </div>
    </>
  );
}

function ProductsPage({ page }: { page: Extract<LookbookPage, { kind: "products" }> }) {
  const items = page.products.slice(0, 4);
  const COL_W = (PAGE_W - 120 - 36) / 2; // left+right 60 each, gap 36
  const IMG_H = 270;
  const ROW_GAP = 40;
  const CARD_H = IMG_H + 120; // image + text stack approx
  const GRID_TOP = 250;

  return (
    <PageShell>
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          width: PAGE_W - 120,
          fontFamily: F.sans,
          fontSize: 11,
          color: P.gold,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        {page.sectionLabel}
      </div>
      {page.narrative && (
        <div
          style={{
            position: "absolute",
            top: 96,
            left: 60,
            width: PAGE_W - 120,
            fontFamily: F.serif,
            fontSize: 15,
            lineHeight: 1.7,
            fontStyle: "italic",
            color: P.white,
          }}
        >
          {page.narrative}
        </div>
      )}

      {items.map((p, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const left = 60 + col * (COL_W + 36);
        const top = GRID_TOP + row * (CARD_H + ROW_GAP);
        return (
          <ProductCard
            key={i}
            imageUrl={p.imageUrl}
            name={p.name}
            description={p.description}
            dimensions={p.dimensions}
            priceZar={p.priceZar}
            left={left}
            top={top}
            width={COL_W}
            imgHeight={IMG_H}
          />
        );
      })}
    </PageShell>
  );
}

function FeaturePage({ page }: { page: Extract<LookbookPage, { kind: "feature" }> }) {
  return (
    <PageShell>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: PAGE_W,
          height: PAGE_H,
          overflow: "hidden",
          backgroundColor: P.charcoal,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={page.imageUrl}
          crossOrigin="anonymous"
          alt={page.caption || ""}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: PAGE_H - 220,
          left: 0,
          width: PAGE_W,
          height: 220,
          background:
            "linear-gradient(to top, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0) 100%)",
        }}
      />
      {page.eyebrow && (
        <div
          style={{
            position: "absolute",
            top: PAGE_H - 140,
            left: 60,
            width: PAGE_W - 120,
            textAlign: "center",
            fontFamily: F.sans,
            fontSize: 11,
            color: P.gold,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          {page.eyebrow}
        </div>
      )}
      {page.caption && (
        <div
          style={{
            position: "absolute",
            top: PAGE_H - 100,
            left: 100,
            width: PAGE_W - 200,
            textAlign: "center",
            fontFamily: F.serif,
            fontSize: 22,
            fontWeight: 300,
            color: P.white,
            letterSpacing: 1,
          }}
        >
          {page.caption}
        </div>
      )}
    </PageShell>
  );
}

function ContactPage({ page }: { page: Extract<LookbookPage, { kind: "contact" }> }) {
  return (
    <PageShell>
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 0,
          width: PAGE_W,
          textAlign: "center",
          fontFamily: F.serif,
          fontSize: 30,
          fontWeight: 300,
          color: P.gold,
          letterSpacing: 12,
          textTransform: "uppercase",
        }}
      >
        {BRAND.wordmark}
      </div>
      <div
        style={{
          position: "absolute",
          top: 310,
          left: 100,
          width: PAGE_W - 200,
          textAlign: "center",
          fontFamily: F.serif,
          fontSize: 20,
          lineHeight: 1.55,
          fontStyle: "italic",
          color: P.white,
        }}
      >
        &ldquo;Every piece we select, every detail we refine, exists for one reason — to make your space unmistakably yours.&rdquo;
      </div>
      <div
        style={{
          position: "absolute",
          top: 500,
          left: PAGE_W / 2 - 30,
          width: 60,
          height: 1,
          backgroundColor: P.gold,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 560,
          left: 0,
          width: PAGE_W,
          textAlign: "center",
          fontFamily: F.sans,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: P.greyText,
        }}
      >
        WhatsApp &middot; {page.phone}
      </div>
      <div
        style={{
          position: "absolute",
          top: 600,
          left: 0,
          width: PAGE_W,
          textAlign: "center",
          fontFamily: F.sans,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: P.greyText,
        }}
      >
        {page.website.replace(/^https?:\/\//, "")}
      </div>
      <div
        style={{
          position: "absolute",
          top: 640,
          left: 0,
          width: PAGE_W,
          textAlign: "center",
          fontFamily: F.sans,
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: P.greyText,
        }}
      >
        Instagram {page.instagram}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 48,
          left: 0,
          width: PAGE_W,
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
      {page.kind === "feature" && <FeaturePage page={page} />}
      {page.kind === "contact" && <ContactPage page={page} />}
    </div>
  );
}
