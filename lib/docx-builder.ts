import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  PageOrientation,
} from "docx";
import type { Analyse, Context, Leerdoel } from "./schemas";

const PCC_BLAUW = "1F4E79";
const ZACHT_GRIJS = "F2F2F2";
const RAND_GRIJS = "BFBFBF";

const fontSizeNormal = 22; // half-points → 11pt
const fontSizeSmall = 18; // 9pt
const fontSizeHeading = 28; // 14pt
const fontSizeTitle = 40; // 20pt

function txt(value: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({
    text: value,
    bold: opts.bold,
    size: opts.size ?? fontSizeNormal,
    color: opts.color,
    font: "Calibri",
  });
}

function para(
  children: TextRun[] | string,
  opts: { spacingBefore?: number; spacingAfter?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel] } = {},
) {
  const runs =
    typeof children === "string" ? [txt(children)] : children;
  return new Paragraph({
    children: runs,
    spacing: { before: opts.spacingBefore ?? 0, after: opts.spacingAfter ?? 120 },
    alignment: opts.align,
    heading: opts.heading,
  });
}

function emptyPara() {
  return new Paragraph({ children: [txt("")], spacing: { after: 100 } });
}

function cell(
  content: Paragraph | Paragraph[],
  opts: {
    bg?: string;
    width?: number;
    bold?: boolean;
    widthType?: (typeof WidthType)[keyof typeof WidthType];
  } = {},
): TableCell {
  const paragraphs = Array.isArray(content) ? content : [content];
  return new TableCell({
    children: paragraphs,
    shading: opts.bg
      ? { type: ShadingType.CLEAR, color: "auto", fill: opts.bg }
      : undefined,
    width: opts.width
      ? { size: opts.width, type: opts.widthType ?? WidthType.PERCENTAGE }
      : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  });
}

function headerCell(text: string, widthPct?: number): TableCell {
  return cell(
    para([txt(text, { bold: true, color: "FFFFFF" })]),
    { bg: PCC_BLAUW, width: widthPct, widthType: WidthType.PERCENTAGE },
  );
}

function bodyCell(text: string, widthPct?: number, opts: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}): TableCell {
  return cell(
    para([txt(text, { bold: opts.bold })], { align: opts.align }),
    { width: widthPct, widthType: WidthType.PERCENTAGE },
  );
}

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: RAND_GRIJS },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: RAND_GRIJS },
  left: { style: BorderStyle.SINGLE, size: 4, color: RAND_GRIJS },
  right: { style: BorderStyle.SINGLE, size: 4, color: RAND_GRIJS },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: RAND_GRIJS },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: RAND_GRIJS },
};

function titleBlock(title: string, subtitle?: string): Paragraph[] {
  const out: Paragraph[] = [
    para(
      [txt(title, { bold: true, size: fontSizeTitle, color: PCC_BLAUW })],
      { spacingAfter: subtitle ? 80 : 240 },
    ),
  ];
  if (subtitle) {
    out.push(
      para([txt(subtitle, { size: fontSizeSmall, color: "595959" })], {
        spacingAfter: 240,
      }),
    );
  }
  return out;
}

function contextTable(ctx: Context, toetsNaam?: string): Table {
  const rows: TableRow[] = [];
  const add = (label: string, value: string) =>
    rows.push(
      new TableRow({
        children: [
          cell(para([txt(label, { bold: true })]), { bg: ZACHT_GRIJS, width: 25 }),
          bodyCell(value, 75),
        ],
      }),
    );
  add("Vak", ctx.vak);
  add("Leerjaar", ctx.leerjaar);
  add("Niveau", ctx.niveau);
  add("Onderwerp", ctx.onderwerp);
  if (toetsNaam) add("Toets", toetsNaam);
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
  });
}

function sectionHeading(text: string): Paragraph {
  return para([txt(text, { bold: true, size: fontSizeHeading, color: PCC_BLAUW })], {
    spacingBefore: 280,
    spacingAfter: 120,
    heading: HeadingLevel.HEADING_2,
  });
}

function leerdoelenTable(leerdoelen: Leerdoel[]): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Code", 10),
      headerCell("Titel", 30),
      headerCell("In leerlingtaal", 60),
    ],
  });
  const body = leerdoelen.map(
    (ld) =>
      new TableRow({
        children: [
          bodyCell(ld.code, 10, { bold: true }),
          bodyCell(ld.titel, 30),
          bodyCell(ld.leerlingtaal, 60),
        ],
      }),
  );
  return new Table({
    rows: [header, ...body],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
  });
}

function mappingTable(analyse: Analyse): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Vraag", 10),
      headerCell("Wat wordt gevraagd", 50),
      headerCell("Leerdoel", 25),
      headerCell("Punten", 15),
    ],
  });
  const body = analyse.mapping.map(
    (m) =>
      new TableRow({
        children: [
          bodyCell(m.vraag, 10, { bold: true }),
          bodyCell(m.omschrijving, 50),
          bodyCell(m.leerdoelCodes.join(", "), 25),
          bodyCell(String(m.punten), 15, { align: AlignmentType.CENTER }),
        ],
      }),
  );
  return new Table({
    rows: [header, ...body],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
  });
}

function gewichtPerLeerdoel(analyse: Analyse) {
  const totalsByCode: Record<string, number> = {};
  let total = 0;
  for (const m of analyse.mapping) {
    for (const code of m.leerdoelCodes) {
      const share = m.punten / m.leerdoelCodes.length;
      totalsByCode[code] = (totalsByCode[code] || 0) + share;
    }
    total += m.punten;
  }
  return { totalsByCode, total };
}

function gewichtTable(analyse: Analyse): Table {
  const { totalsByCode, total } = gewichtPerLeerdoel(analyse);
  const header = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Leerdoel", 15),
      headerCell("Titel", 45),
      headerCell("Punten", 15),
      headerCell("Aandeel", 25),
    ],
  });
  const rows = analyse.leerdoelen.map((ld) => {
    const pts = totalsByCode[ld.code] || 0;
    const pct = total > 0 ? Math.round((pts / total) * 100) : 0;
    const bar = "█".repeat(Math.max(1, Math.round(pct / 5)));
    return new TableRow({
      children: [
        bodyCell(ld.code, 15, { bold: true }),
        bodyCell(ld.titel, 45),
        bodyCell(pts.toFixed(1), 15, { align: AlignmentType.CENTER }),
        bodyCell(`${pct}%  ${bar}`, 25),
      ],
    });
  });
  return new Table({
    rows: [header, ...rows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
  });
}

function drempelsTable(analyse: Analyse): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Leerdoel", 15),
      headerCell("Nog niet", 20),
      headerCell("Op weg", 20),
      headerCell("Behaald", 20),
      headerCell("Toelichting", 25),
    ],
  });
  const titelByCode: Record<string, string> = Object.fromEntries(
    analyse.leerdoelen.map((ld) => [ld.code, ld.titel]),
  );
  const rows = analyse.drempels.map((d) => {
    const code = d.leerdoelCode;
    const label = `${code} — ${titelByCode[code] ?? ""}`;
    return new TableRow({
      children: [
        bodyCell(label, 15, { bold: true }),
        bodyCell(`< ${d.nogNietTotProcent}%`, 20, { align: AlignmentType.CENTER }),
        bodyCell(
          `${d.nogNietTotProcent}–${d.behaaldVanafProcent - 1}%`,
          20,
          { align: AlignmentType.CENTER },
        ),
        bodyCell(`≥ ${d.behaaldVanafProcent}%`, 20, { align: AlignmentType.CENTER }),
        bodyCell(d.toelichting ?? "", 25),
      ],
    });
  });
  return new Table({
    rows: [header, ...rows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
  });
}

/** Docent-rubric: per leerdoel een rij met Nog niet / Op weg / Behaald checkboxes voor de docent bij nakijken. */
function docentRubricTable(analyse: Analyse): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Leerdoel", 35),
      headerCell("Nog niet", 12),
      headerCell("Op weg", 12),
      headerCell("Behaald", 12),
      headerCell("Toelichting", 29),
    ],
  });
  const rows = analyse.leerdoelen.map((ld) => {
    return new TableRow({
      children: [
        cell(
          [
            para([txt(ld.code, { bold: true })], { spacingAfter: 40 }),
            para([txt(ld.leerlingtaal, { size: fontSizeSmall })]),
          ],
          { width: 35, widthType: WidthType.PERCENTAGE },
        ),
        bodyCell("☐", 12, { align: AlignmentType.CENTER }),
        bodyCell("☐", 12, { align: AlignmentType.CENTER }),
        bodyCell("☐", 12, { align: AlignmentType.CENTER }),
        bodyCell(" ", 29),
      ],
    });
  });
  return new Table({
    rows: [header, ...rows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
  });
}

/**
 * Sorteer-key voor vraagnummers in toets-volgorde.
 * Ondersteunt: "1", "1a", "1b", "2", "10a", etc.
 */
function vraagSortKey(vraag: string): [number, string] {
  const m = /^(\d+)([a-zA-Z]*)/.exec(vraag.trim());
  if (m) return [parseInt(m[1], 10), m[2].toLowerCase()];
  return [Number.MAX_SAFE_INTEGER, vraag.toLowerCase()];
}

function sortedMapping(analyse: Analyse): typeof analyse.mapping {
  return [...analyse.mapping].sort((a, b) => {
    const ka = vraagSortKey(a.vraag);
    const kb = vraagSortKey(b.vraag);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    return ka[1] < kb[1] ? -1 : ka[1] > kb[1] ? 1 : 0;
  });
}

/** Tabel: per vraag (volgorde toets) leerling vult zelf in hoeveel punten gehaald. */
function puntenPerVraagTable(analyse: Analyse): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Vraag", 10),
      headerCell("Onderwerp", 45),
      headerCell("Leerdoel", 20),
      headerCell("Max", 10),
      headerCell("Mijn punten", 15),
    ],
  });
  const rows = sortedMapping(analyse).map((m) => {
    return new TableRow({
      children: [
        bodyCell(m.vraag, 10, { bold: true }),
        bodyCell(m.omschrijving, 45),
        bodyCell(m.leerdoelCodes.join(", "), 20),
        bodyCell(String(m.punten), 10, { align: AlignmentType.CENTER }),
        bodyCell(`____ / ${m.punten}`, 15, { align: AlignmentType.CENTER }),
      ],
    });
  });
  return new Table({
    rows: [header, ...rows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
  });
}

/** Per leerdoel: welke vragen tellen mee + max + lege box voor eigen totaal en oordeel. */
function analysePerLeerdoel(analyse: Analyse): (Paragraph | Table)[] {
  const drempelByCode: Record<string, Analyse["drempels"][number]> =
    Object.fromEntries(analyse.drempels.map((d) => [d.leerdoelCode, d]));

  const out: (Paragraph | Table)[] = [];

  for (const ld of analyse.leerdoelen) {
    // Verzamel vragen die bij dit leerdoel horen, met share van punten
    const items = analyse.mapping
      .filter((m) => m.leerdoelCodes.includes(ld.code))
      .map((m) => ({
        vraag: m.vraag,
        share: m.punten / m.leerdoelCodes.length,
        gedeeld: m.leerdoelCodes.length > 1,
      }))
      .sort((a, b) => {
        const ka = vraagSortKey(a.vraag);
        const kb = vraagSortKey(b.vraag);
        if (ka[0] !== kb[0]) return ka[0] - kb[0];
        return ka[1] < kb[1] ? -1 : ka[1] > kb[1] ? 1 : 0;
      });
    const totaalMax = items.reduce((s, i) => s + i.share, 0);

    const vragenLijst = items.length
      ? items
          .map((i) => {
            const pt = Number.isInteger(i.share)
              ? i.share.toString()
              : i.share.toFixed(1);
            return `${i.vraag} (${pt} pt${i.gedeeld ? ", gedeeld" : ""})`;
          })
          .join(" · ")
      : "geen vragen gekoppeld";

    const d = drempelByCode[ld.code];
    const drempelsText = d
      ? `Behaald ≥ ${d.behaaldVanafProcent}% · Op weg ${d.nogNietTotProcent}–${d.behaaldVanafProcent - 1}% · Nog niet < ${d.nogNietTotProcent}%`
      : "Behaald ≥ 75% · Op weg 40–74% · Nog niet < 40%";

    const totaalStr = Number.isInteger(totaalMax)
      ? totaalMax.toString()
      : totaalMax.toFixed(1);

    // Eén tabel per leerdoel (compact + duidelijk visueel)
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        cell(
          [
            para([
              txt(ld.code, { bold: true, color: "FFFFFF" }),
              txt(`  ·  ${ld.titel}`, { color: "FFFFFF", bold: true }),
            ]),
            para([txt(ld.leerlingtaal, { color: "FFFFFF", size: fontSizeSmall })]),
          ],
          { bg: PCC_BLAUW, width: 100, widthType: WidthType.PERCENTAGE },
        ),
      ],
    });

    const vragenRow = new TableRow({
      children: [
        cell(
          [
            para(
              [
                txt("Vragen die meetellen: ", { bold: true, size: fontSizeSmall }),
                txt(vragenLijst, { size: fontSizeSmall }),
              ],
              { spacingAfter: 60 },
            ),
            para([
              txt("Totaal mogelijk: ", { bold: true, size: fontSizeSmall }),
              txt(`${totaalStr} pt`, { size: fontSizeSmall }),
            ]),
          ],
          { bg: ZACHT_GRIJS },
        ),
      ],
    });

    const invulRow = new TableRow({
      children: [
        cell(
          [
            para(
              [
                txt("Mijn punten:  ", { bold: true }),
                txt(`____  /  ${totaalStr}`),
                txt("           Percentage: ", { bold: true }),
                txt("_____ %"),
              ],
              { spacingAfter: 120 },
            ),
            para(
              [
                txt("Mijn beoordeling:   ", { bold: true }),
                txt("☐ Behaald     ☐ Op weg     ☐ Nog niet"),
              ],
              { spacingAfter: 60 },
            ),
            para([
              txt(drempelsText, { size: fontSizeSmall, color: "595959" }),
            ]),
          ],
        ),
      ],
    });

    out.push(
      new Table({
        rows: [headerRow, vragenRow, invulRow],
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
      }),
    );
    out.push(emptyPara());
  }

  return out;
}

function feedbackHeaderTable(ctx: Context, toetsNaam?: string): Table {
  const naam = toetsNaam ?? `${ctx.vak} — ${ctx.onderwerp}`;
  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell(para([txt("Naam", { bold: true })]), { bg: ZACHT_GRIJS, width: 15 }),
        bodyCell("", 35),
        cell(para([txt("Klas", { bold: true })]), { bg: ZACHT_GRIJS, width: 15 }),
        bodyCell("", 35),
      ],
    }),
    new TableRow({
      children: [
        cell(para([txt("Toets", { bold: true })]), { bg: ZACHT_GRIJS, width: 15 }),
        bodyCell(naam, 35),
        cell(para([txt("Datum", { bold: true })]), { bg: ZACHT_GRIJS, width: 15 }),
        bodyCell("", 35),
      ],
    }),
  ];
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
  });
}

function reflectieBlock(label: string): Paragraph[] {
  return [
    para([txt(label, { bold: true })], { spacingBefore: 200, spacingAfter: 60 }),
    para([txt(" ")]),
    para([txt(" ")]),
    para([txt(" ")]),
  ];
}

const today = () =>
  new Intl.DateTimeFormat("nl-NL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

function footer(): Paragraph {
  return para(
    [txt(`Gegenereerd met EduRubric · ${today()}`, { size: fontSizeSmall, color: "808080" })],
    { spacingBefore: 360, align: AlignmentType.CENTER },
  );
}

export async function buildAnalyseDocx(
  ctx: Context,
  analyse: Analyse,
  toetsNaam?: string,
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  children.push(
    ...titleBlock(
      "Analyse — leerdoelen, mapping & drempels",
      "Voor sectie- of vakgroepoverleg",
    ),
  );
  children.push(contextTable(ctx, toetsNaam));

  children.push(sectionHeading("Leerdoelen"));
  children.push(leerdoelenTable(analyse.leerdoelen));

  children.push(sectionHeading("Mapping vraag → leerdoel"));
  children.push(mappingTable(analyse));

  children.push(sectionHeading("Gewicht per leerdoel"));
  children.push(gewichtTable(analyse));

  children.push(sectionHeading("Drempels"));
  children.push(drempelsTable(analyse));

  children.push(sectionHeading("Observatie"));
  children.push(para(analyse.observatie));

  children.push(footer());

  const doc = new Document({
    creator: "EduRubric",
    title: `Analyse — ${ctx.vak} ${ctx.onderwerp}`,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
          },
        },
        children,
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

export async function buildDocentRubricDocx(
  ctx: Context,
  analyse: Analyse,
  toetsNaam?: string,
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  children.push(
    ...titleBlock(
      "Docent-rubric",
      `${ctx.vak} · leerjaar ${ctx.leerjaar} · ${ctx.niveau} · ${ctx.onderwerp}`,
    ),
  );
  children.push(feedbackHeaderTable(ctx, toetsNaam));

  children.push(sectionHeading("Beoordeling per leerdoel"));
  children.push(
    para(
      [
        txt(
          "Kruis aan tijdens of na het nakijken. Gebruik de toelichting-kolom voor specifieke aandachtspunten per leerling.",
          { size: fontSizeSmall, color: "595959" },
        ),
      ],
      { spacingAfter: 120 },
    ),
  );
  children.push(docentRubricTable(analyse));

  children.push(sectionHeading("Drempels — wat betekent dit?"));
  children.push(drempelsTable(analyse));

  children.push(sectionHeading("Opmerking docent"));
  children.push(...reflectieBlock("Toelichting / vervolgactie"));

  children.push(footer());

  const doc = new Document({
    creator: "EduRubric",
    title: `Docent-rubric — ${ctx.vak} ${ctx.onderwerp}`,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
          },
        },
        children,
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

export async function buildFeedbackDocx(
  ctx: Context,
  analyse: Analyse,
  toetsNaam?: string,
): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  children.push(
    ...titleBlock(
      "Mijn analyse",
      `${ctx.vak} · leerjaar ${ctx.leerjaar} · ${ctx.niveau} · ${ctx.onderwerp}`,
    ),
  );
  children.push(feedbackHeaderTable(ctx, toetsNaam));

  children.push(sectionHeading("Stap 1 — Vul per vraag in hoeveel punten je hebt"));
  children.push(
    para(
      [
        txt(
          "Pak je nagekeken toets erbij. Schrijf per vraag op hoeveel punten je hebt gehaald. Vragen staan in toetsvolgorde.",
          { size: fontSizeSmall, color: "595959" },
        ),
      ],
      { spacingAfter: 120 },
    ),
  );
  children.push(puntenPerVraagTable(analyse));

  children.push(sectionHeading("Stap 2 — Analyseer per leerdoel"));
  children.push(
    para(
      [
        txt(
          "Tel per leerdoel je punten op. Reken het percentage uit (mijn punten ÷ totaal × 100). Kruis daarna aan: Behaald, Op weg of Nog niet.",
          { size: fontSizeSmall, color: "595959" },
        ),
      ],
      { spacingAfter: 120 },
    ),
  );
  children.push(...analysePerLeerdoel(analyse));

  children.push(sectionHeading("Stap 3 — Wat ga ik oefenen?"));
  children.push(
    para(
      [
        txt(
          "Welk leerdoel ga je extra oefenen, en hoe? Schrijf concreet op wat je gaat doen.",
          { size: fontSizeSmall, color: "595959" },
        ),
      ],
      { spacingAfter: 80 },
    ),
  );
  children.push(...reflectieBlock("Mijn plan"));

  children.push(...reflectieBlock("Opmerking docent"));

  children.push(footer());

  const doc = new Document({
    creator: "EduRubric",
    title: `Feedback — ${ctx.vak} ${ctx.onderwerp}`,
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 800, right: 800, bottom: 800, left: 800 },
          },
        },
        children,
      },
    ],
  });
  return await Packer.toBuffer(doc);
}
