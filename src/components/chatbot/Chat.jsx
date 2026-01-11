import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./chat.css";

const socket = io("https://chatsphere-backend-wivf.onrender.com/");

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);

  const activeConversation = conversations.find((c) => c.id === activeId);
  const activeIdRef = useRef(activeId);

  /* Mobile keyboard fix */
  useEffect(() => {
    const updateVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    updateVh();
    window.addEventListener("resize", updateVh);
    return () => window.removeEventListener("resize", updateVh);
  }, []);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  /* AI response */
  useEffect(() => {
    socket.on("ai-message-response", (response) => {
      setAiTyping(false);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeIdRef.current
            ? {
                ...c,
                messages: [
                  ...c.messages,
                  { role: "assistant", text: response },
                ],
              }
            : c
        )
      );
    });

    return () => socket.off("ai-message-response");
  }, []);

  /* Typing indicator */
  useEffect(() => {
    socket.on("ai-typing", (status) => {
      setAiTyping(status);
    });

    return () => socket.off("ai-typing");
  }, []);

  const sendMessage = () => {
    if (!input.trim()) return;

    if (!activeConversation) {
      const id = Date.now();
      const newChat = {
        id,
        title: "New Chat",
        messages: [{ role: "user", text: input }],
      };

      setConversations([newChat]);
      setActiveId(id);
      socket.emit("ai-message", { prompt: input });
      setInput("");
      return;
    }

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              messages: [...c.messages, { role: "user", text: input }],
            }
          : c
      )
    );

    socket.emit("ai-message", { prompt: input });
    setInput("");
  };

  const newConversation = () => {
    const id = Date.now();
    setConversations((prev) => [
      { id, title: "New Chat", messages: [] },
      ...prev,
    ]);
    setActiveId(id);
    setSidebarOpen(false);
  };

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <span>Chats</span>
          <button onClick={newConversation}>+</button>
        </div>

        <div className="conversation-list">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`conversation ${c.id === activeId ? "active" : ""}`}
              onClick={() => {
                setActiveId(c.id);
                setSidebarOpen(false);
              }}
            >
              {c.title}
            </div>
          ))}
        </div>
      </aside>

      <main className="chat-container">
        <div className="chat-header">
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen((p) => !p)}
          >
            ☰
          </button>
          ChatSphere
        </div>

        <div className="chat-messages">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="empty-state">Start chatting</div>
          ) : (
            <>
              {activeConversation.messages.map((m, i) => (
                <div key={i} className={`message ${m.role}`}>
                  {m.text}
                </div>
              ))}

              {aiTyping && (
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="chat-input">
          <input
            value={input}
            placeholder="Type your message..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </main>
    </div>
  );
}
