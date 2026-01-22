import { AuthView } from "@neondatabase/auth/react"

export function generateStaticParams() {
  return [
    { path: "sign-in" },
    { path: "sign-up" },
    { path: "forgot-password" },
    { path: "reset-password" },
    { path: "verify-email" },
  ]
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>
}) {
  const { path } = await params
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <AuthView path={path} />
      </div>
    </main>
  )
}
