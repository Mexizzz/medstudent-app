'use client';

interface SVGDiagramProps {
  svgCode: string;
  className?: string;
}

function sanitizeSVG(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/<svg\b/, '<svg style="width:100%;height:auto;display:block;"');
}

export function SVGDiagram({ svgCode, className }: SVGDiagramProps) {
  if (!svgCode) return null;
  return (
    <div
      className={`w-full overflow-hidden rounded-xl border border-amber-200 shadow-inner ${className ?? ''}`}
      style={{ lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: sanitizeSVG(svgCode) }}
    />
  );
}
