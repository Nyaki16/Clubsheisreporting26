import { BRAND, formatZar } from "./brand";
import type { AICopy, ImageSlot, ProductInput, SlotUrlMap } from "./types";

const { palette: P, fonts: F, contact: C, wordmark } = BRAND;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

type Indexed = { product: ProductInput; originalIndex: number };

function partitionProducts(products: ProductInput[]): {
  curated: Indexed[];
  individual: Indexed[];
} {
  const curated: Indexed[] = [];
  const individual: Indexed[] = [];
  products.forEach((product, originalIndex) => {
    const entry = { product, originalIndex };
    if (product.curated === false) individual.push(entry);
    else curated.push(entry);
  });
  return { curated, individual };
}

function makeProductSlot(
  entry: Indexed,
  layout: "half" | "full",
  width: number
): ImageSlot {
  return {
    id: `product-${entry.originalIndex}`,
    layout,
    width,
    productIndex: entry.originalIndex,
    productName: entry.product.name,
    productUrl: entry.product.productUrl,
  };
}

function addGridSlots(slots: ImageSlot[], items: Indexed[]): void {
  let i = 0;
  while (i < items.length) {
    if (i + 1 < items.length) {
      slots.push(makeProductSlot(items[i], "half", 270));
      slots.push(makeProductSlot(items[i + 1], "half", 270));
      i += 2;
    } else {
      slots.push(makeProductSlot(items[i], "full", 570));
      i += 1;
    }
  }
}

export function planSlots(products: ProductInput[]): ImageSlot[] {
  const slots: ImageSlot[] = [{ id: "hero", layout: "hero", width: 600 }];
  const { curated, individual } = partitionProducts(products);
  addGridSlots(slots, curated);
  if (individual.length > 0) {
    const first = individual.slice(0, 4);
    const rest = individual.slice(4);
    addGridSlots(slots, first);
    slots.push({ id: "showcase", layout: "showcase", width: 600 });
    if (rest.length > 0) addGridSlots(slots, rest);
  }
  return slots;
}

function placeholderBlock(slotId: string, label: string, height: number): string {
  return `<!--BEGIN_SLOT:${slotId}--><div style="width:100%;height:${height}px;background-color:${P.charcoal};border:2px dashed ${P.gold};display:flex;align-items:center;justify-content:center;font-family:${F.sans};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${P.gold};">${esc(label)}</div><!--END_SLOT:${slotId}-->`;
}

function productCardFull(p: ProductInput, description: string, slotId: string): string {
  const dims = p.dimensions
    ? `<tr><td style="padding:0 0 6px 0;font-family:${F.sans};font-size:10px;font-style:italic;color:${P.greyText};text-align:center;">${esc(p.dimensions)}</td></tr>`
    : "";
  return `
<tr>
  <td style="padding:0 0 36px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
      <tr>
        <td style="padding:0 15px 16px 15px;">
          <a href="${escAttr(p.productUrl)}" style="display:block;text-decoration:none;">${placeholderBlock(slotId, p.name, 400)}</a>
        </td>
      </tr>
      <tr><td style="padding:0 15px 6px 15px;text-align:center;"><a href="${escAttr(p.productUrl)}" style="font-family:${F.serif};font-size:22px;font-weight:300;color:${P.white};text-decoration:none;letter-spacing:1px;">${esc(p.name)}</a></td></tr>
      <tr><td style="padding:0 15px 6px 15px;font-family:${F.sans};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${P.greyText};text-align:center;">${esc(description)}</td></tr>
      ${dims}
      <tr><td style="padding:0 15px 10px 15px;font-family:${F.serif};font-size:22px;font-weight:300;color:${P.gold};text-align:center;">${formatZar(p.priceZar)}</td></tr>
      <tr><td style="padding:0 15px 0 15px;text-align:center;"><a href="${escAttr(p.productUrl)}" style="font-family:${F.sans};font-size:10px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:${P.gold};text-decoration:none;">Shop this piece &rarr;</a></td></tr>
    </table>
  </td>
</tr>`;
}

function productCardHalf(p: ProductInput, description: string, slotId: string): string {
  const dims = p.dimensions
    ? `<tr><td style="padding:0 0 6px 0;font-family:${F.sans};font-size:9px;font-style:italic;color:${P.greyText};text-align:center;">${esc(p.dimensions)}</td></tr>`
    : "";
  return `
<td width="270" valign="top" style="width:270px;padding:0 0 24px 0;" class="stack">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="270" style="width:270px;" class="stack-table">
    <tr>
      <td style="padding:0 0 14px 0;">
        <a href="${escAttr(p.productUrl)}" style="display:block;text-decoration:none;">${placeholderBlock(slotId, p.name, 260)}</a>
      </td>
    </tr>
    <tr><td style="padding:0 0 4px 0;text-align:center;"><a href="${escAttr(p.productUrl)}" style="font-family:${F.serif};font-size:18px;font-weight:300;color:${P.white};text-decoration:none;">${esc(p.name)}</a></td></tr>
    <tr><td style="padding:0 0 4px 0;font-family:${F.sans};font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${P.greyText};text-align:center;">${esc(description)}</td></tr>
    ${dims}
    <tr><td style="padding:0 0 8px 0;font-family:${F.serif};font-size:18px;font-weight:300;color:${P.gold};text-align:center;">${formatZar(p.priceZar)}</td></tr>
    <tr><td style="padding:0;text-align:center;"><a href="${escAttr(p.productUrl)}" style="font-family:${F.sans};font-size:9px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:${P.gold};text-decoration:none;">Shop &rarr;</a></td></tr>
  </table>
</td>`;
}

function pairRow(left: string, right: string): string {
  return `
<tr>
  <td style="padding:0 15px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
      <tr class="stack-row">
        ${left}
        <td width="30" class="stack-gap" style="width:30px;">&nbsp;</td>
        ${right}
      </tr>
    </table>
  </td>
</tr>`;
}

function buildProductGrid(items: Indexed[], descriptions: string[]): string {
  let i = 0;
  const parts: string[] = [];
  while (i < items.length) {
    if (i + 1 < items.length) {
      const a = items[i];
      const b = items[i + 1];
      const left = productCardHalf(
        a.product,
        descriptions[a.originalIndex] || "",
        `product-${a.originalIndex}`
      );
      const right = productCardHalf(
        b.product,
        descriptions[b.originalIndex] || "",
        `product-${b.originalIndex}`
      );
      parts.push(pairRow(left, right));
      i += 2;
    } else {
      const a = items[i];
      parts.push(
        productCardFull(
          a.product,
          descriptions[a.originalIndex] || "",
          `product-${a.originalIndex}`
        )
      );
      i += 1;
    }
  }
  return parts.join("\n");
}

export interface BuildDraftArgs {
  products: ProductInput[];
  copy: AICopy;
  curatedTotalZar: number;
}

export function buildDraftHtml({ products, copy, curatedTotalZar }: BuildDraftArgs): string {
  const { curated, individual } = partitionProducts(products);
  const firstIndividuals = individual.slice(0, 4);
  const restIndividuals = individual.slice(4);

  const statsHtml = copy.statsStrip
    .map(
      (s) =>
        `<td align="center" style="padding:0 10px;font-family:${F.serif};font-size:20px;font-weight:300;color:${P.gold};letter-spacing:1px;">${esc(s)}</td>`
    )
    .join(`<td style="padding:0;font-family:${F.sans};font-size:14px;color:${P.gold};">|</td>`);

  const curatedGrid = buildProductGrid(curated, copy.productDescriptions);

  let alsoAvailable = "";
  if (individual.length > 0) {
    const firstGrid = buildProductGrid(firstIndividuals, copy.productDescriptions);
    const showcaseBlock = `
<tr>
  <td style="padding:24px 0 24px 0;">
    ${placeholderBlock("showcase", "SHOWCASE IMAGE", 360)}
  </td>
</tr>`;
    const narrativeBlock = copy.individualNarrative
      ? `
<tr>
  <td align="center" style="padding:12px 40px 40px 40px;">
    <div style="font-family:${F.serif};font-size:17px;line-height:1.6;font-style:italic;font-weight:300;color:${P.white};max-width:460px;margin:0 auto;">${esc(copy.individualNarrative)}</div>
  </td>
</tr>`
      : "";
    const restGrid = restIndividuals.length > 0
      ? buildProductGrid(restIndividuals, copy.productDescriptions)
      : "";

    alsoAvailable = `
<!-- Also Available Header -->
<tr>
  <td align="center" style="padding:16px 20px 8px 20px;border-top:1px solid ${P.charcoal};">
    <div style="font-family:${F.serif};font-size:22px;font-weight:300;color:${P.white};letter-spacing:1px;margin-top:32px;margin-bottom:8px;">${esc(copy.individualSectionLabel)}</div>
    <div style="font-family:${F.sans};font-size:10px;font-weight:400;letter-spacing:3px;text-transform:uppercase;color:${P.greyText};margin-bottom:28px;">${esc(copy.individualSectionTagline)}</div>
  </td>
</tr>

${firstGrid}
${showcaseBlock}
${narrativeBlock}
${restGrid}
`;
  }

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="dark light" />
<meta name="supported-color-schemes" content="dark light" />
<title>${esc(copy.subjectLine)}</title>
<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=Montserrat:wght@300;400;500&display=swap" rel="stylesheet">
<!--<![endif]-->
<style>
  body { margin: 0 !important; padding: 0 !important; background-color: ${P.black}; }
  table { border-collapse: collapse; }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a { color: ${P.gold}; }
  @media screen and (max-width: 600px) {
    .container { width: 100% !important; max-width: 100% !important; }
    .stack-row { display: block !important; }
    .stack, .stack-table { width: 100% !important; max-width: 100% !important; display: block !important; }
    .stack-gap { display: none !important; width: 0 !important; }
    .hero-img, .full-img, .showcase-img { width: 100% !important; max-width: 100% !important; height: auto !important; }
    .cta-btn { padding: 12px 14px !important; font-size: 10px !important; letter-spacing: 2px !important; white-space: nowrap !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${P.black};">
<div style="display:none;font-size:1px;color:${P.black};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(copy.preheader)}</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${P.black};">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:${P.black};">

        <!-- Header -->
        <tr>
          <td align="center" style="padding:40px 20px 28px 20px;">
            <span style="font-family:${F.serif};font-size:26px;font-weight:300;color:${P.gold};letter-spacing:8px;text-transform:uppercase;">${wordmark}</span>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding:0;">
            ${placeholderBlock("hero", "HERO IMAGE", 420)}
          </td>
        </tr>

        <!-- Headline Block -->
        <tr>
          <td align="center" style="padding:44px 30px 12px 30px;">
            <div style="display:inline-block;width:60px;height:1px;background-color:${P.gold};margin-bottom:24px;">&nbsp;</div>
            <div style="font-family:${F.sans};font-size:11px;font-weight:500;letter-spacing:4px;text-transform:uppercase;color:${P.gold};margin-bottom:18px;">${esc(copy.collectionLabel)}</div>
            <div style="font-family:${F.serif};font-size:36px;line-height:1.1;font-weight:300;color:${P.white};letter-spacing:1px;margin-bottom:14px;">${esc(copy.heroHeadline)}</div>
            <div style="font-family:${F.serif};font-size:16px;line-height:1.5;font-style:italic;color:${P.greyText};max-width:420px;margin:0 auto;">${esc(copy.heroSubheadline)}</div>
          </td>
        </tr>

        <!-- Stats Strip (curated totals) -->
        <tr>
          <td align="center" style="padding:28px 20px 36px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>${statsHtml}</tr>
            </table>
          </td>
        </tr>

        <!-- Curated Intro -->
        <tr>
          <td align="center" style="padding:16px 20px 8px 20px;border-top:1px solid ${P.charcoal};">
            <div style="font-family:${F.serif};font-size:22px;font-weight:300;color:${P.white};letter-spacing:1px;margin-top:32px;margin-bottom:8px;">${esc(copy.collectionIntroLabel)}</div>
            <div style="font-family:${F.sans};font-size:10px;font-weight:400;letter-spacing:3px;text-transform:uppercase;color:${P.greyText};margin-bottom:28px;">${esc(copy.collectionIntroTagline)}</div>
          </td>
        </tr>

        <!-- Curated Grid -->
        ${curatedGrid}

        <!-- Shop The Collection Banner -->
        <tr>
          <td style="padding:12px 0 12px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${P.charcoal};">
              <tr><td align="center" style="padding:48px 20px 20px 20px;font-family:${F.sans};font-size:10px;font-weight:500;letter-spacing:4px;text-transform:uppercase;color:${P.gold};">${esc(copy.completeTheLookLine)}</td></tr>
              <tr><td align="center" style="padding:0 20px 28px 20px;font-family:${F.serif};font-size:44px;font-weight:300;color:${P.gold};letter-spacing:2px;">${formatZar(curatedTotalZar)}</td></tr>
              <tr><td align="center" style="padding:0 20px 48px 20px;"><a href="${C.whatsapp}" style="display:inline-block;padding:14px 32px;background-color:${P.gold};color:${P.black};font-family:${F.sans};font-size:11px;font-weight:500;letter-spacing:3px;text-transform:uppercase;text-decoration:none;border-radius:2px;">Shop The Collection</a></td></tr>
            </table>
          </td>
        </tr>

        ${alsoAvailable}

        <!-- Brand Promise -->
        <tr>
          <td align="center" style="padding:48px 40px 40px 40px;">
            <div style="font-family:${F.serif};font-size:18px;line-height:1.5;font-style:italic;font-weight:300;color:${P.white};max-width:480px;margin:0 auto;">&ldquo;${esc(copy.brandPromise)}&rdquo;</div>
          </td>
        </tr>

        <!-- Final CTA -->
        <tr>
          <td align="center" style="padding:24px 30px 48px 30px;border-top:1px solid ${P.charcoal};">
            <div style="font-family:${F.serif};font-size:28px;font-weight:300;color:${P.white};letter-spacing:1px;margin-top:32px;margin-bottom:14px;">${esc(copy.finalCtaHeadline)}</div>
            <div style="font-family:${F.sans};font-size:13px;line-height:1.6;color:${P.greyText};max-width:440px;margin:0 auto 28px auto;">${esc(copy.finalCtaBody)}</div>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="padding:0 6px;"><a class="cta-btn" href="${C.whatsapp}" style="display:inline-block;padding:14px 28px;background-color:${P.gold};color:${P.black};font-family:${F.sans};font-size:11px;font-weight:500;letter-spacing:3px;text-transform:uppercase;text-decoration:none;border-radius:2px;white-space:nowrap;">WhatsApp Us</a></td>
              <td style="padding:0 6px;"><a class="cta-btn" href="tel:${C.phone.replace(/\s+/g, "")}" style="display:inline-block;padding:13px 28px;background-color:transparent;color:${P.gold};font-family:${F.sans};font-size:11px;font-weight:500;letter-spacing:3px;text-transform:uppercase;text-decoration:none;border:1px solid ${P.gold};border-radius:2px;white-space:nowrap;">Call Us</a></td>
            </tr></table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:32px 30px 48px 30px;border-top:1px solid ${P.charcoal};">
            <div style="font-family:${F.sans};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${P.greyText};margin-bottom:16px;"><a href="${C.instagramUrl}" style="color:${P.greyText};text-decoration:none;">Instagram</a> &nbsp;&middot;&nbsp; <a href="${C.website}" style="color:${P.greyText};text-decoration:none;">Website</a> &nbsp;&middot;&nbsp; <a href="${C.whatsapp}" style="color:${P.greyText};text-decoration:none;">WhatsApp</a></div>
            <div style="font-family:${F.sans};font-size:10px;color:${P.greyText};letter-spacing:1px;margin-bottom:6px;">Link Interiors &middot; Johannesburg</div>
            <div style="font-family:${F.sans};font-size:9px;color:${P.greyText};letter-spacing:1px;">You received this because you are on the Link Interiors list.<br /><a href="{{unsubscribe_url}}" style="color:${P.greyText};text-decoration:underline;">Unsubscribe</a></div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`;
}

export function swapPlaceholders(html: string, urls: SlotUrlMap, slots: ImageSlot[]): string {
  let result = html;
  for (const slot of slots) {
    const url = urls[slot.id];
    if (!url) continue;
    const alt = slot.productName ? slot.productName : "Link Interiors";
    const className =
      slot.layout === "hero"
        ? "hero-img"
        : slot.layout === "showcase"
        ? "showcase-img"
        : "full-img";
    const imgTag = `<img src="${escAttr(url)}" alt="${escAttr(alt)}" width="${slot.width}" class="${className}" style="display:block;width:100%;max-width:${slot.width}px;height:auto;border:0;outline:none;text-decoration:none;" />`;
    const re = new RegExp(`<!--BEGIN_SLOT:${slot.id}-->[\\s\\S]*?<!--END_SLOT:${slot.id}-->`, "g");
    result = result.replace(re, imgTag);
  }
  return result;
}
