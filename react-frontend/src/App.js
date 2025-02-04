import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import aiIcon from "./UNG_Steeple.png";

const generateUUID = () => {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c / 4)).toString(16)
  );
};

const App = () => {
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [sessionTitle, setSessionTitle] = useState(""); // Custom session title
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingPromptType, setPendingPromptType] = useState(null);
  const [pastConversations, setPastConversations] = useState([]);
  const [editingSession, setEditingSession] = useState(null); // ID of the session being edited
  const [tempTitle, setTempTitle] = useState(""); // Temporary title for editing
  const dropdownRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const storedSessionId = localStorage.getItem("sessionId");
    const storedConversations = JSON.parse(localStorage.getItem("pastConversations")) || [];
    if (storedSessionId) {
      setSessionId(storedSessionId);
      const existingConversation = storedConversations.find(
        (conv) => conv.sessionId === storedSessionId
      );
      setSessionTitle(existingConversation?.sessionTitle || storedSessionId);
    } else {
      const newSessionId = generateUUID();
      localStorage.setItem("sessionId", newSessionId);
      setSessionId(newSessionId);
      setSessionTitle(newSessionId);
    }
    setPastConversations(storedConversations);
  }, []);

  useEffect(() => {
    document.body.className = isDarkMode ? "dark-mode" : "light-mode";
  }, [isDarkMode]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleNewSession = () => {
    const newSessionId = generateUUID();
    
    // Just create a new session without saving it yet
    localStorage.setItem("sessionId", newSessionId);
    setSessionId(newSessionId);
    setSessionTitle(newSessionId);
    setChatHistory([]); // Clear the chat history
  };
  
  useEffect(() => {
    if (chatHistory.length >= 2) { // Only add when we have at least a user message + bot response
      const updatedConversations = [...pastConversations];
  
      // Check if the session is already in the list
      const existingSessionIndex = updatedConversations.findIndex(
        (conv) => conv.sessionId === sessionId
      );
  
      const previewText = chatHistory
        .slice(-2) // Get last 2 messages (user + bot)
        .map((msg) => msg.text)
        .join(" | "); // Combine them into a single preview
  
      if (existingSessionIndex !== -1) { 
        // Update existing session preview
        updatedConversations[existingSessionIndex].preview = previewText;
        updatedConversations[existingSessionIndex].chatHistory = [...chatHistory];
      } else {
        // Add new session if it doesn’t exist
        updatedConversations.unshift({
          sessionId: sessionId,
          sessionTitle: sessionTitle, 
          timestamp: new Date().toLocaleString(),
          preview: previewText, // Store user + bot messages
          chatHistory: [...chatHistory],
        });
      }
  
      // Save and update state
      localStorage.setItem("pastConversations", JSON.stringify(updatedConversations));
      setPastConversations(updatedConversations);
    }
  }, [chatHistory]); // Runs whenever chatHistory updates
  
  
  const saveEditedTitle = () => {
    if (!editingSession) return; // Ensure a session is being edited
  
    const updatedConversations = [...pastConversations];
    const existingSessionIndex = updatedConversations.findIndex(
      (conv) => conv.sessionId === editingSession
    );
  
    if (existingSessionIndex !== -1) {
      updatedConversations[existingSessionIndex].sessionTitle = tempTitle;
    } else {
      updatedConversations.unshift({
        sessionId: editingSession,
        sessionTitle: tempTitle,
        timestamp: new Date().toLocaleString(),
        preview: chatHistory.length > 0
          ? chatHistory.slice(-2).map((msg) => msg.text).join(" | ")
          : "No messages yet",
        chatHistory: [...chatHistory],
      });
    }
  
    localStorage.setItem("pastConversations", JSON.stringify(updatedConversations));
    setPastConversations(updatedConversations);
    setSessionTitle(tempTitle); 
    setEditingSession(null); 
  };
  
  

  const loadConversation = (conversation) => {
    setSessionId(conversation.sessionId);
    setSessionTitle(conversation.sessionTitle);
    setChatHistory(conversation.chatHistory);
  };

  const deleteConversation = (sessionIdToDelete) => {
    const updatedConversations = pastConversations.filter(
      (conversation) => conversation.sessionId !== sessionIdToDelete
    );
    localStorage.setItem("pastConversations", JSON.stringify(updatedConversations));
    setPastConversations(updatedConversations);
  };

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  const handlePromptSelection = (type) => {
    let botMessage;
    switch (type) {
      case "Calculate":
        botMessage = { sender: "bot", text: "Please enter your expression to calculate." };
        break;
      case "Weather":
        botMessage = { sender: "bot", text: "Please enter the name of the city for the weather forecast." };
        break;
      case "News":
        botMessage = { sender: "bot", text: "Please specify the topic you'd like to hear news about." };
        break;
      default:
        return;
    }

    setChatHistory((prev) => [...prev, botMessage]);
    setShowDropdown(false);
    setPendingPromptType(type);
    setQuery("");
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) // Clicked outside dropdown
      ) {
        setShowDropdown(false);
      }
    };
  
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const formatNewsResponse = (finalResponse) => {
    const lines = finalResponse.split("\n").filter((line) => line.startsWith("-"));
    return (
      <div className="news-container">
        {lines.map((line, index) => {
          const match = line.match(/-\s(.+?)\s\((.+?)\):\s(https?:\/\/[^\s]+)/);
          if (!match) return null;

          const [, title, date, link] = match;
          return (
            <div key={index} className="news-item">
              <a href={link} target="_blank" rel="noopener noreferrer" className="news-title">
                <strong>📌 {title}</strong>
              </a>
              <p className="news-meta">🕒 {date}</p>
            </div>
          );
        })}
      </div>
    );
  };
  

  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
  
    const userMessage = { sender: "user", text: query };
    setChatHistory((prev) => [...prev, userMessage]);
  
    let formattedQuery = query;
    if (pendingPromptType === "Calculate") {
      formattedQuery = `Calculate ${query}`;
    } else if (pendingPromptType === "Weather") {
      formattedQuery = `What's the weather like in ${query}`;
    } else if (pendingPromptType === "News") {
      formattedQuery = `Give me news about ${query}`;
    }
  
    setPendingPromptType(null);
    setQuery("");
  
    setLoading(true);
    try {
      const result = await fetch(
        `https://bmhall79.app.n8n.cloud/webhook/8164117a-290d-4e5e-9390-5cebc628b8d2?query=${encodeURIComponent(formattedQuery)}&sessionId=${sessionId}`,
        {
          method: "GET",
          mode: "cors",
        }
      );
  
      if (!result.ok) {
        throw new Error(`HTTP error! status: ${result.status}`);
      }
  
      const data = await result.json();
      let botMessage;
  
      if (pendingPromptType === "News") {
        botMessage = {
          sender: "bot",
          text: formatNewsResponse(data[0]?.finalResponse || "No news found."),
          icon: aiIcon,
        };
      } else {
        botMessage = {
          sender: "bot",
          text: data[0]?.finalResponse || "No response received.",
          icon: aiIcon,
        };
      }
  
      setChatHistory((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        sender: "bot",
        text: "An error occurred: " + error.message,
        icon: aiIcon,
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className={`app-container ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      <div className="layout-container">
        {/* Left Sidebar */}
        <div className="left-section">
          <div className="title">
            <img src={aiIcon} alt="AI Icon" className="ai-icon" />
            <h1>AI Agent</h1>
          </div>

          <button className="new-session-btn" onClick={handleNewSession}>
            New Conversation
          </button>

          <h3 className="recent-header">Recent Conversations</h3>
          <ul className="recent-conversations">
            {pastConversations.length === 0 ? (
              <p className="no-conversations">No recent conversations</p>
            ) : (
              pastConversations.map((conv) => (
                <li key={conv.sessionId} className="conversation-item">
                  {editingSession === conv.sessionId ? (
                    <>
                      <input
                        type="text"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        className="edit-session-input"
                      />
                      <button
                        className="save-btn"
                        onClick={() => saveEditedTitle()}
                      >
                        ✔️
                      </button>
                    </>
                  ) : (
                    <>
                      <div
                        className="conversation-info"
                        onClick={() => loadConversation(conv)}
                      >
                        <strong>{conv.sessionTitle}</strong>
                        <p className="conversation-preview">{conv.timestamp}</p>
                      </div>
                      <button
                        className="edit-btn"
                        onClick={() => {
                          setEditingSession(conv.sessionId);
                          setTempTitle(conv.sessionTitle);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => deleteConversation(conv.sessionId)}
                      >
                        ❌
                      </button>
                    </>
                  )}
                </li>
              ))
            )}
          </ul>

        </div>

        {/* Chat Section */}
        <div className="chat-section">
          <div className="chat-header">{sessionTitle}</div>
          <div className="chat-container" ref={chatContainerRef}>
            {chatHistory.map((message, index) => (
              <div
                key={index}
                className={`chat-message ${message.sender === "user" ? "user" : "bot"}`}
              >
                {message.sender === "bot" && (
                  <img src={aiIcon} alt="Bot Icon" className="profile-icon" />
                )}
                <div>{message.text}</div>
              </div>
            ))}
            {loading && <div className="loading">Bot is typing...</div>}
          </div>
          <form className="chat-input" onSubmit={handleSubmit}>
            <div className="dropdown" ref={dropdownRef}>
              <button
                type="button"
                className="dropdown-btn"
                onClick={() => setShowDropdown((prev) => !prev)}
              >
                +
              </button>
              {showDropdown && (
                <div className="dropdown-content">
                  <div onClick={() => handlePromptSelection("Calculate")}>Calculate</div>
                  <div onClick={() => handlePromptSelection("Weather")}>Weather</div>
                  <div onClick={() => handlePromptSelection("News")}>News</div>
                </div>
              )}
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your message..."
            />
            <button type="submit" disabled={!query.trim()}>
              Send
            </button>
          </form>
        </div>

        {/* Right Sidebar */}
        <div className="right-section">
          <h2>Customization</h2>
          <div className="toggle-container">
            <span className="mode-icon">{isDarkMode ? "🌙" : "☀️"}</span>
            <label className="switch">
              <input type="checkbox" checked={isDarkMode} onChange={toggleDarkMode} />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
