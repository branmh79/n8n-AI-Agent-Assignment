import React, { useState } from "react";

const App = () => {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await fetch(
        `https://bmhall79.app.n8n.cloud/webhook/8164117a-290d-4e5e-9390-5cebc628b8d2?query=${encodeURIComponent(query)}`,
        {
          method: "GET",
          mode: "cors",
        }
      );

      if (!result.ok) {
        throw new Error(`HTTP error! status: ${result.status}`);
      }
  
      const data = await result.json();
      console.log(data); // Log the response to debug
      setResponse(data[0]?.finalResponse || "No response received."); // Access the correct key
    } catch (error) {
      console.error(error); // Log the error for debugging
      setResponse("An error occurred: " + error.message);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>n8n Query Processor</h1>
      <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
        <label>
          Enter Query:
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your query here..."
            style={{
              marginLeft: "10px",
              padding: "5px",
              fontSize: "14px",
              width: "300px",
            }}
          />
        </label>
        <button
          type="submit"
          style={{
            marginLeft: "10px",
            padding: "5px 10px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Submit
        </button>
      </form>
      {loading && <p>Loading...</p>}
      {response && !loading && (
        <div
          style={{
            backgroundColor: "#f4f4f4",
            padding: "10px",
            borderRadius: "5px",
            border: "1px solid #ddd",
          }}
        >
          <strong>Response:</strong>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
};

export default App;
