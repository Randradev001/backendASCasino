from __future__ import annotations

import re
from io import BytesIO
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Frame,
    Image,
    LongTable,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from pypdf import PdfReader, PdfWriter
from pypdf._page import PageObject


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
LOGO = ROOT / "src" / "img" / "logoGOM.png"

BLUE = colors.HexColor("#00549F")
BLUE_DARK = colors.HexColor("#163A59")
BLUE_LIGHT = colors.HexColor("#EAF3FA")
ORANGE = colors.HexColor("#FF740C")
GRAY_900 = colors.HexColor("#263746")
GRAY_700 = colors.HexColor("#536575")
GRAY_500 = colors.HexColor("#8493A0")
GRAY_200 = colors.HexColor("#DFE6EB")
GRAY_100 = colors.HexColor("#F4F7F9")
GREEN = colors.HexColor("#198754")
AMBER = colors.HexColor("#B26A00")
RED = colors.HexColor("#B42318")


def register_fonts() -> tuple[str, str, str]:
    candidates = [
        Path("C:/Windows/Fonts/aptos.ttf"),
        Path("C:/Windows/Fonts/calibri.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    bold_candidates = [
        Path("C:/Windows/Fonts/aptos-bold.ttf"),
        Path("C:/Windows/Fonts/calibrib.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf"),
    ]
    mono_candidates = [
        Path("C:/Windows/Fonts/consola.ttf"),
        Path("C:/Windows/Fonts/cour.ttf"),
    ]
    regular = next((item for item in candidates if item.exists()), None)
    bold = next((item for item in bold_candidates if item.exists()), None)
    mono = next((item for item in mono_candidates if item.exists()), None)
    if regular and bold:
        pdfmetrics.registerFont(TTFont("CorpRegular", str(regular)))
        pdfmetrics.registerFont(TTFont("CorpBold", str(bold)))
        if mono:
            pdfmetrics.registerFont(TTFont("CorpMono", str(mono)))
        return "CorpRegular", "CorpBold", "CorpMono" if mono else "Courier"
    return "Helvetica", "Helvetica-Bold", "Courier"


REGULAR, BOLD, MONO = register_fonts()


def normalize_text(value: str) -> str:
    return (
        value.replace("\u2011", "-")
        .replace("\u2012", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u00a0", " ")
    )


def inline_markup(value: str) -> str:
    value = normalize_text(value.strip())
    links: list[tuple[str, str]] = []

    def hold_link(match: re.Match[str]) -> str:
        links.append((match.group(1), match.group(2)))
        return f"@@LINK{len(links) - 1}@@"

    value = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", hold_link, value)
    value = escape(value)
    value = re.sub(
        r"`([^`]+)`",
        lambda match: f'<font name="{MONO}" color="#163A59">{match.group(1)}</font>',
        value,
    )
    value = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)
    for index, (label, url) in enumerate(links):
        replacement = f'<link href="{escape(url, quote=True)}" color="#00549F"><u>{escape(label)}</u></link>'
        value = value.replace(f"@@LINK{index}@@", replacement)
    return value


def build_styles():
    styles = getSampleStyleSheet()
    return {
        "body": ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontName=REGULAR,
            fontSize=9.2,
            leading=13.2,
            textColor=GRAY_900,
            spaceAfter=6,
            allowWidows=0,
            allowOrphans=0,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=styles["Heading2"],
            fontName=BOLD,
            fontSize=15,
            leading=18,
            textColor=BLUE,
            spaceBefore=12,
            spaceAfter=7,
            keepWithNext=False,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=styles["Heading3"],
            fontName=BOLD,
            fontSize=11.2,
            leading=14,
            textColor=BLUE_DARK,
            spaceBefore=9,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=styles["BodyText"],
            fontName=REGULAR,
            fontSize=8.9,
            leading=12.3,
            textColor=GRAY_900,
            leftIndent=13,
            firstLineIndent=-7,
            bulletIndent=4,
            spaceAfter=3,
        ),
        "code": ParagraphStyle(
            "Code",
            parent=styles["Code"],
            fontName=MONO,
            fontSize=8.2,
            leading=11,
            textColor=BLUE_DARK,
            backColor=GRAY_100,
            borderColor=GRAY_200,
            borderWidth=0.5,
            borderPadding=7,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "table": ParagraphStyle(
            "TableCell",
            parent=styles["BodyText"],
            fontName=REGULAR,
            fontSize=7.2,
            leading=9.2,
            textColor=GRAY_900,
        ),
        "table_head": ParagraphStyle(
            "TableHead",
            parent=styles["BodyText"],
            fontName=BOLD,
            fontSize=7.4,
            leading=9.2,
            textColor=colors.white,
            alignment=TA_LEFT,
        ),
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=styles["Title"],
            fontName=BOLD,
            fontSize=25,
            leading=29,
            textColor=colors.white,
            alignment=TA_LEFT,
            spaceAfter=12,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=styles["BodyText"],
            fontName=REGULAR,
            fontSize=12,
            leading=17,
            textColor=colors.white,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=styles["BodyText"],
            fontName=REGULAR,
            fontSize=7.5,
            leading=10,
            textColor=GRAY_700,
        ),
        "callout": ParagraphStyle(
            "Callout",
            parent=styles["BodyText"],
            fontName=BOLD,
            fontSize=12,
            leading=16,
            textColor=BLUE_DARK,
        ),
    }


STYLES = build_styles()


class SecurityReportDoc(BaseDocTemplate):
    def __init__(self, filename: Path, title: str, subject: str):
        super().__init__(
            str(filename),
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=30 * mm,
            bottomMargin=24 * mm,
            title=title,
            author="ADP Casino - GOM",
            subject=subject,
        )
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="body")
        self.addPageTemplates(PageTemplate(id="main", frames=[frame]))

    def draw_page(self, canvas, doc):
        page = doc.page
        if page == 1:
            return
        canvas.saveState()
        canvas.setStrokeColor(GRAY_200)
        canvas.setLineWidth(0.5)
        canvas.line(18 * mm, A4[1] - 14 * mm, A4[0] - 18 * mm, A4[1] - 14 * mm)
        canvas.setFont(BOLD, 7.6)
        canvas.setFillColor(BLUE)
        canvas.drawString(18 * mm, A4[1] - 11 * mm, "ADP CASINO | SEGURIDAD")
        canvas.setFont(REGULAR, 7.2)
        canvas.setFillColor(GRAY_700)
        canvas.drawRightString(A4[0] - 18 * mm, A4[1] - 11 * mm, "16 OCT 2026")
        canvas.setStrokeColor(GRAY_200)
        canvas.line(18 * mm, 12 * mm, A4[0] - 18 * mm, 12 * mm)
        canvas.setFont(REGULAR, 7)
        canvas.setFillColor(GRAY_700)
        canvas.drawString(18 * mm, 8 * mm, "Uso interno - evaluación técnica")
        canvas.drawRightString(A4[0] - 18 * mm, 8 * mm, f"Página {page - 1}")
        canvas.restoreState()


def stamp_running_headers(path: Path):
    """Stamp running furniture over finished pages so long tables cannot cover it."""
    reader = PdfReader(str(path))
    writer = PdfWriter()
    for index, source_page in enumerate(reader.pages):
        page = PageObject.create_blank_page(
            width=float(source_page.mediabox.width),
            height=float(source_page.mediabox.height),
        )
        page.merge_page(source_page, over=True)
        if index:
            buffer = BytesIO()
            overlay_canvas = pdfcanvas.Canvas(buffer, pagesize=A4)
            overlay_canvas.setStrokeColor(GRAY_200)
            overlay_canvas.setLineWidth(0.5)
            overlay_canvas.line(18 * mm, A4[1] - 14 * mm, A4[0] - 18 * mm, A4[1] - 14 * mm)
            overlay_canvas.setFont(BOLD, 7.6)
            overlay_canvas.setFillColor(BLUE)
            overlay_canvas.drawString(18 * mm, A4[1] - 11 * mm, "ADP CASINO | SEGURIDAD")
            overlay_canvas.setFont(REGULAR, 7.2)
            overlay_canvas.setFillColor(GRAY_700)
            overlay_canvas.drawRightString(A4[0] - 18 * mm, A4[1] - 11 * mm, "16 OCT 2026")
            overlay_canvas.setStrokeColor(GRAY_200)
            overlay_canvas.line(18 * mm, 12 * mm, A4[0] - 18 * mm, 12 * mm)
            overlay_canvas.setFont(REGULAR, 7)
            overlay_canvas.setFillColor(GRAY_700)
            overlay_canvas.drawString(18 * mm, 8 * mm, "Uso interno - evaluación técnica")
            overlay_canvas.drawRightString(A4[0] - 18 * mm, 8 * mm, f"Página {index}")
            overlay_canvas.save()
            buffer.seek(0)
            page.merge_page(PdfReader(buffer).pages[0], over=True)
        writer.add_page(page)
    writer.add_metadata(reader.metadata or {})
    temporary = path.with_suffix(".stamped.pdf")
    with temporary.open("wb") as handle:
        writer.write(handle)
    temporary.replace(path)


def cover_story(title: str, subtitle: str, status: str, status_color, metric: str, metric_caption: str):
    story = [Spacer(1, 6 * mm)]
    if LOGO.exists():
        logo = Image(str(LOGO), width=36 * mm, height=36 * mm)
        logo.hAlign = "LEFT"
        story.append(logo)
    story.append(Spacer(1, 10 * mm))
    card = Table(
        [[Paragraph(inline_markup(title), STYLES["cover_title"])],
         [Paragraph(inline_markup(subtitle), STYLES["cover_subtitle"])]],
        colWidths=[174 * mm],
    )
    card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE),
        ("BOX", (0, 0), (-1, -1), 0, BLUE),
        ("LEFTPADDING", (0, 0), (-1, -1), 13 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 13 * mm),
        ("TOPPADDING", (0, 0), (-1, 0), 14 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 3 * mm),
        ("TOPPADDING", (0, 1), (-1, 1), 0),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 14 * mm),
    ]))
    story.extend([card, Spacer(1, 9 * mm)])
    status_table = Table(
        [[Paragraph("ESTADO", STYLES["small"]), Paragraph("RESULTADO CLAVE", STYLES["small"])],
         [Paragraph(f'<font color="{status_color.hexval()}"><b>{escape(status)}</b></font>', STYLES["callout"]),
          Paragraph(f'<font color="#00549F"><b>{escape(metric)}</b></font><br/><font size="8" color="#536575">{escape(metric_caption)}</font>', STYLES["callout"]) ]],
        colWidths=[70 * mm, 104 * mm],
    )
    status_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GRAY_100),
        ("BOX", (0, 0), (-1, -1), 0.7, GRAY_200),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, GRAY_200),
        ("LEFTPADDING", (0, 0), (-1, -1), 7 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7 * mm),
        ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.extend([
        status_table,
        Spacer(1, 14 * mm),
        Paragraph("Fecha de evaluación", STYLES["small"]),
        Paragraph("16 de octubre de 2026", STYLES["callout"]),
        Spacer(1, 8 * mm),
        Paragraph("Alcance", STYLES["small"]),
        Paragraph("Backend Node.js, frontend React, dependencias, configuración HTTP y preparación operativa.", STYLES["body"]),
        Spacer(1, 12 * mm),
        Paragraph("Documento preparado para revisión ejecutiva y técnica. No sustituye un pentest externo autorizado.", STYLES["small"]),
        PageBreak(),
    ])
    return story


def table_widths(column_count: int, available: float):
    presets = {
        2: [0.34, 0.66],
        3: [0.25, 0.38, 0.37],
        4: [0.18, 0.29, 0.30, 0.23],
    }
    ratios = presets.get(column_count, [1 / column_count] * column_count)
    return [available * ratio for ratio in ratios]


def markdown_table(rows: list[list[str]], available: float):
    data = []
    for row_index, row in enumerate(rows):
        style = STYLES["table_head"] if row_index == 0 else STYLES["table"]
        data.append([Paragraph(inline_markup(cell), style) for cell in row])
    table = LongTable(
        data,
        colWidths=table_widths(len(rows[0]), available),
        repeatRows=1,
        splitByRow=1,
        hAlign="LEFT",
    )
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, GRAY_200),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for index in range(1, len(rows)):
        commands.append(("BACKGROUND", (0, index), (-1, index), colors.white if index % 2 else GRAY_100))
    table.setStyle(TableStyle(commands))
    return table


def parse_markdown(path: Path, available_width: float):
    raw_lines = normalize_text(path.read_text(encoding="utf-8")).splitlines()
    story = []
    index = 0
    paragraph: list[str] = []

    def flush_paragraph():
        nonlocal paragraph
        if paragraph:
            story.append(Paragraph(inline_markup(" ".join(part.strip() for part in paragraph)), STYLES["body"]))
            paragraph = []

    while index < len(raw_lines):
        line = raw_lines[index].rstrip()
        stripped = line.strip()
        if index == 0 and stripped.startswith("# "):
            index += 1
            continue
        if index < 4 and (stripped.startswith("Fecha de evaluación:") or not stripped):
            index += 1
            continue
        if stripped.startswith("```"):
            flush_paragraph()
            code_lines = []
            index += 1
            while index < len(raw_lines) and not raw_lines[index].strip().startswith("```"):
                code_lines.append(raw_lines[index])
                index += 1
            code = "<br/>".join(escape(item) if item else " " for item in code_lines)
            story.append(Paragraph(code, STYLES["code"]))
            index += 1
            continue
        if stripped.startswith("## "):
            flush_paragraph()
            heading = stripped[3:]
            story.append(CondPageBreak(35 * mm))
            story.append(Paragraph(inline_markup(heading), STYLES["h2"]))
            index += 1
            continue
        if stripped.startswith("### "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(stripped[4:]), STYLES["h3"]))
            index += 1
            continue
        if stripped.startswith("|") and index + 1 < len(raw_lines) and re.match(r"^\s*\|?\s*:?-+", raw_lines[index + 1]):
            flush_paragraph()
            rows = []
            while index < len(raw_lines) and raw_lines[index].strip().startswith("|"):
                cells = [cell.strip() for cell in raw_lines[index].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-+:?", cell) for cell in cells):
                    rows.append(cells)
                index += 1
            if rows:
                story.extend([markdown_table(rows, available_width), Spacer(1, 7)])
            continue
        bullet_match = re.match(r"^\s*-\s+(.*)$", line)
        number_match = re.match(r"^\s*(\d+)\.\s+(.*)$", line)
        if bullet_match or number_match:
            flush_paragraph()
            if bullet_match:
                text = bullet_match.group(1)
                bullet = "-"
            else:
                text = number_match.group(2)
                bullet = f"{number_match.group(1)}."
            story.append(Paragraph(inline_markup(text), STYLES["bullet"], bulletText=bullet))
            index += 1
            continue
        if not stripped:
            flush_paragraph()
            index += 1
            continue
        paragraph.append(stripped)
        index += 1
    flush_paragraph()
    return story


def create_report(source: Path, output: Path, title: str, subtitle: str, status: str, status_color, metric: str, metric_caption: str):
    output.parent.mkdir(parents=True, exist_ok=True)
    doc = SecurityReportDoc(output, title, subtitle)
    story = cover_story(title, subtitle, status, status_color, metric, metric_caption)
    story.extend(parse_markdown(source, doc.width))
    doc.build(story)
    stamp_running_headers(output)


def main():
    reports = [
        {
            "source": ROOT / "docs" / "migration" / "security-before-after-2026-10-16.md",
            "output": OUTPUT_DIR / "ADP_Casino_Seguridad_Antes_vs_Ahora_2026-10-16.pdf",
            "title": "Seguridad ADP Casino\nAntes vs. estado actual",
            "subtitle": "Comparación verificable del endurecimiento aplicado",
            "status": "MEJORA MATERIAL",
            "status_color": GREEN,
            "metric": "51 -> 10",
            "metric_caption": "vulnerabilidades totales informadas en producción; 0 críticas actuales",
        },
        {
            "source": ROOT / "docs" / "migration" / "security-production-ethical-hacking-gap-2026-10-16.md",
            "output": OUTPUT_DIR / "ADP_Casino_Brechas_Produccion_Ethical_Hacking_2026-10-16.pdf",
            "title": "Preparación para producción\ny ethical hacking",
            "subtitle": "Brechas, prioridades, alcance de pruebas y evidencia de aprobación",
            "status": "PREPARACIÓN PARCIAL",
            "status_color": AMBER,
            "metric": "P0 + P1",
            "metric_caption": "bloqueadores de producción y requisitos previos al pentest formal",
        },
    ]
    for report in reports:
        create_report(**report)
        print(report["output"])


if __name__ == "__main__":
    main()
