import { Server as SocketIOServer } from "socket.io"
import type { NextApiRequest, NextApiResponse } from "next"

const SocketHandler = (req: NextApiRequest, res: NextApiResponse) => {
  if (!(res.socket as any).server.io) {
    console.log("Initializing Socket.IO server...")
    const io = new SocketIOServer((res.socket as any).server)
    ;(res.socket as any).server.io = io

    io.on("connection", (socket) => {
      console.log("New client connected")

      socket.on("message", (message) => {
        console.log("Message received:", message)
        io.emit("message", message)
      })

      socket.on("disconnect", () => {
        console.log("Client disconnected")
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

