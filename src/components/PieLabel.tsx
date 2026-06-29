const RADIAN = Math.PI / 180;

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  name: string;
  percent: number;
  index: number;
  fill: string;
}

const placedLabels: { x: number; y: number }[] = [];

function avoidOverlap(x: number, y: number, lineHeight: number): { x: number; y: number } {
  for (const placed of placedLabels) {
    if (Math.abs(x - placed.x) < 60 && Math.abs(y - placed.y) < lineHeight) {
      y = placed.y + (y >= placed.y ? lineHeight : -lineHeight);
    }
  }
  return { x, y };
}

export function renderPieLabel(props: LabelProps) {
  const { cx, cy, midAngle, outerRadius, name, percent, index, fill } = props;

  if (index === 0) placedLabels.length = 0;

  if (percent < 0.03) return null;

  const gap = Math.max(outerRadius * 0.25, 14);
  const lineGap = Math.max(outerRadius * 0.1, 6);

  const radius = outerRadius + gap;
  const rawX = cx + radius * Math.cos(-midAngle * RADIAN);
  const rawY = cy + radius * Math.sin(-midAngle * RADIAN);

  const { x, y } = avoidOverlap(rawX, rawY, 16);
  placedLabels.push({ x, y });

  const anchor = x > cx ? 'start' : 'end';
  const lineEndX = cx + (outerRadius + lineGap) * Math.cos(-midAngle * RADIAN);
  const lineEndY = cy + (outerRadius + lineGap) * Math.sin(-midAngle * RADIAN);

  return (
    <g>
      <polyline
        points={`${lineEndX},${lineEndY} ${x},${y}`}
        fill="none"
        stroke={fill}
        strokeWidth={1}
        opacity={0.6}
      />
      <text
        x={x + (x > cx ? 4 : -4)}
        y={y}
        textAnchor={anchor}
        dominantBaseline="central"
        fontSize={11}
        fill="#374151"
      >
        {name} {(percent * 100).toFixed(0)}%
      </text>
    </g>
  );
}
