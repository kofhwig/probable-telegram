import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

/**
 * The prototype's icon set, path data unchanged. Icons in FILLED are solid
 * shapes; the rest are 1.7px strokes on a 24×24 grid.
 */
const FILLED = new Set(['lotus', 'coins', 'check', 'trendUp', 'trendDown', 'scissors']);

const LOTUS_PETAL_SMALL = 'M12 19.8C9.2 16.6 8.9 12 11 8.6a1.2 1.2 0 0 1 2 0c2.1 3.4 1.8 8-1 11.2Z';
const LOTUS_PETAL_LARGE = 'M12 19.8C8 16 7.6 9.6 10.7 5.1a1.6 1.6 0 0 1 2.6 0C16.4 9.6 16 16 12 19.8Z';

export type IconName =
  | 'house' | 'pie' | 'lotus' | 'swap' | 'sparkle' | 'search' | 'bell'
  | 'arrowLeft' | 'arrowRight' | 'arrowDown' | 'arrowUp' | 'caretRight'
  | 'star' | 'plus' | 'minus' | 'coins' | 'check' | 'circleDashed' | 'tap'
  | 'scissors' | 'trendUp' | 'trendDown' | 'gear' | 'trash' | 'pencil' | 'x'
  | 'wallet' | 'target' | 'refresh' | 'download' | 'info';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 22, color = 'currentColor' }: Props) {
  const filled = FILLED.has(name);
  const common = filled
    ? { fill: color, stroke: 'none' }
    : {
        fill: 'none' as const,
        stroke: color,
        strokeWidth: 1.7,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
      };

  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      {body(name, common, color)}
    </Svg>
  );
}

function body(name: IconName, p: Record<string, unknown>, color: string) {
  switch (name) {
    case 'house':
      return <Path {...p} d="M4 10.6 12 4l8 6.6V19a1.4 1.4 0 0 1-1.4 1.4h-3.4v-5.6H8.8v5.6H5.4A1.4 1.4 0 0 1 4 19z" />;
    case 'pie':
      return (
        <>
          <Path {...p} d="M12 3a9 9 0 1 0 9 9h-9z" />
          <Path {...p} d="M14.5 2.6A9 9 0 0 1 21.4 9.5h-6.9z" />
        </>
      );
    case 'lotus':
      return (
        <G>
          <Path {...p} d={LOTUS_PETAL_SMALL} transform="rotate(-76 12 19.8)" />
          <Path {...p} d={LOTUS_PETAL_SMALL} transform="rotate(76 12 19.8)" />
          <Path {...p} d={LOTUS_PETAL_LARGE} transform="rotate(-38 12 19.8)" />
          <Path {...p} d={LOTUS_PETAL_LARGE} transform="rotate(38 12 19.8)" />
          <Path {...p} d={LOTUS_PETAL_LARGE} />
        </G>
      );
    case 'swap':
      return (
        <>
          <Path {...p} d="M4 8h13m-3.5-3.5L17 8l-3.5 3.5" />
          <Path {...p} d="M20 16H7m3.5-3.5L7 16l3.5 3.5" />
        </>
      );
    case 'sparkle':
      return (
        <>
          <Path {...p} d="M12 3.2 13.9 9l5.9 1.9-5.9 1.9L12 18.8 10.1 12.9 4.2 11 10.1 9z" />
          <Path {...p} d="M18.6 3.4 19.3 5.5l2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7z" />
        </>
      );
    case 'search':
      return (
        <>
          <Circle {...p} cx={11} cy={11} r={6.4} />
          <Path {...p} d="m16 16 4.2 4.2" />
        </>
      );
    case 'bell':
      return (
        <>
          <Path {...p} d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.2 1.5 5.2H5s1.5-1.2 1.5-5.2Z" />
          <Path {...p} d="M10 18.4a2.2 2.2 0 0 0 4 0" />
        </>
      );
    case 'arrowLeft':
      return <Path {...p} d="M19 12H5m6-6-6 6 6 6" />;
    case 'arrowRight':
      return <Path {...p} d="M5 12h14m-6-6 6 6-6 6" />;
    case 'arrowDown':
      return <Path {...p} d="M12 5v14m-6-6 6 6 6-6" />;
    case 'arrowUp':
      return <Path {...p} d="M12 19V5m-6 6 6-6 6 6" />;
    case 'caretRight':
      return <Path {...p} d="m9.5 5.5 6.5 6.5-6.5 6.5" />;
    case 'star':
      return <Path {...p} d="m12 3.8 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 10l5.9-.8z" />;
    case 'plus':
      return <Path {...p} d="M12 5v14M5 12h14" />;
    case 'minus':
      return <Path {...p} d="M5 12h14" />;
    case 'coins':
      return (
        <>
          <Ellipse {...p} cx={12} cy={6.6} rx={7} ry={3} />
          <Path {...p} d="M5 6.6v4.2c0 1.7 3.1 3 7 3s7-1.3 7-3V6.6" />
          <Path {...p} d="M5 12.4v4.2c0 1.7 3.1 3 7 3s7-1.3 7-3v-4.2" />
        </>
      );
    case 'check':
      return (
        <Path
          {...p}
          d="M12 2.6A9.4 9.4 0 1 0 21.4 12 9.4 9.4 0 0 0 12 2.6Zm4.6 7-5.4 5.6a1 1 0 0 1-1.5 0L7.4 12.6a1 1 0 1 1 1.4-1.4l1.7 1.8 4.7-4.9a1 1 0 0 1 1.4 1.4Z"
        />
      );
    case 'circleDashed':
      return (
        <Path
          {...p}
          d="M8.6 3.6a9 9 0 0 0-3.4 2.4M3.2 10.2a9 9 0 0 0 0 3.6M5.2 18a9 9 0 0 0 3.4 2.4M13.8 20.8a9 9 0 0 0 3.4-2.4M20.8 13.8a9 9 0 0 0 0-3.6M18.8 6a9 9 0 0 0-3.4-2.4"
        />
      );
    case 'tap':
      return (
        <>
          <Path {...p} d="M9 11V6.2a1.8 1.8 0 0 1 3.6 0V14" />
          <Path {...p} d="M12.6 10.4a1.6 1.6 0 0 1 3.2 0v1.2" />
          <Path
            {...p}
            d="M15.8 11.2a1.6 1.6 0 0 1 3.2 0v3.6a6 6 0 0 1-6 6h-1.4a5 5 0 0 1-4-2l-2.5-3.4a1.7 1.7 0 0 1 2.6-2.1L9 14.6"
          />
        </>
      );
    case 'scissors':
      return (
        <Path
          d="M7.8 4.4 16 15.9m2.5-11.5L10 15.9m-2.6 5a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm9.2 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
          fill="none"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
        />
      );
    case 'trendUp':
      return (
        <Path
          {...p}
          d="M3.3 16.4a1 1 0 0 0 1.4 1.4l5.1-5.1 3 3a1 1 0 0 0 1.4 0l6-6V13a1 1 0 0 0 2 0V7a1 1 0 0 0-1-1h-6a1 1 0 0 0 0 2h3.6l-5.3 5.3-3-3a1 1 0 0 0-1.4 0Z"
        />
      );
    case 'trendDown':
      return (
        <Path
          {...p}
          d="M3.3 7.6a1 1 0 0 1 1.4-1.4l5.1 5.1 3-3a1 1 0 0 1 1.4 0l6 6V11a1 1 0 0 1 2 0v6a1 1 0 0 1-1 1h-6a1 1 0 0 1 0-2h3.6l-5.3-5.3-3 3a1 1 0 0 1-1.4 0Z"
        />
      );
    case 'gear':
      return (
        <>
          <Circle {...p} cx={12} cy={12} r={3} />
          <Path
            {...p}
            d="M19.2 14.4a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.8 1.8 0 1 1-3.6 0V20a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9H4a1.8 1.8 0 1 1 0-3.6h.2a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4V4a1.8 1.8 0 1 1 3.6 0v.2a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9h.2a1.8 1.8 0 1 1 0 3.6H20a1.5 1.5 0 0 0-1.4.9Z"
          />
        </>
      );
    case 'trash':
      return (
        <>
          <Path
            {...p}
            d="M4.8 6.8h14.4M9.6 6.8V5.2a1.2 1.2 0 0 1 1.2-1.2h2.4a1.2 1.2 0 0 1 1.2 1.2v1.6m3 0V19a1.4 1.4 0 0 1-1.4 1.4H7.2A1.4 1.4 0 0 1 5.8 19V6.8"
          />
          <Path {...p} d="M10.4 11v5m3.2-5v5" />
        </>
      );
    case 'pencil':
      return <Path {...p} d="M15.6 4.6a2 2 0 0 1 2.8 2.8L8.2 17.6l-4 1.2 1.2-4z" />;
    case 'x':
      return <Path {...p} d="M6 6l12 12M18 6 6 18" />;
    case 'wallet':
      return (
        <>
          <Path {...p} d="M3.6 8.4a2 2 0 0 1 2-2h11.8a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2H5.6a2 2 0 0 1-2-2z" />
          <Path {...p} d="M3.6 9.6h13.8a2 2 0 0 1 2 2v1.6a2 2 0 0 1-2 2H3.6z" fill="none" />
          <Circle {...p} cx={16.4} cy={12.4} r={1} />
        </>
      );
    case 'target':
      return (
        <>
          <Circle {...p} cx={12} cy={12} r={8.2} />
          <Circle {...p} cx={12} cy={12} r={4.4} />
          <Circle {...p} cx={12} cy={12} r={1} />
        </>
      );
    case 'refresh':
      return (
        <>
          <Path {...p} d="M20.4 12a8.4 8.4 0 1 1-2.5-6" />
          <Path {...p} d="M20.6 4.4v5.2h-5.2" />
        </>
      );
    case 'download':
      return (
        <>
          <Path {...p} d="M12 3.6v11m-4.4-4.4L12 14.6l4.4-4.4" />
          <Path {...p} d="M4.4 16.4v2.2a1.8 1.8 0 0 0 1.8 1.8h11.6a1.8 1.8 0 0 0 1.8-1.8v-2.2" />
        </>
      );
    case 'info':
      return (
        <>
          <Circle {...p} cx={12} cy={12} r={8.6} />
          <Path {...p} d="M12 11v5.2M12 7.8v.2" />
        </>
      );
    default:
      return null;
  }
}
