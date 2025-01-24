"use client"

import { useState, useEffect, useRef } from "react"
import io, { type Socket } from "socket.io-client"

type Message = {
  id: string
  text: string
  timestamp: number
  nickname: string
  color: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(0)
  const [nickname, setNickname] = useState("")
  const [userColor, setUserColor] = useState("")
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [tempNickname, setTempNickname] = useState("")
  const [nicknameError, setNicknameError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    let socket: Socket

    const connectSocket = async () => {
      try {
        socket = io({
          path: "/api/socket",
          addTrailingSlash: false,
        })

        socketRef.current = socket

        socket.on("connect", () => {
          console.log("Mit Chat verbunden")
          setIsConnected(true)
        })

        socket.on("connect_error", (error) => {
          console.error("Verbindungsfehler:", error)
          setIsConnected(false)
        })

        socket.on("disconnect", () => {
          console.log("Vom Chat getrennt")
          setIsConnected(false)
        })

        socket.on("request_nickname", () => {
          console.log("Nickname wird angefordert")
          setShowNicknameModal(true)
        })

        socket.on("nickname_set", ({ nickname, color }) => {
          console.log("Nickname wurde gesetzt:", nickname)
          setNickname(nickname)
          setUserColor(color)
          setShowNicknameModal(false)
          setIsSubmitting(false)
          setNicknameError("")
        })

        socket.on("nickname_error", (error: string) => {
          console.error("Nickname-Fehler:", error)
          setNicknameError(error)
          setIsSubmitting(false)
        })

        socket.on("chat_history", (history: Message[]) => {
          console.log("Chatverlauf erhalten:", history)
          setMessages(history)
        })

        socket.on("receive_message", (msg: Message) => {
          console.log("Neue Nachricht erhalten:", msg)
          setMessages((prev) => [...prev, msg])
        })

        socket.on("users_count", (count: number) => {
          console.log("Aktive Benutzer:", count)
          setOnlineUsers(count)
        })
      } catch (error) {
        console.error("Fehler beim Verbindungsaufbau:", error)
        setIsConnected(false)
      }
    }

    connectSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  const handleSetNickname = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tempNickname.trim()) {
      setNicknameError("Bitte gib einen Nicknamen ein")
      return
    }

    if (socketRef.current) {
      setIsSubmitting(true)
      setNicknameError("")
      console.log("Sende Nickname:", tempNickname)
      socketRef.current.emit("set_nickname", tempNickname)
    } else {
      setNicknameError("Keine Verbindung zum Server")
      setIsSubmitting(false)
    }
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim() && socketRef.current && nickname) {
      const message = {
        id: Math.random().toString(36).substr(2, 9),
        text: inputMessage.trim(),
        timestamp: Date.now(),
      }
      socketRef.current.emit("send_message", message)
      setInputMessage("")
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {showNicknameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Wähle deinen Nicknamen</h2>
            <form onSubmit={handleSetNickname}>
              <input
                type="text"
                value={tempNickname}
                onChange={(e) => {
                  setTempNickname(e.target.value)
                  setNicknameError("")
                }}
                className={`w-full px-4 py-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  nicknameError ? "border-red-500" : ""
                }`}
                placeholder="Dein Nickname"
                disabled={isSubmitting}
                autoFocus
              />
              {nicknameError && <p className="text-red-500 text-sm mb-2">{nicknameError}</p>}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || !tempNickname.trim()}
              >
                {isSubmitting ? "Wird gespeichert..." : "Bestätigen"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">Shisha Bar Chat</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}></span>
          <p>{isConnected ? "Verbunden" : "Nicht verbunden"}</p>
          <span className="mx-2">•</span>
          <p>
            {onlineUsers} {onlineUsers === 1 ? "Person" : "Personen"} online
          </p>
          {nickname && (
            <>
              <span className="mx-2">•</span>
              <p>
                Du bist: <span style={{ color: userColor }}>{nickname}</span>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold" style={{ color: msg.color }}>
                  {msg.nickname}
                </span>
                <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-gray-800">{msg.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-white border-t">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Nachricht eingeben..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected || !nickname}
          />
          <button
            type="submit"
            disabled={!isConnected || !nickname || !inputMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            Senden
          </button>
        </div>
      </form>
    </div>
  )
}

