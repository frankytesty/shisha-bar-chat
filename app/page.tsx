import { QRCodeSVG } from "qrcode.react"
import { headers } from "next/headers"

export default async function Home() {
  const headersList = headers()
  const domain = (await headersList.get("host")) || "localhost:3000"
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
  const chatUrl = `${protocol}://${domain}/chat`

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100">
      <h1 className="text-3xl font-bold mb-8 text-center">Willkommen zum Shisha Bar Chat</h1>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <p className="mb-4 text-center">Scannen Sie den QR-Code, um dem anonymen Chat beizutreten</p>
        <QRCodeSVG value={chatUrl} size={256} className="mx-auto" />
      </div>
    </main>
  )
}

