import { type Brand, formatZar } from "./brand";
import type { AICopy, ImageSlot, ProductInput, SlotUrlMap } from "./types";

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
  slots.push({ id: "collection-banner", layout: "banner", width: 600 });
  if (individual.length > 0) {
    const first = individual.slice(0, 4);
    const rest = individual.slice(4);
    addGridSlots(slots, first);
    slots.push({ id: "showcase", layout: "showcase", width: 600 });
    if (rest.length > 0) addGridSlots(slots, rest);
  }
  return slots;
}

export interface BuildDraftArgs {
  brand: Brand;
  products: ProductInput[];
  copy: AICopy;
  curatedTotalZar: number;
}

export function buildDraftHtml({
  brand,
  products,
  copy,
  curatedTotalZar,
}: BuildDraftArgs): string {
  const P = brand.palette;
  const F = brand.fonts;
  const C = brand.contact;
  const headingsW = brand.fonts.headingsWeight;

  const placeholderBlock = (slotId: string, label: string, height: number): string =>
    `<!--BEGIN_SLOT:${slotId}--><div style="width:100%;height:${height}px;background-color:${P.bgAlt};border:2px dashed ${P.accent};display:flex;align-items:center;justify-content:center;font-family:${F.sans};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${P.accent};">${esc(label)}</div><!--END_SLOT:${slotId}-->`;

  const productCardFull = (p: ProductInput, description: string, slotId: string): string => {
    const dims = p.dimensions
      ? `<tr><td style="padding:0 0 6px 0;font-family:${F.sans};font-size:10px;font-style:italic;color:${P.textMuted};text-align:center;">${esc(p.dimensions)}</td></tr>`
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
      <tr><td style="padding:0 15px 6px 15px;text-align:center;"><a href="${escAttr(p.productUrl)}" style="font-family:${F.serif};font-size:22px;font-weight:${headingsW};color:${P.text};text-decoration:none;letter-spacing:1px;">${esc(p.name)}</a></td></tr>
      <tr><td style="padding:0 15px 6px 15px;font-family:${F.sans};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${P.textMuted};text-align:center;">${esc(description)}</td></tr>
      ${dims}
      <tr><td style="padding:0 15px 10px 15px;font-family:${F.serif};font-size:22px;font-weight:${headingsW};color:${P.accent};text-align:center;">${formatZar(p.priceZar)}</td></tr>
      <tr><td style="padding:0 15px 0 15px;text-align:center;"><a href="${escAttr(p.productUrl)}" style="font-family:${F.sans};font-size:10px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:${P.accent};text-decoration:none;">Shop this piece &rarr;</a></td></tr>
    </table>
  </td>
</tr>`;
  };

  const productCardHalf = (p: ProductInput, description: string, slotId: string): string => {
    const dims = p.dimensions
      ? `<tr><td style="padding:0 0 6px 0;font-family:${F.sans};font-size:9px;font-style:italic;color:${P.textMuted};text-align:center;">${esc(p.dimensions)}</td></tr>`
      : "";
    return `
<td width="270" valign="top" style="width:270px;padding:0 0 24px 0;" class="stack">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="270" style="width:270px;" class="stack-table">
    <tr>
      <td style="padding:0 0 14px 0;">
        <a href="${escAttr(p.productUrl)}" style="display:block;text-decoration:none;">${placeholderBlock(slotId, p.name, 260)}</a>
      </td>
    </tr>
    <tr><td style="padding:0 0 4px 0;text-align:center;"><a href="${escAttr(p.productUrl)}" style="font-family:${F.serif};font-size:18px;font-weight:${headingsW};color:${P.text};text-decoration:none;">${esc(p.name)}</a></td></tr>
    <tr><td style="padding:0 0 4px 0;font-family:${F.sans};font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${P.textMuted};text-align:center;">${esc(description)}</td></tr>
    ${dims}
    <tr><td style="padding:0 0 8px 0;font-family:${F.serif};font-size:18px;font-weight:${headingsW};color:${P.accent};text-align:center;">${formatZar(p.priceZar)}</td></tr>
    <tr><td style="padding:0;text-align:center;"><a href="${escAttr(p.productUrl)}" style="font-family:${F.sans};font-size:9px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:${P.accent};text-decoration:none;">Shop &rarr;</a></td></tr>
  </table>
</td>`;
  };

  const pairRow = (left: string, right: string): string => `
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

  const buildProductGrid = (items: Indexed[], descriptions: string[]): string => {
    let i = 0;
    const parts: string[] = [];
    while (i < items.length) {
      if (i + 1 < items.length) {
        const a = items[i];
        const b = items[i + 1];
        parts.push(
          pairRow(
            productCardHalf(a.product, descriptions[a.originalIndex] || "", `product-${a.originalIndex}`),
            productCardHalf(b.product, descriptions[b.originalIndex] || "", `product-${b.originalIndex}`)
          )
        );
        i += 2;
      } else {
        const a = items[i];
        parts.push(productCardFull(a.product, descriptions[a.originalIndex] || "", `product-${a.originalIndex}`));
        i += 1;
      }
    }
    return parts.join("\n");
  };

  const { curated, individual } = partitionProducts(products);
  const firstIndividuals = individual.slice(0, 4);
  const restIndividuals = individual.slice(4);

  const statsHtml = copy.statsStrip
    .map(
      (s) =>
        `<td align="center" style="padding:0 10px;font-family:${F.serif};font-size:20px;font-weight:${headingsW};color:${P.accent};letter-spacing:1px;">${esc(s)}</td>`
    )
    .join(`<td style="padding:0;font-family:${F.sans};font-size:14px;color:${P.accent};">|</td>`);

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
    <div style="font-family:${F.serif};font-size:17px;line-height:1.6;font-style:italic;font-weight:${headingsW};color:${P.text};max-width:460px;margin:0 auto;">${esc(copy.individualNarrative)}</div>
  </td>
</tr>`
      : "";
    const restGrid = restIndividuals.length > 0 ? buildProductGrid(restIndividuals, copy.productDescriptions) : "";

    alsoAvailable = `
<tr>
  <td align="center" style="padding:16px 20px 8px 20px;border-top:1px solid ${P.border};">
    <div style="font-family:${F.serif};font-size:22px;font-weight:${headingsW};color:${P.text};letter-spacing:1px;margin-top:32px;margin-bottom:8px;">${esc(copy.individualSectionLabel)}</div>
    <div style="font-family:${F.sans};font-size:10px;font-weight:400;letter-spacing:3px;text-transform:uppercase;color:${P.textMuted};margin-bottom:28px;">${esc(copy.individualSectionTagline)}</div>
  </td>
</tr>

${firstGrid}
${showcaseBlock}
${narrativeBlock}
${restGrid}
`;
  }

  // Header rendering — image takes precedence over text wordmark
  const headerInner = brand.logoImageUrl
    ? `<img src="${escAttr(brand.logoImageUrl)}" alt="${escAttr(brand.wordmark)}" style="max-height:40px;height:auto;display:inline-block;border:0;outline:none;" />`
    : `<span style="font-family:${F.serif};font-size:26px;font-weight:${headingsW};color:${P.accent};letter-spacing:8px;text-transform:uppercase;">${esc(brand.wordmark)}</span>`;

  // Footer links (omit any contact field that's not configured)
  const footerLinks = [
    C.instagramUrl ? `<a href="${escAttr(C.instagramUrl)}" style="color:${P.textMuted};text-decoration:none;">Instagram</a>` : null,
    `<a href="${escAttr(C.website)}" style="color:${P.textMuted};text-decoration:none;">Website</a>`,
    C.whatsapp ? `<a href="${escAttr(C.whatsapp)}" style="color:${P.textMuted};text-decoration:none;">WhatsApp</a>` : null,
  ]
    .filter(Boolean)
    .join(" &nbsp;&middot;&nbsp; ");

  const colorScheme = brand.emailTheme === "dark" ? "dark light" : "light dark";

  // Final CTA buttons — show only what's configured
  const ctaButtons: string[] = [];
  if (C.whatsapp) {
    ctaButtons.push(
      `<td style="padding:0 6px;"><a class="cta-btn" href="${escAttr(C.whatsapp)}" style="display:inline-block;padding:14px 28px;background-color:${P.accent};color:${P.bg};font-family:${F.sans};font-size:11px;font-weight:500;letter-spacing:3px;text-transform:uppercase;text-decoration:none;border-radius:2px;white-space:nowrap;">WhatsApp Us</a></td>`
    );
  }
  if (C.phone) {
    ctaButtons.push(
      `<td style="padding:0 6px;"><a class="cta-btn" href="tel:${escAttr(C.phone.replace(/\s+/g, ""))}" style="display:inline-block;padding:13px 28px;background-color:transparent;color:${P.accent};font-family:${F.sans};font-size:11px;font-weight:500;letter-spacing:3px;text-transform:uppercase;text-decoration:none;border:1px solid ${P.accent};border-radius:2px;white-space:nowrap;">Call Us</a></td>`
    );
  }
  // The Shop The Collection CTA — prefer WhatsApp, fall back to website
  const collectionCtaUrl = C.whatsapp || C.website;

  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="${colorScheme}" />
<meta name="supported-color-schemes" content="${colorScheme}" />
<title>${esc(copy.subjectLine)}</title>
<!--[if !mso]><!-->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=Montserrat:wght@300;400;500&display=swap" rel="stylesheet">
<!--<![endif]-->
<style>
  body { margin: 0 !important; padding: 0 !important; background-color: ${P.bg}; }
  table { border-collapse: collapse; }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a { color: ${P.accent}; }
  @media screen and (max-width: 600px) {
    .container { width: 100% !important; max-width: 100% !important; }
    .stack-row { display: block !important; }
    .stack, .stack-table { width: 100% !important; max-width: 100% !important; display: block !important; }
    .stack-gap { display: none !important; width: 0 !important; }
    .hero-img, .full-img, .showcase-img, .banner-img { width: 100% !important; max-width: 100% !important; height: auto !important; }
    .cta-btn { padding: 12px 14px !important; font-size: 10px !important; letter-spacing: 2px !important; white-space: nowrap !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${P.bg};">
<div style="display:none;font-size:1px;color:${P.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(copy.preheader)}</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${P.bg};">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:${P.bg};">

        <tr>
          <td align="center" style="padding:40px 20px 28px 20px;">
            ${headerInner}
          </td>
        </tr>

        <tr>
          <td style="padding:0;">
            ${placeholderBlock("hero", "HERO IMAGE", 420)}
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:44px 30px 12px 30px;">
            <div style="display:inline-block;width:60px;height:1px;background-color:${P.accent};margin-bottom:24px;">&nbsp;</div>
            <div style="font-family:${F.sans};font-size:11px;font-weight:500;letter-spacing:4px;text-transform:uppercase;color:${P.accent};margin-bottom:18px;">${esc(copy.collectionLabel)}</div>
            <div style="font-family:${F.serif};font-size:36px;line-height:1.1;font-weight:${headingsW};color:${P.text};letter-spacing:1px;margin-bottom:14px;">${esc(copy.heroHeadline)}</div>
            <div style="font-family:${F.serif};font-size:16px;line-height:1.5;font-style:italic;color:${P.textMuted};max-width:420px;margin:0 auto;">${esc(copy.heroSubheadline)}</div>
          </td>
        </tr>
${copy.leadParagraph
  ? `
        <tr>
          <td align="center" style="padding:24px 40px 28px 40px;">
            <div style="font-family:${F.serif};font-size:16px;line-height:1.75;font-weight:${headingsW};color:${P.text};max-width:480px;margin:0 auto;">${esc(copy.leadParagraph)}</div>
          </td>
        </tr>`
  : ""}

        <tr>
          <td align="center" style="padding:28px 20px 36px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>${statsHtml}</tr>
            </table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:16px 20px 8px 20px;border-top:1px solid ${P.border};">
            <div style="font-family:${F.serif};font-size:22px;font-weight:${headingsW};color:${P.text};letter-spacing:1px;margin-top:32px;margin-bottom:8px;">${esc(copy.collectionIntroLabel)}</div>
            <div style="font-family:${F.sans};font-size:10px;font-weight:400;letter-spacing:3px;text-transform:uppercase;color:${P.textMuted};margin-bottom:28px;">${esc(copy.collectionIntroTagline)}</div>
          </td>
        </tr>

        ${curatedGrid}

        <tr>
          <td style="padding:12px 0 12px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${P.bgAlt};">
              <tr><td style="padding:0;line-height:0;font-size:0;">${placeholderBlock("collection-banner", "COLLECTION BANNER IMAGE", 300)}</td></tr>
              <tr><td align="center" style="padding:40px 20px 20px 20px;font-family:${F.sans};font-size:10px;font-weight:500;letter-spacing:4px;text-transform:uppercase;color:${P.accent};">${esc(copy.completeTheLookLine)}</td></tr>
              <tr><td align="center" style="padding:0 20px 28px 20px;font-family:${F.serif};font-size:44px;font-weight:${headingsW};color:${P.accent};letter-spacing:2px;">${formatZar(curatedTotalZar)}</td></tr>
              <tr><td align="center" style="padding:0 20px 48px 20px;"><a href="${escAttr(collectionCtaUrl)}" style="display:inline-block;padding:14px 32px;background-color:${P.accent};color:${P.bg};font-family:${F.sans};font-size:11px;font-weight:500;letter-spacing:3px;text-transform:uppercase;text-decoration:none;border-radius:2px;">Shop The Collection</a></td></tr>
            </table>
          </td>
        </tr>

        ${alsoAvailable}

        <tr>
          <td align="center" style="padding:48px 40px 40px 40px;">
            <div style="font-family:${F.serif};font-size:18px;line-height:1.5;font-style:italic;font-weight:${headingsW};color:${P.text};max-width:480px;margin:0 auto;">&ldquo;${esc(copy.brandPromise)}&rdquo;</div>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:24px 30px 48px 30px;border-top:1px solid ${P.border};">
            <div style="font-family:${F.serif};font-size:28px;font-weight:${headingsW};color:${P.text};letter-spacing:1px;margin-top:32px;margin-bottom:14px;">${esc(copy.finalCtaHeadline)}</div>
            <div style="font-family:${F.sans};font-size:13px;line-height:1.6;color:${P.textMuted};max-width:440px;margin:0 auto 28px auto;">${esc(copy.finalCtaBody)}</div>
            ${ctaButtons.length > 0 ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${ctaButtons.join("")}</tr></table>` : ""}
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:32px 30px 48px 30px;border-top:1px solid ${P.border};">
            <div style="font-family:${F.sans};font-size:10px;letter-spacing:3px;text-transform:uppercase;color:${P.textMuted};margin-bottom:16px;">${footerLinks}</div>
            <div style="font-family:${F.sans};font-size:10px;color:${P.textMuted};letter-spacing:1px;margin-bottom:6px;">${esc(brand.wordmark)} &middot; Johannesburg</div>
            <div style="font-family:${F.sans};font-size:9px;color:${P.textMuted};letter-spacing:1px;">You received this because you are on the ${esc(brand.wordmark)} list.<br /><a href="{{unsubscribe_url}}" style="color:${P.textMuted};text-decoration:underline;">Unsubscribe</a></div>
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
    const alt = slot.productName ? slot.productName : "";
    const className =
      slot.layout === "hero"
        ? "hero-img"
        : slot.layout === "showcase"
        ? "showcase-img"
        : slot.layout === "banner"
        ? "banner-img"
        : "full-img";
    const imgTag = `<img src="${escAttr(url)}" alt="${escAttr(alt)}" width="${slot.width}" class="${className}" style="display:block;width:100%;max-width:${slot.width}px;height:auto;border:0;outline:none;text-decoration:none;" />`;
    const re = new RegExp(`<!--BEGIN_SLOT:${slot.id}-->[\\s\\S]*?<!--END_SLOT:${slot.id}-->`, "g");
    result = result.replace(re, imgTag);
  }
  return result;
}
