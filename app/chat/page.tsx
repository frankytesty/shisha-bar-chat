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
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const connectionAttemptsRef = useRef(0)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const initializeSocket = () => {
      if (socketRef.current?.connected) {
        console.log("Socket already connected")
        return
      }

      console.log("Initializing socket connection...")
      const socket = io({
        path: "/api/socket",
        addTrailingSlash: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        transports: ["websocket", "polling"],
      })

      socketRef.current = socket

      socket.on("connect", () => {
        console.log("Connected to server")
        setIsConnected(true)
        connectionAttemptsRef.current = 0
        toast.success("Connected to chat server")
      })

      socket.on("connect_error", (error) => {
        console.error("Connection error:", error)
        connectionAttemptsRef.current++
        setIsConnected(false)

        if (connectionAttemptsRef.current <= 3) {
          toast.error(`Connection failed (Attempt ${connectionAttemptsRef.current}/3). Retrying...`)
          setTimeout(() => {
            console.log("Attempting to reconnect...")
            socket.connect()
          }, 2000)
        } else {
          toast.error("Could not connect to server. Please refresh the page.")
        }
      })

      socket.on("disconnect", (reason) => {
        console.log("Disconnected:", reason)
        setIsConnected(false)
        toast.warning("Disconnected from server")
      })

      socket.on("request_nickname", () => {
        console.log("Nickname requested")
        setShowNicknameModal(true)
      })

      socket.on("nickname_set", ({ nickname, color }) => {
        setNickname(nickname)
        setUserColor(color)
        setShowNicknameModal(false)
        setIsSubmitting(false)
        setNicknameError("")
        toast.success(`Welcome, ${nickname}!`)
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

      return socket
    }

    const socket = initializeSocket()

    return () => {
      if (socket) {
        console.log("Cleaning up socket connection")
        socket.disconnect()
      }
    }
  }, [])

  const handleSetNickname = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!tempNickname.trim()) {
        setNicknameError("Please enter a nickname")
        return
      }

      if (!socketRef.current?.connected) {
        setNicknameError("No connection to server")
        return
      }

      setIsSubmitting(true)
      setNicknameError("")

      socketRef.current.emit("set_nickname", tempNickname, (response: { success: boolean; error?: string }) => {
        if (!response.success) {
          setNicknameError(response.error || "Error setting nickname")
          setIsSubmitting(false)
          toast.error(response.error || "Failed to set nickname")
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
          toast.error("Failed to send message")
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
              <CardTitle>Choose your nickname</CardTitle>
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
                  placeholder="Your nickname"
                  disabled={isSubmitting}
                  autoFocus
                />
                {nicknameError && <p className="text-red-500 text-sm mb-2">{nicknameError}</p>}
                <Button type="submit" className="w-full" disabled={isSubmitting || !tempNickname.trim()}>
                  {isSubmitting ? "Saving..." : "Confirm"}
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
          <p>{isConnected ? "Connected" : "Disconnected"}</p>
          <span>•</span>
          <p>
            {onlineUsers} {onlineUsers === 1 ? "person" : "people"} online
          </p>
          {nickname && (
            <>
              <span>•</span>
              <p>
                You are: <span style={{ color: userColor }}>{nickname}</span>
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

      <form onSubmit={sendMessage} className="p-4 bg-black bg-opacity-50">
        <div className="max-w-3xl mx-auto flex gap-2 relative">
          <Input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-white bg-opacity-20 text-white placeholder-gray-400"
            disabled={!isConnected || !nickname}
          />
          <Button type="button" variant="outline" size="icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
            <Smile className="h-4 w-4" />
          </Button>
          <Button type="submit" disabled={!isConnected || !nickname || !inputMessage.trim()}>
            Send
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

