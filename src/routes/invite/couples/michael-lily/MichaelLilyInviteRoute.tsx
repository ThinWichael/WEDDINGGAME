import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import confetti from "canvas-confetti";
import { Volume2, VolumeX } from "lucide-react";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";
import { registerGuest } from "@/lib/api";

import logoImg from "@/assets/couples/michael-lily/logo.webp";
import xiSymbol from "@/assets/couples/michael-lily/xi-symbol.webp";
import dateSection from "@/assets/couples/michael-lily/date-section.webp";
import watermarkSunburst from "@/assets/couples/michael-lily/watermark-sunburst.webp";
import among1 from "@/assets/couples/michael-lily/among-1.jpg";
import among2 from "@/assets/couples/michael-lily/among-2.jpg";
import among3 from "@/assets/couples/michael-lily/among-3.jpg";
import among4 from "@/assets/couples/michael-lily/among-4.jpg";

const styles = {
  section: "w-full max-w-2xl mx-auto px-6 py-8",
  label: "text-base md:text-lg font-medium mb-1 tracking-wide",
  input:
    "w-full rounded-lg border-2 border-[#c9a96e]/40 bg-white/15 backdrop-blur-sm px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:bg-white/25 focus:border-[#c9a96e] transition",
  select:
    "w-full rounded-lg border-2 border-[#c9a96e]/40 bg-white/15 backdrop-blur-sm px-4 py-3 text-white focus:outline-none focus:bg-white/25 focus:border-[#c9a96e] transition appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10 [&>option]:text-[#6a4410]",
  hint: "text-xs text-white/70 mt-1",
  submitBtn:
    "w-full py-4 rounded-lg bg-[#c9a96e] text-white font-bold text-lg tracking-widest hover:bg-[#b8944f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
} as const;

export default function MichaelLilyInviteRoute() {
  const { roomId } = useParams<{ roomId: string }>();

  const parallaxRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const xiRef = useRef<HTMLImageElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [xiVisible, setXiVisible] = useState(false);

  const fadeRef1 = useScrollFadeIn();
  const fadeRef2 = useScrollFadeIn();
  const fadeRef3 = useScrollFadeIn();
  const fadeRef4 = useScrollFadeIn();
  const fadeRef5 = useScrollFadeIn();

  useEffect(() => {
    const el = xiRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setXiVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const tryPlay = () => {
      audio.play().then(cleanup).catch(() => {});
    };

    const gestures = ["touchstart", "click", "scroll", "keydown"] as const;
    const onGesture = () => tryPlay();
    const cleanup = () => {
      gestures.forEach((e) => document.removeEventListener(e, onGesture));
    };

    tryPlay();
    gestures.forEach((e) =>
      document.addEventListener(e, onGesture, { once: true, passive: true })
    );

    return cleanup;
  }, []);

  const toggleSound = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.play().catch(() => {});
      setIsMuted(false);
    } else {
      audio.pause();
      setIsMuted(true);
    }
  }, [isMuted]);

  useEffect(() => {
    const handleScroll = () => {
      if (!parallaxRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowH = window.innerHeight;
      const progress = (windowH - rect.top) / (windowH + rect.height);
      const offset = (progress - 0.5) * 80;
      parallaxRef.current.style.transform = `translate3d(0, ${offset}px, 0) scale(1.2)`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [form, setForm] = useState({
    nickname: "",
    email: "",
    marryStatus: "",
    ceremony: "",
    afterParty: "",
    vegetarian: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const fireConfetti = () => {
    const gold = ["#c9a96e", "#e8d5a3", "#b8944f", "#d4af37", "#f5e6c8"];
    const end = Date.now() + 2500;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: gold,
        shapes: ["square"],
        ticks: 200,
        gravity: 0.8,
        scalar: 1.2,
        drift: 0.5,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: gold,
        shapes: ["square"],
        ticks: 200,
        gravity: 0.8,
        scalar: 1.2,
        drift: -0.5,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return;
    setError(null);
    setSubmitting(true);
    try {
      await registerGuest({
        roomId,
        name: form.nickname.trim(),
        email: form.email.trim(),
        maritalStatus: form.marryStatus.trim(),
        joinCeremony: form.ceremony === "是",
        joinAfterParty: form.afterParty === "是",
        vegetarian: form.vegetarian === "是",
        message: form.message.trim(),
      });
      setSubmitted(true);
      fireConfetti();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  if (!roomId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p>連結錯誤，請使用邀請函中的完整網址。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#c9a96e] font-serif">
      <audio
        ref={audioRef}
        src="/couples/michael-lily/audio/bgm.mp3"
        loop
        preload="auto"
      />

      <button
        onClick={toggleSound}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#c9a96e]/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-[#c9a96e] transition-all duration-300 animate-[pulse_2s_ease-in-out_3]"
        aria-label={isMuted ? "開啟音樂" : "關閉音樂"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>

      <div
        style={{
          background:
            "linear-gradient(to bottom, #c8e4fb 0%, #c8e4fb 30%, #f0ddb0 85%, #f0ddb0 100%)",
        }}
      >
        {/* Section 1: Logo */}
        <section className="flex justify-center pt-16 pb-8 px-2 md:px-6">
          <img
            src={logoImg}
            alt="豪華的婚禮"
            className="w-full max-w-2xl translate-x-[3%]"
            fetchPriority="high"
            decoding="async"
          />
        </section>

        {/* Section 2: 前言 */}
        <section
          ref={fadeRef1 as React.RefObject<HTMLElement>}
          className={styles.section + " relative"}
        >
          <div className="text-center space-y-6 text-sm md:text-sm leading-relaxed tracking-wide text-[#c8962a]">
            <p>
              有人把婚姻當作一場交易；
              <br />
              有人把婚姻當作一種幸運。
            </p>
            <p>
              Michael 說，結婚，是一個傳奇篇章的開始。
              <br />
              但對我來說，它是盤最難落子的棋。
            </p>
            <p>
              所以，我們辦了一場「豪華的婚禮」
              <br />
              和最親愛的你們一起聊聊
            </p>
            <p className="text-sm md:text-base font-semibold">
              我們是真想婚了，還是真的昏了！
            </p>
            <p>
              期待這一天，也能讓你對「婚」這件事，
              <br />
              有一個更靠近自己的答案。
            </p>

            <div className="flex justify-center py-6">
              <img
                ref={xiRef}
                src={xiSymbol}
                alt="囍"
                className={`w-28 md:w-36 ${
                  xiVisible ? "animate-gentle-bob" : "opacity-0"
                }`}
              />
            </div>

            <div className="inline-grid grid-cols-[auto_auto_auto] gap-x-4 gap-y-1 text-sm tracking-wider text-[#c8962a]">
              <span className="text-right">新郎</span>
              <span>金觀豪</span>
              <span className="text-left">Michael Chin.</span>
              <span className="text-right">新娘</span>
              <span>鄭立華</span>
              <span className="text-left">Lily Cheng.</span>
            </div>
            <p className="text-sm tracking-widest text-[#c8962a]">敬邀</p>
          </div>
        </section>

        {/* Section 2.5: 日期時間 */}
        <section
          ref={fadeRef2 as React.RefObject<HTMLElement>}
          className={styles.section + " mt-32"}
        >
          <img
            src={dateSection}
            alt="2026.4.25 16:00-24:00"
            className="w-full max-w-lg mx-auto"
            style={{
              filter: "sepia(1) saturate(2) brightness(0.75) hue-rotate(-5deg)",
            }}
          />
        </section>
      </div>

      <div
        style={{
          background:
            "linear-gradient(to bottom, #f0ddb0 0%, #e03c00 40%, #e03c00 100%)",
        }}
      >
        {/* Section 3: 婚禮資訊 */}
        <section
          ref={fadeRef3 as React.RefObject<HTMLElement>}
          className={styles.section}
        >
          <div className="text-center space-y-4 text-white">
            <div
              ref={containerRef}
              className="mt-2 relative h-72 md:h-96 overflow-hidden rounded-xl"
            >
              <div
                ref={parallaxRef}
                className="absolute inset-[-20%] bg-cover bg-center will-change-transform"
                style={{ backgroundImage: `url(${among4})` }}
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative z-10 flex flex-col items-center justify-center h-full space-y-2 text-white px-4">
                <p className="font-semibold text-sm md:text-base">
                  阿夢 Among café bistro &nbsp;&nbsp;私人沙龍
                </p>
                <p className="text-xs md:text-sm">
                  100 臺北市中正區寧波西街 155 號、214 號
                </p>
                <p className="text-xs text-white/70">
                  建議坐到捷運中正紀念堂站，搭乘計程車前往。
                </p>
              </div>
            </div>
            <div className="-mt-1 grid grid-cols-3 gap-2">
              {[among1, among2, among3].map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`阿夢 Among ${i + 1}`}
                  className="w-full rounded-xl"
                />
              ))}
            </div>
            <div className="pt-6">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d903.6!2d121.5142!3d25.0302!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3442a9827b6ec3a1%3A0x1d3db9cf9a5fc8ae!2z6Zi_5aKi!5e0!3m2!1szh-TW!2stw!4v1700000000000"
                className="w-full h-48 md:h-64 rounded-xl border-2 border-[#c9a96e]/30"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="阿夢 Among 地圖"
              />
              <a
                href="https://maps.google.com/?q=台北市中正區寧波西街155號"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs md:text-sm underline underline-offset-4 hover:opacity-70 transition"
              >
                在 Google Maps 中開啟 →
              </a>
            </div>
          </div>
        </section>

        {/* Section 4: Agenda */}
        <section
          ref={fadeRef4 as React.RefObject<HTMLElement>}
          className={styles.section + " relative overflow-hidden"}
        >
          <img
            src={watermarkSunburst}
            alt=""
            className="absolute right-6 top-1/2 -translate-y-1/2 w-32 md:w-44 opacity-20 pointer-events-none select-none"
          />
          <div className="text-center space-y-4 text-white relative z-10">
            <h2 className="text-xl md:text-2xl font-bold tracking-widest mb-6">
              Agenda
            </h2>
            <div className="space-y-1.5 text-sm md:text-base">
              <div className="flex justify-center gap-4">
                <span className="font-medium w-[130px] text-right">
                  16:30 – 18:00
                </span>
                <span className="w-[160px] text-left">報到、證婚儀式</span>
              </div>
              <div className="flex justify-center gap-4">
                <span className="font-medium w-[130px] text-right">
                  18:00 – 20:30
                </span>
                <span className="w-[160px] text-left">晚餐</span>
              </div>
              <div className="flex justify-center gap-4">
                <span className="font-medium w-[130px] text-right">
                  20:30 – 23:30
                </span>
                <span className="w-[160px] text-left whitespace-nowrap">
                  After Party（自由參加）
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: 注意事項 */}
        <section
          ref={fadeRef5 as React.RefObject<HTMLElement>}
          className={styles.section + " relative overflow-hidden"}
        >
          <img
            src={watermarkSunburst}
            alt=""
            className="absolute left-6 top-1/2 -translate-y-1/2 w-32 md:w-44 opacity-20 pointer-events-none select-none"
          />
          <div className="p-6 md:p-8 space-y-4 relative z-10">
            <h2 className="text-center text-xl md:text-2xl font-bold tracking-widest mb-4 text-white">
              注意事項
            </h2>
            <div className="space-y-5 text-sm md:text-base leading-snug text-white text-center">
              <p>
                ＊ 場地有限，且要聊尷尬的婚姻話題，
                <br />
                暫不開放攜伴，來暢所欲言吧！
              </p>
              <p>
                ＊ 場地階梯陡，短裙高跟鞋較難行走，
                <br />
                建議輕鬆穿著。
              </p>
              <p>
                ＊ 現場供酒，<br className="md:hidden" />
                想一起大喝的不要開車唷！
              </p>
              <p>
                ＊ 不收禮金，<br className="md:hidden" />
                現場收「活動報名費」888 元。
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: 你的資訊 - Form */}
        <section className={styles.section + " pb-20 relative overflow-hidden"}>
          <div className="p-6 md:p-8 text-white relative z-10">
            {!submitted && (
              <h2 className="text-center text-xl md:text-2xl font-bold tracking-widest mb-6">
                你的資訊
              </h2>
            )}

            {submitted ? (
              <div className="text-center space-y-4 py-8">
                <img src={xiSymbol} alt="囍" className="w-16 mx-auto" />
                <p className="text-lg font-bold">感謝你的回覆！</p>
                <p className="text-sm">我們婚禮現場見 💍</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className={styles.label}>暱稱</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={form.nickname}
                    onChange={(e) => handleChange("nickname", e.target.value)}
                    required
                    disabled={submitting}
                  />
                  <p className={styles.hint}>你在婚禮現場要用的</p>
                </div>

                <div>
                  <label className={styles.label}>Email（強烈建議填寫）</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="換裝置時用這個登入回來"
                    disabled={submitting}
                  />
                  <p className={styles.hint}>
                    如果換手機或清除瀏覽器資料，有 email 才能找回原本的身份
                  </p>
                </div>

                <div>
                  <label className={styles.label}>婚的狀態</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={form.marryStatus}
                    onChange={(e) =>
                      handleChange("marryStatus", e.target.value)
                    }
                    required
                    disabled={submitting}
                  />
                  <p className={styles.hint}>
                    e.g. 閃婚、想婚到昏、不婚、恐婚、？婚、未婚、已婚……，自由發揮，我們會幫你做稱號牌
                  </p>
                </div>

                <div>
                  <label className={styles.label}>要參加證婚儀式嗎？</label>
                  <select
                    className={styles.select}
                    value={form.ceremony}
                    onChange={(e) => handleChange("ceremony", e.target.value)}
                    required
                    disabled={submitting}
                  >
                    <option value="" disabled>
                      請選擇
                    </option>
                    <option value="是">是</option>
                    <option value="否">否</option>
                  </select>
                </div>

                <div>
                  <label className={styles.label}>要參加 After Party 嗎？</label>
                  <select
                    className={styles.select}
                    value={form.afterParty}
                    onChange={(e) => handleChange("afterParty", e.target.value)}
                    required
                    disabled={submitting}
                  >
                    <option value="" disabled>
                      請選擇
                    </option>
                    <option value="是">是</option>
                    <option value="否">否</option>
                  </select>
                </div>

                <div>
                  <label className={styles.label}>吃素嗎？</label>
                  <select
                    className={styles.select}
                    value={form.vegetarian}
                    onChange={(e) => handleChange("vegetarian", e.target.value)}
                    required
                    disabled={submitting}
                  >
                    <option value="" disabled>
                      請選擇
                    </option>
                    <option value="是">是</option>
                    <option value="否">否</option>
                  </select>
                </div>

                <div>
                  <label className={styles.label}>想說的話？</label>
                  <textarea
                    className={styles.input + " min-h-[100px] resize-none"}
                    value={form.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    disabled={submitting}
                  />
                </div>

                {error && (
                  <p className="text-center text-sm text-white bg-red-500/60 rounded-lg py-2 px-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? "送出中…" : "送出"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
