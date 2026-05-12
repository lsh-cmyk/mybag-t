"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "8자 이상", test: (pw) => pw.length >= 8 },
  { label: "영문 포함", test: (pw) => /[a-zA-Z]/.test(pw) },
  { label: "숫자 포함", test: (pw) => /[0-9]/.test(pw) },
  { label: "특수문자 포함 (!@#$% 등)", test: (pw) => /[^a-zA-Z0-9]/.test(pw) },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);

  const passedRules = PASSWORD_RULES.filter((r) => r.test(password));
  const allRulesPassed = passedRules.length === PASSWORD_RULES.length;
  const passwordMatch = password === confirmPassword;

  function validate() {
    if (!allRulesPassed) return "비밀번호 생성 규칙을 모두 충족해야 합니다.";
    if (!passwordMatch) return "비밀번호가 일치하지 않습니다.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "회원가입에 실패했습니다.");
    } else {
      router.push("/login?registered=1");
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-800">🎒 my Bag</h1>
          <p className="text-stone-500 mt-2 text-sm">새 계정 만들기</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="홍길동"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
              placeholder="hello@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwTouched(true); }}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                pwTouched && !allRulesPassed
                  ? "border-red-300 focus:ring-red-300"
                  : pwTouched && allRulesPassed
                  ? "border-green-400 focus:ring-green-300"
                  : "border-stone-300 focus:ring-stone-400"
              }`}
              placeholder="비밀번호 입력"
              required
            />
            {/* 비밀번호 규칙 체크리스트 */}
            {pwTouched && (
              <ul className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(password);
                  return (
                    <li key={rule.label} className={`flex items-center gap-1.5 text-xs ${passed ? "text-green-600" : "text-stone-400"}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${passed ? "bg-green-500 text-white" : "bg-stone-200"}`}>
                        {passed ? (
                          <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <span className="text-stone-400 text-xs leading-none">–</span>
                        )}
                      </span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
                confirmPassword.length > 0 && !passwordMatch
                  ? "border-red-300 focus:ring-red-300"
                  : confirmPassword.length > 0 && passwordMatch
                  ? "border-green-400 focus:ring-green-300"
                  : "border-stone-300 focus:ring-stone-400"
              }`}
              placeholder="비밀번호 재입력"
              required
            />
            {confirmPassword.length > 0 && (
              <p className={`text-xs mt-1 ${passwordMatch ? "text-green-600" : "text-red-500"}`}>
                {passwordMatch ? "✓ 비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다"}
              </p>
            )}
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || !allRulesPassed || !passwordMatch}
            className="w-full bg-stone-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-40 transition-colors"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500 mt-4">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-stone-800 font-medium hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
