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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingPromptType, setPendingPromptType] = useState(null);
  const dropdownRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    const storedSessionId = localStorage.getItem("sessionId");
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = generateUUID();
      localStorage.setItem("sessionId", newSessionId);
      setSessionId(newSessionId);
    }
  }, []);

  useEffect(() => {
    document.body.className = isDarkMode ? "dark-mode" : "light-mode";
  }, [isDarkMode]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Auto-scroll to bottom when chatHistory updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleNewSession = () => {
    localStorage.removeItem("sessionId");
    const newSessionId = generateUUID();
    localStorage.setItem("sessionId", newSessionId);
    setSessionId(newSessionId);
    setChatHistory([]);
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
      const formattedText =
        pendingPromptType === "News"
          ? formatNewsResponse(data[0]?.finalResponse || "")
          : data[0]?.finalResponse;

      const botMessage = {
        sender: "bot",
        text: formattedText,
        icon: aiIcon,
      };

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
      <div className="chat-header">
        <div className="title">
          <img src={aiIcon} alt="AI Icon" className="ai-icon" />
          <h1>AI Agent</h1>
        </div>
        <div className="session-container">
          <p className="session-id">Session ID: {sessionId}</p>
          <button className="new-session-btn" onClick={handleNewSession}>
            New Session
          </button>
          <div className="toggle-container">
            <span className="mode-icon">{isDarkMode ? "🌙" : "☀️"}</span>
            <label className="switch">
              <input type="checkbox" checked={isDarkMode} onChange={toggleDarkMode} />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      </div>
      <div className="chat-container" ref={chatContainerRef}>
        {chatHistory.map((message, index) => (
          <div key={index} className={`chat-message ${message.sender === "user" ? "user" : "bot"}`}>
            {message.sender === "bot" && <img src={aiIcon} alt="Bot Icon" className="profile-icon" />}
            <div>{typeof message.text === "string" ? message.text : message.text}</div>
          </div>
        ))}
        {loading && <div className="loading">Bot is typing...</div>}
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <div className="dropdown" ref={dropdownRef}>
          <button type="button" className="dropdown-btn" onClick={() => setShowDropdown((prev) => !prev)}>
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
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type your message..." />
        <button type="submit" disabled={!query.trim()}>Send</button>
      </form>
    </div>
  );
};

export default App;
