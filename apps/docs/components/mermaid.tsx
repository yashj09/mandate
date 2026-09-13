import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { renderMermaidSVG } from "beautiful-mermaid";

/** Server-rendered Mermaid: no client JS, drawn in the console's palette. */
export function Mermaid({ chart }: { chart: string }) {
  try {
    const svg = renderMermaidSVG(chart, {
      bg: "#fdfbf7",
      fg: "#2d2d2d",
      line: "#2d2d2d",
      accent: "#ff4d4d",
      muted: "#5c5c5c",
      surface: "#ffffff",
      border: "#2d2d2d",
      font: "Patrick Hand, Segoe Print, cursive, sans-serif",
      transparent: true,
      padding: 16,
    });
    return <div className="mermaid my-6 overflow-x-auto [&>svg]:mx-auto [&>svg]:h-auto [&>svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
  } catch {
    return (
      <CodeBlock title="Mermaid">
        <Pre>{chart}</Pre>
      </CodeBlock>
    );
  }
}
