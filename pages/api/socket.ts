import { Server as SocketIOServer } from "socket.io"
import type { NextApiRequest } from "next"
import type { NextApiResponseServerIO } from "@/types/next"

const chatHistory: {
  id: string
  text: string
  timestamp: number
  nickname: string
  color: string
}[] = []

const activeUsers = new Map<string, { nickname: string; color: string }>()

const colors = [
  "#FF5733",
  "#33FF57",
  "#3357FF",
  "#FF33F1",
  "#33FFF1",
  "#F1FF33",
  "#FF5733",
  "#33FF57",
  "#3357FF",
  "#FF33F1",
]

const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log("Socket wird initialisiert")
    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
    })
    res.socket.server.io = io

    io.on("connection", (socket) => {
      console.log("Neuer Client verbunden:", socket.id)

      // Sofort nach Verbindung Chatverlauf senden
      socket.emit("chat_history", chatHistory)

      // Nickname-Anfrage senden
      socket.emit("request_nickname")

      socket.on("set_nickname", (nickname: string) => {
        try {
          console.log("Nickname-Anfrage erhalten:", nickname, "für Socket:", socket.id)

          if (!nickname || nickname.trim() === "") {
            socket.emit("nickname_error", "Nickname darf nicht leer sein")
            return
          }

          const color = colors[Math.floor(Math.random() * colors.length)]
          activeUsers.set(socket.id, { nickname, color })

          console.log("Nickname gesetzt:", nickname, "für Socket:", socket.id)

          // Bestätigung an den Client senden
          socket.emit("nickname_set", { nickname, color })

          // Aktive Benutzer-Count aktualisieren
          io.emit("users_count", activeUsers.size)

          console.log("Aktive Benutzer:", activeUsers.size)
        } catch (error) {
          console.error("Fehler beim Setzen des Nicknames:", error)
          socket.emit("nickname_error", "Fehler beim Setzen des Nicknames")
        }
      })

      socket.on("send_message", (msg: { id: string; text: string; timestamp: number }) => {
        try {
          const user = activeUsers.get(socket.id)
          if (!user) {
            console.log("Kein Benutzer gefunden für Socket:", socket.id)
            return
          }

          const fullMessage = {
            ...msg,
            nickname: user.nickname,
            color: user.color,
          }

          chatHistory.push(fullMessage)
          io.emit("receive_message", fullMessage)

          console.log("Nachricht gesendet:", fullMessage)
        } catch (error) {
          console.error("Fehler beim Senden der Nachricht:", error)
        }
      })

      socket.on("disconnect", () => {
        activeUsers.delete(socket.id)
        io.emit("users_count", activeUsers.size)
        console.log("Client getrennt:", socket.id)
        console.log("Aktive Benutzer:", activeUsers.size)
      })
    })
  }
  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default SocketHandler

