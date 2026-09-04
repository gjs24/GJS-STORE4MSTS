import io
import html
from django.utils import timezone

def generate_invoice_pdf(order):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    primary_color = colors.HexColor("#991B1B")  # Deep railway red
    dark_slate = colors.HexColor("#0F172A")
    muted_slate = colors.HexColor("#475569")
    light_bg = colors.HexColor("#F8FAFC")
    border_color = colors.HexColor("#CBD5E1")
    paid_green = colors.HexColor("#15803D")

    styles = getSampleStyleSheet()

    brand_style = ParagraphStyle(
        'BrandTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=primary_color
    )
    subtitle_style = ParagraphStyle(
        'BrandSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=muted_slate
    )
    inv_title_style = ParagraphStyle(
        'InvTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        alignment=TA_RIGHT,
        textColor=dark_slate
    )
    inv_meta_style = ParagraphStyle(
        'InvMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=13,
        alignment=TA_RIGHT,
        textColor=muted_slate
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=primary_color
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=dark_slate
    )
    body_regular = ParagraphStyle(
        'BodyReg',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=dark_slate
    )
    body_muted = ParagraphStyle(
        'BodyMuted',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=11,
        textColor=muted_slate
    )
    table_hdr = ParagraphStyle(
        'TableHdr',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=dark_slate
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=dark_slate
    )
    table_cell_right = ParagraphStyle(
        'TableCellRight',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        alignment=TA_RIGHT,
        textColor=dark_slate
    )
    table_cell_bold_right = ParagraphStyle(
        'TableCellBoldRight',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        alignment=TA_RIGHT,
        textColor=dark_slate
    )

    story = []

    # Safe text sanitization
    def safe(val):
        if not val:
            return ""
        return html.escape(str(val))

    customer_name = safe(order.user.get_full_name() or order.user.username)
    username = safe(order.user.username)
    email = safe(order.user.email or "No email provided")
    asset_title = safe(order.asset.title)
    asset_version = safe(order.asset.version or "1.0")
    simulator = safe(getattr(order.asset, "simulator_type", "Open Rails (MSTS)").replace("_", " "))
    category = safe(getattr(order.asset.category, "name", "Addon") if getattr(order.asset, "category", None) else "Addon")
    order_ref = safe(order.provider_order_id or f"ORD-{order.id}")
    date_str = order.created_at.strftime("%d %b %Y, %I:%M %p") if order.created_at else timezone.now().strftime("%d %b %Y")
    status_label = safe(order.status)
    currency = safe(order.currency or "INR")
    amount = f"{order.amount:.2f}" if hasattr(order.amount, '__float__') else str(order.amount)

    payment_method = "UPI / Direct QR" if order.utr else "Online Payment Gateway"
    if hasattr(order, 'payment') and getattr(order.payment, 'provider', None):
        payment_method = f"{order.payment.provider} Payment"

    # 1. Header: Brand on left, Invoice Info on right
    brand_p = [
        Paragraph("MSTS-GJS PRODUCTION STORE", brand_style),
        Paragraph("Official Indian Railways Simulator Content & Addons", subtitle_style),
        Paragraph("Web: https://gjs-store-4-msts.vercel.app", subtitle_style),
        Paragraph("Email Support: support@gjsproduction.com", subtitle_style),
    ]
    inv_p = [
        Paragraph("TAX INVOICE", inv_title_style),
        Paragraph(f"<b>Invoice #:</b> GJS-{order.id:06d}", inv_meta_style),
        Paragraph(f"<b>Date:</b> {date_str}", inv_meta_style),
        Paragraph(f"<b>Order Ref:</b> {order_ref}", inv_meta_style),
        Paragraph(f"<b>Status:</b> <font color='#15803D'><b>{status_label} (PAID)</b></font>", inv_meta_style),
    ]

    header_table = Table([[brand_p, inv_p]], colWidths=[310, 230])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 14))

    # Divider line
    story.append(HRFlowable(width="100%", thickness=2, color=primary_color, spaceAfter=14))

    # 2. Bill To / Payment Method Cards
    bill_to_content = [
        Paragraph("BILLED TO / CUSTOMER DETAILS", heading_style),
        Spacer(1, 3),
        Paragraph(f"<b>{customer_name}</b>", body_bold),
        Paragraph(f"Username: @{username}", body_regular),
        Paragraph(f"Email: {email}", body_regular),
    ]

    payment_content = [
        Paragraph("PAYMENT & FULFILLMENT", heading_style),
        Spacer(1, 3),
        Paragraph(f"<b>Payment Mode:</b> {payment_method}", body_regular),
    ]
    if order.utr:
        payment_content.append(Paragraph(f"<b>UTR / Reference:</b> {safe(order.utr)}", body_regular))
    if order.payer_name:
        payment_content.append(Paragraph(f"<b>Payer Name:</b> {safe(order.payer_name)}", body_regular))
    payment_content.extend([
        Paragraph("<b>Fulfillment:</b> Instant Digital Entitlement", body_regular),
        Paragraph("<b>Delivery:</b> Online Download / Account Library", body_regular),
    ])

    info_table = Table([[bill_to_content, payment_content]], colWidths=[270, 270])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (0, 0), light_bg),
        ('BACKGROUND', (1, 0), (1, 0), light_bg),
        ('BOX', (0, 0), (0, 0), 1, border_color),
        ('BOX', (1, 0), (1, 0), 1, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 14))

    # 3. Itemized Product Table
    items_data = [
        [
            Paragraph("Item", table_hdr),
            Paragraph("Product Description", table_hdr),
            Paragraph("Simulator / Category", table_hdr),
            Paragraph("Qty", table_hdr),
            Paragraph("Price", table_hdr),
            Paragraph("Total", table_hdr),
        ],
        [
            Paragraph("1", table_cell),
            Paragraph(f"<b>{asset_title}</b><br/><font color='#64748B' size='7'>Version: {asset_version} | Digital Addon</font>", table_cell),
            Paragraph(f"{simulator}<br/><font color='#64748B' size='7'>{category}</font>", table_cell),
            Paragraph("1", table_cell),
            Paragraph(f"{currency} {amount}", table_cell_right),
            Paragraph(f"{currency} {amount}", table_cell_bold_right),
        ]
    ]

    items_table = Table(items_data, colWidths=[35, 210, 115, 35, 70, 75])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 1), (-1, 1), 1, border_color),
        ('GRID', (0, 0), (-1, -1), 0.5, border_color),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 10))

    # 4. Total Calculation Block
    totals_data = [
        ["", Paragraph("Subtotal:", table_cell_right), Paragraph(f"{currency} {amount}", table_cell_right)],
        ["", Paragraph("Taxes & GST (Inclusive):", table_cell_right), Paragraph(f"{currency} 0.00", table_cell_right)],
        ["", Paragraph("<b>Net Amount Paid:</b>", table_cell_bold_right), Paragraph(f"<b>{currency} {amount}</b>", table_cell_bold_right)],
    ]
    totals_table = Table(totals_data, colWidths=[280, 160, 100])
    totals_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LINEABOVE', (1, 2), (2, 2), 1.5, primary_color),
        ('BACKGROUND', (1, 2), (2, 2), light_bg),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 16))

    # 5. Terms Box
    terms_box = [
        Paragraph("DIGITAL LICENSE & FULFILLMENT NOTICE", heading_style),
        Spacer(1, 3),
        Paragraph(
            "1. <b>Digital Product Delivery:</b> This digital addon was fulfilled directly to your customer account upon verified payment. Files and updates can be downloaded anytime from your account dashboard.<br/>"
            "2. <b>Personal License:</b> You have received a single-user, non-transferable, non-commercial license to use this add-on in Indian Railways Open Rails / Microsoft Train Simulator. Redistribution, modification for resale, or sharing files is strictly prohibited.<br/>"
            "3. <b>Technical Support:</b> If you experience installation or downloading difficulties, contact us at support@gjsproduction.com with Invoice No. GJS-" + f"{order.id:06d}.<br/>"
            "4. <b>Cancellation / Refunds:</b> As detailed in store terms, digital downloads are non-refundable once unlocked and downloaded, except in cases of double-charge or verified delivery defect.",
            body_muted
        )
    ]
    terms_table = Table([[terms_box]], colWidths=[540])
    terms_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(terms_table)
    story.append(Spacer(1, 18))

    # 6. Footer
    story.append(Paragraph(
        "This is an electronically generated tax invoice & official receipt. No physical signature is required.<br/>"
        "Thank you for supporting Indian Railways simulator addon development! — <b>MSTS-GJS Production</b>",
        ParagraphStyle('Footer', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=11, alignment=TA_CENTER, textColor=muted_slate)
    ))

    doc.build(story)
    return buf.getvalue()


def generate_invoice_html(order):
    """
    Clean, responsive, printable HTML invoice.
    Can be viewed in browser or printed via window.print().
    """
    def safe(val):
        if not val:
            return ""
        return html.escape(str(val))

    customer_name = safe(order.user.get_full_name() or order.user.username)
    username = safe(order.user.username)
    email = safe(order.user.email or "No email provided")
    asset_title = safe(order.asset.title)
    asset_version = safe(order.asset.version or "1.0")
    simulator = safe(getattr(order.asset, "simulator_type", "Open Rails (MSTS)").replace("_", " "))
    category = safe(getattr(order.asset.category, "name", "Addon") if getattr(order.asset, "category", None) else "Addon")
    order_ref = safe(order.provider_order_id or f"ORD-{order.id}")
    date_str = order.created_at.strftime("%d %b %Y, %I:%M %p") if order.created_at else timezone.now().strftime("%d %b %Y")
    status_label = safe(order.status)
    currency = safe(order.currency or "INR")
    amount = f"{order.amount:.2f}" if hasattr(order.amount, '__float__') else str(order.amount)

    payment_method = "UPI / Direct QR" if order.utr else "Online Payment Gateway"
    if hasattr(order, 'payment') and getattr(order.payment, 'provider', None):
        payment_method = f"{order.payment.provider} Payment"

    utr_html = f"<div><strong>UTR / Reference:</strong> <code>{safe(order.utr)}</code></div>" if order.utr else ""
    payer_html = f"<div><strong>Payer Name:</strong> {safe(order.payer_name)}</div>" if order.payer_name else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Invoice GJS-{order.id:06d} | MSTS-GJS Production Store</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #f8fafc;
    padding: 32px 16px;
    line-height: 1.5;
  }}
  .invoice-wrapper {{
    max-width: 800px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    overflow: hidden;
  }}
  .header {{
    padding: 32px 36px 24px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #991b1b;
  }}
  .brand-title {{
    font-size: 22px;
    font-weight: 900;
    color: #991b1b;
    letter-spacing: 0.5px;
  }}
  .brand-sub {{
    font-size: 13px;
    color: #64748b;
    margin-top: 4px;
  }}
  .inv-title {{
    text-align: right;
  }}
  .inv-title h1 {{
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
  }}
  .inv-meta {{
    font-size: 13px;
    color: #475569;
    margin-top: 6px;
  }}
  .status-badge {{
    display: inline-block;
    padding: 2px 10px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 700;
    background: #dcfce7;
    color: #15803d;
    border: 1px solid #86efac;
    margin-top: 4px;
  }}
  .cards-grid {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding: 24px 36px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }}
  .card {{
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 16px;
    font-size: 13px;
  }}
  .card h3 {{
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    color: #991b1b;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
  }}
  .items-section {{
    padding: 24px 36px;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }}
  thead th {{
    background: #991b1b;
    color: #ffffff;
    text-align: left;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }}
  thead th.right, tbody td.right {{
    text-align: right;
  }}
  tbody td {{
    padding: 14px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: middle;
  }}
  .totals {{
    width: 320px;
    margin-left: auto;
    margin-top: 16px;
    font-size: 13px;
  }}
  .totals-row {{
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    color: #475569;
  }}
  .totals-row.grand-total {{
    border-top: 2px solid #991b1b;
    padding-top: 10px;
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
  }}
  .terms-box {{
    margin: 20px 36px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px 20px;
    font-size: 11px;
    color: #475569;
  }}
  .terms-box h4 {{
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    color: #991b1b;
    margin-bottom: 6px;
  }}
  .terms-box ol {{
    padding-left: 18px;
    line-height: 1.6;
  }}
  .footer {{
    padding: 20px 36px 28px;
    text-align: center;
    font-size: 11px;
    color: #64748b;
    border-top: 1px solid #e2e8f0;
  }}
  .print-btn {{
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #991b1b;
    color: #ffffff;
    border: none;
    padding: 12px 24px;
    border-radius: 9999px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(153, 27, 27, 0.4);
  }}
  @media print {{
    body {{ background: #ffffff; padding: 0; }}
    .invoice-wrapper {{ border: none; box-shadow: none; }}
    .print-btn {{ display: none; }}
  }}
</style>
</head>
<body>
<div class="invoice-wrapper">
  <div class="header">
    <div>
      <div class="brand-title">MSTS-GJS PRODUCTION STORE</div>
      <div class="brand-sub">Official Indian Railways Simulator Content & Addons</div>
      <div class="brand-sub">Web: https://gjs-store-4-msts.vercel.app | Support: support@gjsproduction.com</div>
    </div>
    <div class="inv-title">
      <h1>TAX INVOICE</h1>
      <div class="inv-meta">
        <div><strong>Invoice #:</strong> GJS-{order.id:06d}</div>
        <div><strong>Date:</strong> {date_str}</div>
        <div><strong>Order Ref:</strong> {order_ref}</div>
        <div class="status-badge">{status_label} (PAID)</div>
      </div>
    </div>
  </div>

  <div class="cards-grid">
    <div class="card">
      <h3>Billed To / Customer</h3>
      <div><strong>{customer_name}</strong></div>
      <div>Username: @{username}</div>
      <div>Email: {email}</div>
    </div>
    <div class="card">
      <h3>Payment & Fulfillment</h3>
      <div><strong>Payment Mode:</strong> {payment_method}</div>
      {utr_html}
      {payer_html}
      <div><strong>Fulfillment:</strong> Instant Digital Entitlement</div>
      <div><strong>Delivery:</strong> Online Download / Account Library</div>
    </div>
  </div>

  <div class="items-section">
    <table>
      <thead>
        <tr>
          <th style="width: 40px;">#</th>
          <th>Product Description</th>
          <th>Simulator / Category</th>
          <th class="right" style="width: 60px;">Qty</th>
          <th class="right" style="width: 100px;">Price</th>
          <th class="right" style="width: 110px;">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>
            <strong>{asset_title}</strong>
            <div style="font-size: 11px; color: #64748b;">Version: {asset_version} | Digital Addon</div>
          </td>
          <td>
            {simulator}
            <div style="font-size: 11px; color: #64748b;">{category}</div>
          </td>
          <td class="right">1</td>
          <td class="right">{currency} {amount}</td>
          <td class="right"><strong>{currency} {amount}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal:</span>
        <span>{currency} {amount}</span>
      </div>
      <div class="totals-row">
        <span>Taxes & GST (Inclusive):</span>
        <span>{currency} 0.00</span>
      </div>
      <div class="totals-row grand-total">
        <span>Net Amount Paid:</span>
        <span>{currency} {amount}</span>
      </div>
    </div>
  </div>

  <div class="terms-box">
    <h4>Digital License & Delivery Notice</h4>
    <ol>
      <li><strong>Instant Delivery:</strong> This digital product was fulfilled to your customer account upon verified payment. You can download package files anytime from your account dashboard.</li>
      <li><strong>Personal License:</strong> Single-user, non-transferable license for personal use in Indian Railways Open Rails / MSTS. Redistribution or resale is strictly prohibited.</li>
      <li><strong>Support:</strong> For help with installation, contact support@gjsproduction.com referencing Invoice #GJS-{order.id:06d}.</li>
      <li><strong>Non-refundable:</strong> As per store policy, digital software is non-refundable once unlocked and downloaded.</li>
    </ol>
  </div>

  <div class="footer">
    This is an electronically generated tax invoice & official receipt. No physical signature is required.<br/>
    Thank you for supporting Indian Railways simulator addon development! &mdash; <strong>MSTS-GJS Production</strong>
  </div>
</div>

<button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</body>
</html>
"""
