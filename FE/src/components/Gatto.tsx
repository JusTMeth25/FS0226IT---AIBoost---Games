type Props = {
  color?: string;
  className?: string;
  variant?: "sleepy" | "happy" | "cool";
};
export default function Gatto({
  color = "#cb9370",
  className = "",
  variant = "happy",
}: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21 41 16 12 42 27Q51 24 60 28L85 13 80 43Q92 74 66 85Q35 96 18 74Q8 56 21 41Z"
        fill={color}
      />
      <path d="m24 34-3-14 15 11m30 0 13-11-3 17" fill="#f5bcaa" />
      {variant === "cool" ? (
        <>
          <path
            d="M26 47h22v9Q35 67 27 56Zm27 0h23l-1 10Q62 67 54 56Z"
            fill="#293d35"
          />
          <path d="M47 50h8" stroke="#293d35" strokeWidth="4" />
        </>
      ) : variant === "sleepy" ? (
        <path
          d="m29 53 10 3 7-4m11 0 9 4 9-4"
          stroke="#3c322d"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : (
        <>
          <ellipse cx="37" cy="52" rx="3.5" ry="5" fill="#3c322d" />
          <ellipse cx="65" cy="52" rx="3.5" ry="5" fill="#3c322d" />
        </>
      )}
      <path d="m46 63 10 0-5 5Z" fill="#774d47" />
      <path
        d="M51 68q-5 8-10 1m10-1q5 8 10 1M25 63l-16-3m17 9-17 4m67-10 15-3m-16 9 17 4"
        stroke="#6c5145"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="m43 28 3 9m6-10 1 8m8-6-3 9"
        stroke="#00000018"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
