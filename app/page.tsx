import { headers } from "next/headers"

export default async function Home() {
  const headersList = await headers()
  const host = headersList.get("host") || process.env.VERCEL_URL || "localhost:3000"
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
  const chatUrl = `${protocol}://${host}/chat`

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Welcome to Heyframe</h1>
      <p>Chat URL: {chatUrl}</p>
    </main>
  )
}

