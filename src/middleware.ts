export { default } from "next-auth/middleware";

export const config = {
  // 로그인/회원가입 외 모든 경로 보호
  matcher: ["/((?!login|register|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
