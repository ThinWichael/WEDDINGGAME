interface VoteStampProps {
  label?: string;
}

/**
 * 投票蓋章效果：覆蓋在按鈕上，橘色、斜斜的、看起來像蓋印章。
 * 父元素需要 `relative` 才會定位正確。
 */
export function VoteStamp({ label = "已投" }: VoteStampProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <div
        className="rounded-md border-[3px] border-orange-500 bg-orange-500/5 px-4 py-1 text-lg font-extrabold tracking-widest text-orange-500"
        style={{
          transform: "rotate(-14deg)",
          textShadow: "0 0 1px rgba(234, 88, 12, 0.35)",
          boxShadow: "inset 0 0 0 1px rgba(234, 88, 12, 0.2)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
