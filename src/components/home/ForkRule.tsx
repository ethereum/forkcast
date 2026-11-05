import React from 'react';

/**
 * The masthead flourish: a git graph running through the page title, in the gradient of the
 * site's own mark.
 *
 * Both sides fork; nothing merges, since branches that fork away from Ethereum do not
 * rejoin it. Left is history, so its dead branch fades. Right is undecided, so its open
 * branch is dashed.
 *
 * The box is taller than the title's line and pulled back with a negative margin, which is
 * what lets the fork open without costing the page height.
 */

const WIDTH = 200;
const HEIGHT = 54;
/** The title's line, and so where the graph meets it. */
const MID = 27;
/** Where each side forks. */
const NODE_X = 64;
/**
 * How far each branch leaves its fork. Shared, because the two sides open from different
 * baselines and will not match by eye if set separately.
 */
const SPREAD = 12;

/* Past: in straight below the title, fork, climb to the title; the drop gives out. */
const PAST_ENTRY_Y = MID + SPREAD;
const PAST_DEAD_Y = PAST_ENTRY_Y + SPREAD;
const PAST_TRUNK = `M0 ${PAST_ENTRY_Y}H${NODE_X}C92 ${PAST_ENTRY_Y} 96 ${MID} 124 ${MID}H${WIDTH}`;
const PAST_ABANDONED = `M${NODE_X} ${PAST_ENTRY_Y}C92 ${PAST_ENTRY_Y} 96 ${PAST_DEAD_Y} 124 ${PAST_DEAD_Y}H180`;
const PAST_COMMIT = { x: 150, y: PAST_DEAD_Y };

/* Future: out of the title, fork, the drop carries on and the climb is still undecided. */
const FUTURE_DOWN_Y = MID + SPREAD;
const FUTURE_UP_Y = MID - SPREAD;
const FUTURE_TRUNK = `M0 ${MID}H${NODE_X}`;
const FUTURE_CONTINUES = `M${NODE_X} ${MID}C92 ${MID} 96 ${FUTURE_DOWN_Y} 124 ${FUTURE_DOWN_Y}H${WIDTH}`;
const FUTURE_TRAILS = `M${NODE_X} ${MID}C92 ${MID} 96 ${FUTURE_UP_Y} 124 ${FUTURE_UP_Y}H${WIDTH}`;
const FUTURE_COMMIT = { x: 156, y: FUTURE_DOWN_Y };

export const ForkRule: React.FC<{ direction: 'in' | 'out' }> = ({ direction }) => {
  const out = direction === 'out';
  const id = `fork-rule-${direction}`;
  const fade = `${id}-fade`;

  return (
    <svg
      aria-hidden="true"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      fill="none"
      /* Held back until `md`: these do not shrink, and below that they wrap the title. */
      className={`-my-2.5 hidden h-auto w-[150px] shrink-0 md:block lg:w-[200px] ${
        out ? 'fork-flank-out' : 'fork-flank-in'
      }`}
    >
      <defs>
        {/* Reversed on the outgoing side, so purple meets the title from both directions
            and the masthead reads as one symmetric sweep rather than two halves. */}
        <linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          x1={out ? WIDTH : 0}
          y1={HEIGHT}
          x2={out ? 0 : WIDTH}
          y2="0"
        >
          <stop offset="0" stopColor="#00D4FF" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
        {/* Masked rather than recoloured, so the dying branch keeps the trunk's hue. */}
        <linearGradient
          id={`${fade}-ramp`}
          gradientUnits="userSpaceOnUse"
          x1={NODE_X}
          y1="0"
          x2={out ? 164 : 180}
          y2="0"
        >
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={fade}>
          <rect width={WIDTH} height={HEIGHT} fill={`url(#${fade}-ramp)`} />
        </mask>
      </defs>

      {/* The run that carried on holds more weight than what comes off it. */}
      <g stroke={`url(#${id})`} strokeLinecap="round">
        {out ? (
          <>
            <path d={FUTURE_TRUNK} strokeWidth={2.25} />
            <path d={FUTURE_CONTINUES} strokeWidth={2.25} />
            {/* Dashed, not faded: this one has not happened either way yet. */}
            <path d={FUTURE_TRAILS} strokeWidth={1.75} strokeDasharray="5 5" mask={`url(#${fade})`} />
          </>
        ) : (
          <>
            <path d={PAST_TRUNK} strokeWidth={2.25} />
            <path d={PAST_ABANDONED} strokeWidth={1.75} mask={`url(#${fade})`} />
          </>
        )}
      </g>

      {/* The commit each fork leaves from, and one further along the branch it left behind. */}
      <circle cx={NODE_X} cy={out ? MID : PAST_ENTRY_Y} r={3} fill={`url(#${id})`} />
      {out ? (
        <circle cx={FUTURE_COMMIT.x} cy={FUTURE_COMMIT.y} r={2} fill={`url(#${id})`} />
      ) : (
        <circle
          cx={PAST_COMMIT.x}
          cy={PAST_COMMIT.y}
          r={2}
          fill={`url(#${id})`}
          mask={`url(#${fade})`}
        />
      )}
    </svg>
  );
};

export default ForkRule;
