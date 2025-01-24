import { headers } from "next/headers"

export default async function Home() {
  const headersList = headers()
  const domain = headersList.get("host") || "localhost:3000"
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
  const chatUrl = `${protocol}://${domain}/chat`

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Welcome to Heyframe</h1>
      <p>Chat URL: {chatUrl}</p>
    </main>
  )
}

