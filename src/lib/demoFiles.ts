/** Generates small, genuinely valid demo files for the local sandbox backend. */

function base64(input: string): string {
  return btoa(input);
}

/** Builds a minimal single-page PDF with a correct cross-reference table. */
export function makeDemoPdf(title: string, lines: string[]): string {
  const escape = (value: string) => value.replace(/([\\()])/g, '\\$1');
  const content =
    'BT /F1 16 Tf 40 720 Td (' +
    escape(title) +
    ') Tj ET\n' +
    lines
      .map(
        (line, index) =>
          'BT /F1 11 Tf 40 ' + (690 - index * 22) + ' Td (' + escape(line) + ') Tj ET',
      )
      .join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return `data:application/pdf;base64,${base64(pdf)}`;
}

/** Builds a real PNG via canvas so previews and downloads work in the sandbox. */
export function makeDemoImage(title: string, subtitle: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const gradient = ctx.createLinearGradient(0, 0, 900, 600);
  gradient.addColorStop(0, '#1d4ed8');
  gradient.addColorStop(1, '#0d9488');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 900, 600);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(30, 30, 840, 540);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 450, 280);
  ctx.font = '22px Inter, Arial, sans-serif';
  ctx.fillText(subtitle, 450, 330);
  ctx.font = '16px Inter, Arial, sans-serif';
  ctx.fillText('Demo document for the local sandbox', 450, 380);
  return canvas.toDataURL('image/png');
}
