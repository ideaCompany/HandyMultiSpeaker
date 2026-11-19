// meetscribe: plain "MeetScribe" wordmark (replaces Handy's hand-lettered logo).
// Keeps the old 930×328 box so existing width/height props lay out the same.
// The word is laid out from the left at a size that fits the box at its natural width: WebKit
// gets both `textLength` and `textAnchor="middle"` wrong on a text made of several tspans,
// which pushed the last letter out of the box.
const WORD_1 = "Meet";
const WORD_2 = "Scribe";

const HandyTextLogo = ({
  width,
  height,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) => {
  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox="0 0 930 328"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="MeetScribe"
    >
      <text
        x="58"
        y="208"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
        fontSize="125"
        fontWeight="700"
      >
        {/* The brand name is not translated. */}
        <tspan className="fill-text">{WORD_1}</tspan>
        <tspan fill="#6366F1">{WORD_2}</tspan>
      </text>
    </svg>
  );
};

export default HandyTextLogo;
