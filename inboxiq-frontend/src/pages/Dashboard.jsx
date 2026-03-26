import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Inbox,
  Search,
  RefreshCw,
  LogOut,
  Mail,
  User,
  Send,
  ChevronRight,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

const API_BASE_URL = "http://localhost:5000";

export default function Dashboard() {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [query, setQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiReply, setAiReply] = useState(null);
  const [replyTone, setReplyTone] = useState("formal");
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [userEmail] = useState(localStorage.getItem("email"));
  const [token] = useState(localStorage.getItem("token"));

  const axiosConfig = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const fetchEmails = useCallback(
    async (pageNum = 1, shouldAppend = false) => {
      if (!userEmail || !token) return;
      if (shouldAppend) setIsLoadingMore(true);

      try {
        const res = await axios.get(
          `${API_BASE_URL}/email/list/${userEmail}?page=${pageNum}&limit=20`,
          axiosConfig,
        );

        if (res.data.length < 20) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        if (shouldAppend) {
          setEmails((prev) => [...prev, ...res.data]);
        } else {
          setEmails(res.data);
        }
      } catch (err) {
        console.error("Fetch emails failed", err);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [userEmail, token],
  );

  const syncEmails = async () => {
    if (!userEmail || !token) return;
    setIsSyncing(true);
    try {
      await axios.get(`${API_BASE_URL}/email/sync/${userEmail}`, axiosConfig);
      setPage(1);
      fetchEmails(1, false);
    } catch (err) {
      console.error("Sync failed", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadMoreEmails = () => {
    if (hasMore && !isLoadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchEmails(nextPage, true);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Load more when user is 100px from the bottom
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      loadMoreEmails();
    }
  };

  const askInbox = async () => {
    if (!query || !userEmail || !token) return;
    setIsSearching(true);
    setAiAnswer("");
    try {
      const res = await axios.post(
        `${API_BASE_URL}/email/ask`,
        {
          email: userEmail,
          question: query,
        },
        axiosConfig,
      );
      setAiAnswer(res.data.answer);
    } catch (err) {
      console.error("Ask failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const generateReply = async () => {
    if (!selectedEmail) return;
    setIsGeneratingReply(true);
    setAiReply(null);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/email/reply`,
        {
          messageId: selectedEmail.messageId,
          tone: replyTone,
        },
        axiosConfig,
      );
      setAiReply(res.data);
    } catch (err) {
      console.error("Reply generation failed", err);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    window.location.href = "/login";
  };

  useEffect(() => {
    if (userEmail && token) {
      fetchEmails();
    }
  }, [fetchEmails, userEmail, token]);

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>InboxIQ</div>
        </div>

        <nav style={styles.nav}>
          <div style={{ ...styles.navItem, ...styles.navItemActive }}>
            <Inbox size={18} />
            <span>Inbox</span>
          </div>
          <div
            style={styles.navItem}
            onClick={() => document.getElementById("searchInput").focus()}
          >
            <Search size={18} />
            <span>Search</span>
          </div>
        </nav>

        <div style={styles.sidebarFooter}>
          <button
            style={styles.syncButton}
            onClick={syncEmails}
            disabled={isSyncing}
          >
            <RefreshCw size={16} className={isSyncing ? "spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync Emails"}
          </button>

          <div style={styles.userProfile}>
            <div style={styles.userAvatar}>
              <User size={16} />
            </div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{userEmail?.split("@")[0]}</div>
              <div style={styles.userStatus}>Online</div>
            </div>
            <LogOut
              size={16}
              style={styles.logoutIcon}
              onClick={handleLogout}
            />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={styles.main}>
        {/* EMAIL LIST */}
        <section style={styles.listSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Inbox</h2>
            <div style={styles.searchBar}>
              <Search size={16} style={styles.searchIcon} />
              <input
                id="searchInput"
                type="text"
                placeholder="Ask anything about your emails..."
                style={styles.searchInput}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && askInbox()}
              />
              {isSearching && (
                <RefreshCw
                  size={14}
                  className="spin"
                  style={{ marginRight: 8 }}
                />
              )}
            </div>
          </div>

          {aiAnswer && (
            <div style={styles.aiAnswerCard}>
              <div style={styles.aiAnswerHeader}>
                <Sparkles size={16} color="#8b5cf6" />
                <span>InboxIQ Answer</span>
              </div>
              <p style={styles.aiAnswerText}>{aiAnswer}</p>
              <button
                style={styles.closeAiAnswer}
                onClick={() => setAiAnswer("")}
              >
                Dismiss
              </button>
            </div>
          )}

          <div style={styles.emailList} onScroll={handleScroll}>
            {emails.length === 0 ? (
              <div style={styles.emptyState}>
                No emails found. Sync to get started.
              </div>
            ) : (
              <>
                {emails.map((email) => (
                  <div
                    key={email._id}
                    style={{
                      ...styles.emailItem,
                      ...(selectedEmail?._id === email._id
                        ? styles.emailItemActive
                        : {}),
                    }}
                    onClick={() => {
                      setSelectedEmail(email);
                      setAiReply(null);
                    }}
                  >
                    <div style={styles.emailItemHeader}>
                      <span style={styles.emailFrom}>
                        {email.from?.split("<")[0] || email.from}
                      </span>
                      <span style={styles.emailDate}>
                        {new Date(email.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={styles.emailSubject}>{email.subject}</div>
                    <div style={styles.emailSnippet}>
                      {email.body?.substring(0, 100).replace(/<[^>]*>/g, "")}...
                    </div>
                  </div>
                ))}
                {isLoadingMore && (
                  <div style={{ ...styles.emptyState, padding: "20px" }}>
                    <RefreshCw size={16} className="spin" />
                  </div>
                )}
                {!hasMore && emails.length > 0 && (
                  <div style={{ ...styles.emptyState, padding: "20px" }}>
                    End of inbox
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* EMAIL DETAIL */}
        <section style={styles.detailSection}>
          {selectedEmail ? (
            <div style={styles.detailContainer}>
              <div style={styles.detailHeader}>
                <h1 style={styles.detailSubject}>{selectedEmail.subject}</h1>
                <div style={styles.detailMeta}>
                  <div style={styles.metaRow}>
                    <span style={styles.metaLabel}>From:</span>
                    <span style={styles.metaValue}>{selectedEmail.from}</span>
                  </div>
                  <div style={styles.metaRow}>
                    <span style={styles.metaLabel}>Date:</span>
                    <span style={styles.metaValue}>
                      {new Date(selectedEmail.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={styles.detailBody}
                dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
              />

              <div style={styles.aiReplySection}>
                <div style={styles.aiReplyHeader}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <MessageSquareText size={18} color="#8b5cf6" />
                    <span style={{ fontWeight: 600 }}>AI Smart Reply</span>
                  </div>
                  <div style={styles.toneSelector}>
                    <select
                      value={replyTone}
                      onChange={(e) => setReplyTone(e.target.value)}
                      style={styles.select}
                    >
                      <option value="formal">Formal</option>
                      <option value="casual">Casual</option>
                      <option value="short">Short</option>
                      <option value="detailed">Detailed</option>
                    </select>
                    <button
                      style={styles.generateButton}
                      onClick={generateReply}
                      disabled={isGeneratingReply}
                    >
                      {isGeneratingReply ? "Generating..." : "Generate"}
                    </button>
                  </div>
                </div>

                {aiReply && (
                  <div style={styles.aiReplyContent}>
                    <div style={styles.replyDraftHeader}>Draft Reply</div>
                    <pre style={styles.replyText}>{aiReply.reply}</pre>
                    <div style={styles.replyActions}>
                      <button
                        style={styles.copyButton}
                        onClick={() =>
                          navigator.clipboard.writeText(aiReply.reply)
                        }
                      >
                        Copy to Clipboard
                      </button>
                      <button style={styles.sendButton}>
                        <Send size={14} />
                        Send Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={styles.detailPlaceholder}>
              <Mail size={48} color="#e4e4e7" />
              <p>Select an email to view details</p>
            </div>
          )}
        </section>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    backgroundColor: "#ffffff",
    color: "#18181b",
    fontFamily: "'Inter', -apple-system, sans-serif",
    overflow: "hidden",
  },
  sidebar: {
    width: "240px",
    backgroundColor: "#f9fafb",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    padding: "16px",
  },
  sidebarHeader: {
    marginBottom: "24px",
    padding: "0 8px",
  },
  logo: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#18181b",
    letterSpacing: "-0.02em",
  },
  nav: {
    flex: 1,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#4b5563",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: "4px",
  },
  navItemActive: {
    backgroundColor: "#f3f4f6",
    color: "#18181b",
  },
  sidebarFooter: {
    marginTop: "auto",
  },
  syncButton: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px",
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "16px",
    transition: "all 0.2s",
  },
  userProfile: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 8px",
    borderTop: "1px solid #e5e7eb",
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: "13px",
    fontWeight: "600",
  },
  userStatus: {
    fontSize: "11px",
    color: "#10b981",
  },
  logoutIcon: {
    color: "#9ca3af",
    cursor: "pointer",
  },
  main: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  listSection: {
    width: "380px",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "white",
  },
  sectionHeader: {
    padding: "20px",
    borderBottom: "1px solid #f3f4f6",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "700",
    margin: "0 0 16px 0",
  },
  searchBar: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: "8px",
    padding: "0 10px",
  },
  searchIcon: {
    color: "#9ca3af",
  },
  searchInput: {
    flex: 1,
    border: "none",
    backgroundColor: "transparent",
    padding: "10px",
    fontSize: "13px",
    outline: "none",
  },
  aiAnswerCard: {
    margin: "12px 20px",
    padding: "12px",
    backgroundColor: "#f5f3ff",
    border: "1px solid #ddd6fe",
    borderRadius: "10px",
    position: "relative",
  },
  aiAnswerHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: "700",
    color: "#7c3aed",
    marginBottom: "6px",
  },
  aiAnswerText: {
    fontSize: "13px",
    lineHeight: "1.5",
    color: "#4c1d95",
    margin: 0,
  },
  closeAiAnswer: {
    marginTop: "8px",
    fontSize: "11px",
    color: "#7c3aed",
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    fontWeight: "600",
  },
  emailList: {
    flex: 1,
    overflowY: "auto",
  },
  emailItem: {
    padding: "16px 20px",
    borderBottom: "1px solid #f3f4f6",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  emailItemActive: {
    backgroundColor: "#f8fafc",
    borderLeft: "3px solid #18181b",
  },
  emailItemHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
  },
  emailFrom: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#18181b",
  },
  emailDate: {
    fontSize: "11px",
    color: "#9ca3af",
  },
  emailSubject: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#3f3f46",
    marginBottom: "4px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  emailSnippet: {
    fontSize: "12px",
    color: "#71717a",
    lineHeight: "1.4",
  },
  emptyState: {
    padding: "40px",
    textAlign: "center",
    color: "#9ca3af",
    fontSize: "14px",
  },
  detailSection: {
    flex: 1,
    backgroundColor: "white",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
  },
  detailPlaceholder: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#9ca3af",
    gap: "12px",
  },
  detailContainer: {
    padding: "40px",
    maxWidth: "800px",
    margin: "0 auto",
    width: "100%",
  },
  detailHeader: {
    marginBottom: "32px",
    borderBottom: "1px solid #f3f4f6",
    paddingBottom: "24px",
  },
  detailSubject: {
    fontSize: "28px",
    fontWeight: "800",
    margin: "0 0 20px 0",
    letterSpacing: "-0.02em",
  },
  detailMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  metaRow: {
    display: "flex",
    gap: "8px",
    fontSize: "13px",
  },
  metaLabel: {
    color: "#71717a",
    width: "45px",
  },
  metaValue: {
    color: "#18181b",
    fontWeight: "500",
  },
  detailBody: {
    fontSize: "15px",
    lineHeight: "1.6",
    color: "#27272a",
    marginBottom: "40px",
    whiteSpace: "pre-wrap",
  },
  aiReplySection: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden",
  },
  aiReplyHeader: {
    padding: "16px",
    backgroundColor: "#f9fafb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e5e7eb",
  },
  toneSelector: {
    display: "flex",
    gap: "8px",
  },
  select: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "12px",
    backgroundColor: "white",
  },
  generateButton: {
    padding: "6px 12px",
    backgroundColor: "#18181b",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  aiReplyContent: {
    padding: "20px",
  },
  replyDraftHeader: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    marginBottom: "12px",
    letterSpacing: "0.05em",
  },
  replyText: {
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#18181b",
    backgroundColor: "#fdfdfd",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #f3f4f6",
    margin: "0 0 20px 0",
    fontFamily: "inherit",
    whiteSpace: "pre-wrap",
  },
  replyActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  copyButton: {
    padding: "8px 16px",
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  sendButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "#8b5cf6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};
