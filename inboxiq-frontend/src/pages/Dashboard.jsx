import { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [emails, setEmails] = useState([]);
  const [query, setQuery] = useState("");  
  const userEmail = "rajputbhumika121@gmail.com";

  const fetchEmails = async () => {
    const res = await axios.get(
      `http://localhost:5000/email/list/${userEmail}`
    );
    setEmails(res.data);
  };

  const syncEmails = async () => {
    await axios.get(
      `http://localhost:5000/email/sync/${userEmail}`
    );
    fetchEmails();
  };
  
const askInbox = async () => {
  const res = await axios.post(
    "http://localhost:5000/email/ask",
    {
      email: userEmail,
      question: query
    }
  );

  // alert(res.data.answer);
  alert(res.data.answer || res.data.test);
};

  useEffect(() => {
    fetchEmails();
  }, []);
return (
  <div style={{ padding: "40px" }}>
    <h2>InboxIQ Dashboard</h2>

    <button onClick={syncEmails}>Sync Emails</button>

    {/* Search Section */}
    <div style={{ marginTop: "20px" }}>
      <input
        type="text"
        placeholder="Search emails..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* <button onClick={searchEmails}>Search</button> */}
    </div>
    <button onClick={askInbox}>Ask InboxIQ</button>

    {/* Email List */}
    <ul style={{ marginTop: "20px" }}>
      {emails.map((email) => (
        <li key={email._id}>
          <strong>{email.subject}</strong>
          <p dangerouslySetInnerHTML={{ __html: email.body }} />
        </li>
      ))}
    </ul>
  </div>
);
 
}