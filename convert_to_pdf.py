#!/usr/bin/env python3
"""
Alternative PDF conversion using python-docx and reportlab (if available).
This is a fallback if pypandoc PDF conversion fails.
"""

from pathlib import Path
import sys

try:
    from docx import Document
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False
    print("[INFO] reportlab not available. Install with: pip install reportlab")

def docx_to_pdf_simple(docx_file, pdf_file):
    """Convert Word document to PDF using reportlab."""
    if not HAS_REPORTLAB:
        return False
    
    try:
        # Read Word document
        doc = Document(docx_file)
        
        # Create PDF
        pdf = SimpleDocTemplate(
            str(pdf_file),
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Container for PDF elements
        elements = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=12,
            alignment=1  # Center
        )
        
        # Process Word document paragraphs
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                elements.append(Spacer(1, 0.2*inch))
                continue
            
            # Check paragraph style
            style_name = para.style.name if para.style else 'Normal'
            
            if 'Heading 1' in style_name or 'Title' in style_name:
                elements.append(Paragraph(text, title_style))
                elements.append(Spacer(1, 0.2*inch))
            elif 'Heading 2' in style_name:
                elements.append(Paragraph(text, styles['Heading2']))
                elements.append(Spacer(1, 0.15*inch))
            elif 'Heading 3' in style_name:
                elements.append(Paragraph(text, styles['Heading3']))
                elements.append(Spacer(1, 0.1*inch))
            else:
                elements.append(Paragraph(text, styles['Normal']))
                elements.append(Spacer(1, 0.1*inch))
        
        # Build PDF
        pdf.build(elements)
        return True
    except Exception as e:
        print(f"Error converting to PDF: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    docx_file = Path('SECURITY_VULNERABILITIES_FIX_REPORT.docx')
    pdf_file = Path('SECURITY_VULNERABILITIES_FIX_REPORT.pdf')
    
    if not docx_file.exists():
        print(f"[ERROR] Word document not found: {docx_file}")
        sys.exit(1)
    
    print(f"[CONVERTING] {docx_file.name} -> {pdf_file.name}")
    
    if docx_to_pdf_simple(docx_file, pdf_file):
        print(f"[SUCCESS] PDF created: {pdf_file}")
    else:
        print(f"[INFO] For best results, use Microsoft Word:")
        print(f"       1. Open {docx_file}")
        print(f"       2. File -> Save As -> PDF")

