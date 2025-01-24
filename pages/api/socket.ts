import { Server as SocketIOServer } from "socket.io"
import type { NextApiRequest } from "next"
import type { NextApiResponseServerIO } from "@/types/next"

type Message = {
  id: string
  text: string
  timestamp: number
  nickname: string
  color: string
}

const chatHistory: Message[] = []
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

const SocketHandler = async (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (!res.socket.server.io) {
    console.log("Initializing Socket")
    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      pingTimeout: 120000,
      pingInterval: 30000,
      cors: {
        origin: "*",
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      allowEIO3: true,
    })
    res.socket.server.io = io

    io.on("connection", (socket) => {
      console.log("New client connected:", socket.id)

      socket.emit("chat_history", chatHistory)
      socket.emit("request_nickname")

      socket.on("set_nickname", (nickname: string, callback) => {
        try {
          console.log("Nickname request received:", nickname, "for Socket:", socket.id)

          if (!nickname || nickname.trim() === "") {
            console.log("Empty nickname received")
            callback({ success: false, error: "Nickname cannot be empty" })
            return
          }

          const isNicknameTaken = Array.from(activeUsers.values()).some((user) => user.nickname === nickname)

          if (isNicknameTaken) {
            console.log("Nickname already taken:", nickname)
            callback({ success: false, error: "This nickname is already taken" })
            return
          }

          const color = colors[Math.floor(Math.random() * colors.length)]
          activeUsers.set(socket.id, { nickname, color })

          console.log("Nickname set:", nickname, "for Socket:", socket.id)

          socket.emit("nickname_set", { nickname, color })
          io.emit("users_count", activeUsers.size)
          socket.emit("chat_history", chatHistory)

          callback({ success: true })

          console.log("Active users:", activeUsers.size)
        } catch (error) {
          console.error("Error setting nickname:", error)
          callback({ success: false, error: "Error setting nickname" })
        }
      })

      socket.on("send_message", (msg: { id: string; text: string; timestamp: number }, callback) => {
        try {
          const user = activeUsers.get(socket.id)
          if (!user) {
            console.log("No user found for Socket:", socket.id)
            callback(false)
            return
          }

          const fullMessage = {
            ...msg,
            nickname: user.nickname,
            color: user.color,
          }

          chatHistory.push(fullMessage)
          console.log("Message sent to all clients:", fullMessage)
          io.emit("receive_message", fullMessage)
          callback(true)
        } catch (error) {
          console.error("Error sending message:", error)
          callback(false)
        }
      })

      socket.on("disconnect", () => {
        activeUsers.delete(socket.id)
        io.emit("users_count", activeUsers.size)
        console.log("Client disconnected:", socket.id)
        console.log("Active users:", activeUsers.size)
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

