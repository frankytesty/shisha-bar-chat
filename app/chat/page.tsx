"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import io, { type Socket } from "socket.io-client"
import { Smile } from "lucide-react"
import EmojiPicker from "emoji-picker-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    console.log("Initialisiere Socket.IO-Verbindung...")

    // Debug-Information über die aktuelle Umgebung
    const protocol = window.location.protocol
    const host = window.location.host
    console.log(`Aktuelle Umgebung: ${protocol}//${host}`)

    const socket = io({
      path: "/api/socket",
      addTrailingSlash: false,
      transports: ["polling", "websocket"],
      reconnectionAttempts: 3,
      timeout: 10000,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      console.log("Verbunden mit Socket.ID:", socket.id)
      setIsConnected(true)
      toast.success("Mit dem Chat-Server verbunden")
    })

    socket.on("connect_error", (error) => {
      console.error("Verbindungsfehler:", error)
      console.log("Fehlerdetails:", {
        message: error.message,
        description: error.description,
        context: error.context,
      })
      setIsConnected(false)
      toast.error(`Verbindungsfehler: ${error.message}`)
    })

    socket.on("connect_timeout", () => {
      console.error("Verbindungs-Timeout")
      setIsConnected(false)
      toast.error("Verbindungs-Timeout - Server nicht erreichbar")
    })

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Verbindungsversuch ${attemptNumber} von 3`)
      toast.info(`Verbindungsversuch ${attemptNumber} von 3`)
    })

    socket.on("reconnect_failed", () => {
      console.error("Alle Verbindungsversuche fehlgeschlagen")
      toast.error("Verbindung konnte nicht hergestellt werden")
    })

    socket.on("disconnect", () => {
      setIsConnected(false)
      toast.warn("Vom Chat-Server getrennt")
    })

    socket.on("request_nickname", () => {
      setShowNicknameModal(true)
    })

    socket.on("nickname_set", ({ nickname, color }) => {
      setNickname(nickname)
      setUserColor(color)
      setShowNicknameModal(false)
      setIsSubmitting(false)
      setNicknameError("")
      toast.success(`Willkommen, ${nickname}!`)
    })

    socket.on("chat_history", (history: Message[]) => {
      setMessages(history)
    })

    socket.on("receive_message", (msg: Message) => {
      setMessages((prev) => [...prev, msg])
    })

    socket.on("users_count", (count: number) => {
      setOnlineUsers(count)
    })

    socket.on("typing_update", (users: string[]) => {
      setTypingUsers(users)
    })

    return () => {
      console.log("Trenne Socket.IO-Verbindung...")
      socket.disconnect()
    }
  }, [])

  const handleSetNickname = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!tempNickname.trim()) {
        setNicknameError("Bitte geben Sie einen Spitznamen ein")
        return
      }

      if (!socketRef.current?.connected) {
        setNicknameError("Keine Verbindung zum Server")
        return
      }

      setIsSubmitting(true)
      setNicknameError("")

      socketRef.current.emit("set_nickname", tempNickname, (response: { success: boolean; error?: string }) => {
        if (!response.success) {
          setNicknameError(response.error || "Fehler beim Setzen des Spitznamens")
          setIsSubmitting(false)
        }
      })
    },
    [tempNickname],
  )

  const sendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!inputMessage.trim() || !socketRef.current?.connected || !nickname) {
        return
      }

      const message = {
        id: Math.random().toString(36).substr(2, 9),
        text: inputMessage.trim(),
        timestamp: Date.now(),
      }

      socketRef.current.emit("send_message", message, (ack: boolean) => {
        if (!ack) {
          toast.error("Nachricht konnte nicht gesendet werden")
        }
      })

      setInputMessage("")
      setShowEmojiPicker(false)
    },
    [inputMessage, nickname],
  )

  const handleEmojiClick = (emojiObject: any) => {
    setInputMessage((prevInput) => prevInput + emojiObject.emoji)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value)

    if (socketRef.current?.connected) {
      socketRef.current.emit("typing_start")

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit("typing_end")
        }
      }, 1000)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-900 via-indigo-800 to-blue-900">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {showNicknameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Wählen Sie Ihren Spitznamen</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSetNickname}>
                <Input
                  type="text"
                  value={tempNickname}
                  onChange={(e) => {
                    setTempNickname(e.target.value)
                    setNicknameError("")
                  }}
                  className={`mb-2 ${nicknameError ? "border-red-500" : ""}`}
                  placeholder="Ihr Spitzname"
                  disabled={isSubmitting}
                  autoFocus
                />
                {nicknameError && <p className="text-red-500 text-sm mb-2">{nicknameError}</p>}
                <Button type="submit" className="w-full" disabled={isSubmitting || !tempNickname.trim()}>
                  {isSubmitting ? "Wird gespeichert..." : "Bestätigen"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="bg-black bg-opacity-50 text-white p-4 shadow-md">
        <h1 className="text-3xl font-bold text-center mb-2">Heyframe</h1>
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400" : "bg-red-400"}`}></span>
          <p>{isConnected ? "Verbunden" : "Getrennt"}</p>
          <span>•</span>
          <p>
            {onlineUsers} {onlineUsers === 1 ? "Person" : "Personen"} online
          </p>
          {nickname && (
            <>
              <span>•</span>
              <p>
                Sie sind: <span style={{ color: userColor }}>{nickname}</span>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-white bg-opacity-10 rounded-lg shadow-md p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold" style={{ color: msg.color }}>
                  {msg.nickname}
                </span>
                <span className="text-xs text-gray-300">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-white">{msg.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {typingUsers.length > 0 && (
        <div className="bg-black bg-opacity-50 text-white p-2 text-sm">
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "tippt" : "tippen"}...
        </div>
      )}

      <form onSubmit={sendMessage} className="p-4 bg-black bg-opacity-50">
        <div className="max-w-3xl mx-auto flex gap-2 relative">
          <Input
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            placeholder="Geben Sie Ihre Nachricht ein..."
            className="flex-1 bg-white bg-opacity-20 text-white placeholder-gray-400"
            disabled={!isConnected || !nickname}
          />
          <Button type="button" variant="outline" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            <Smile className="h-4 w-4" />
          </Button>
          <Button type="submit" disabled={!isConnected || !nickname || !inputMessage.trim()}>
            Senden
          </Button>
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2">
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

