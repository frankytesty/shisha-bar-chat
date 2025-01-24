"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import io, { type Socket } from "socket.io-client"
import { Smile } from 'lucide-react'
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
  const [isReconnecting, setIsReconnecting] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const retryCountRef = useRef(0)
  const reconnectAttemptsRef = useRef(0)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleReconnect = useCallback(() => {
    if (socketRef.current) {
      console.log("Manually attempting to reconnect...")
      socketRef.current.connect()
    }
  }, [])

  useEffect(() => {
    let socket: Socket

    const connectSocket = () => {
      console.log("Attempting to connect to socket...")
      socket = io({
        path: "/api/socket",
        addTrailingSlash: false,
        timeout: 45000,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        transports: ['websocket', 'polling'],
        upgrade: true,
        forceNew: true,
        withCredentials: true,
        autoConnect: true
      })

      socketRef.current = socket

      socket.on("connect", () => {
        console.log("Connected to Heyframe")
        setIsConnected(true)
        setIsReconnecting(false)
        reconnectAttemptsRef.current = 0
        toast.success("Connected to chat server")
      })

      socket.on("connect_error", (error) => {
        console.error("Connection error:", error)
        setIsConnected(false)
        setNicknameError("Connection error - Please try again")
        setIsSubmitting(false)
        toast.error("Failed to connect to chat server")
      })

      socket.on("disconnect", (reason) => {
        console.log("Disconnected from Heyframe:", reason)
        setIsConnected(false)
        setIsReconnecting(true)
        toast.warn("Disconnected from chat server - Attempting to reconnect...")
        
        if (reason === "io server disconnect") {
          socket.connect()
        }
      })

      socket.on("error", (error) => {
        console.error("Socket error:", error)
        setNicknameError("An error occurred")
        setIsSubmitting(false)
        toast.error("An error occurred with the chat connection")
      })

      socket.on("reconnect", (attemptNumber) => {
        console.log("Reconnected after", attemptNumber, "attempts")
        setIsReconnecting(false)
        toast.success("Reconnected to chat server")
      })

      socket.on("reconnect_attempt", (attemptNumber) => {
        console.log("Attempting to reconnect:", attemptNumber)
        setIsReconnecting(true)
        reconnectAttemptsRef.current = attemptNumber
        if (attemptNumber > 1) {
          toast.info(`Reconnection attempt ${attemptNumber}...`)
        }
      })

      socket.on("reconnect_error", (error) => {
        console.error("Reconnection error:", error)
        toast.error("Failed to reconnect - Retrying...")
      })

      socket.on("reconnect_failed", () => {
        console.error("Failed to reconnect")
        setIsReconnecting(false)
        toast.error("Failed to reconnect to chat server")
      })

      socket.on("ping", (callback) => {
        callback()
      })

      socket.on("request_nickname", () => {
        
