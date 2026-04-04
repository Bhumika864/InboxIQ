import React, { useEffect, useState, useCallback, useRef } from "react";
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
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiReply, setAiReply] = useState(null);
  const [replyTone, setReplyTone] = useState("formal");
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [view, setView] = useState("inbox"); // 'inbox' or 'search'
  const [searchResults, setSearchResults] = useState([]);
  const [showPlainText, setShowPlainText] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    to: "",
    subject: "",
    body: "",
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const searchInputRef = useRef(null);

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
    if (!query || !userEmail || !token) {
      console.log("askInbox skipped: query, email or token missing", {
        query,
        userEmail,
        token: !!token,
      });
      return;
    }
    setIsSearching(true);
    setAiAnswer("");
    setSearchResults([]);
    try {
      console.log("Asking InboxIQ about:", query);
      const res = await axios.post(
        `${API_BASE_URL}/email/ask`,
        {
          email: userEmail,
          question: query,
        },
        axiosConfig,
      );
      console.log("Answer received:", res.data.answer);
      setAiAnswer(res.data.answer);
      setSearchResults(res.data.matchedEmails || []);
    } catch (err) {
      console.error("Ask failed", err);
      alert(
        "Something went wrong with the search. Please check your connection or try again.",
      );
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

  const sendEmail = async (to, subject, body) => {
    if (!to || !subject || !body || !userEmail || !token) return;
    setIsSendingEmail(true);
    try {
      await axios.post(
        `${API_BASE_URL}/email/send`,
        {
          email: userEmail,
          to,
          subject,
          body,
        },
        axiosConfig,
      );
      alert("Email sent successfully!");
      setShowCompose(false);
      setComposeData({ to: "", subject: "", body: "" });
      fetchEmails(1, false);
    } catch (err) {
      console.error("Send email failed", err);
      alert("Failed to send email. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const saveDraft = async (to, subject, body) => {
    if (!to || !subject || !body || !userEmail || !token) return;
    setIsSavingDraft(true);
    try {
      await axios.post(
        `${API_BASE_URL}/email/draft`,
        {
          email: userEmail,
          to,
          subject,
          body,
        },
        axiosConfig,
      );
      alert("Draft saved to Gmail!");
      setShowCompose(false);
      setComposeData({ to: "", subject: "", body: "" });
    } catch (err) {
      console.error("Save draft failed", err);
      alert("Failed to save draft. Please try again.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const downloadAttachment = async (messageId, attachmentId, filename) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/email/attachment/${messageId}/${attachmentId}?email=${userEmail}`,
        axiosConfig,
      );

      // Gmail uses URL-safe base64
      const base64Data = res.data.data.replace(/-/g, "+").replace(/_/g, "/");
      const binaryData = atob(base64Data);
      const arrayBuffer = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        arrayBuffer[i] = binaryData.charCodeAt(i);
      }

      const blob = new Blob([arrayBuffer]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download attachment.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    window.location.href = "/login";
  };

  const filteredEmails = emails.filter((e) => {
    // First filter by section (Inbox vs Sent)
    if (view === "inbox" && e.isSent) return false;
    if (view === "sent" && !e.isSent) return false;

    // Then filter by category
    if (activeCategory === "All") return true;
    return e.category === activeCategory;
  });

  const handleBulkAction = async (action) => {
    if (!selectedEmails.length || !userEmail || !token) return;
    try {
      await axios.post(
        `${API_BASE_URL}/email/bulk-action`,
        {
          email: userEmail,
          action,
          messageIds: selectedEmails,
        },
        axiosConfig,
      );

      // Remove from local state
      setEmails((prev) =>
        prev.filter((e) => !selectedEmails.includes(e.messageId)),
      );
      setSelectedEmails([]);
      if (selectedEmail && selectedEmails.includes(selectedEmail.messageId)) {
        setSelectedEmail(null);
      }
      alert(`Successfully ${action}d ${selectedEmails.length} emails.`);
    } catch (err) {
      console.error(`Bulk ${action} failed`, err);
      alert(`Failed to ${action} emails.`);
    }
  };

  const toggleEmailSelection = (messageId, e) => {
    e.stopPropagation();
    setSelectedEmails((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId],
    );
  };

  const toggleSelectAll = () => {
    if (
      selectedEmails.length === filteredEmails.length &&
      filteredEmails.length > 0
    ) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(filteredEmails.map((e) => e.messageId));
    }
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
          <button
            style={styles.composeButton}
            onClick={() => {
              setComposeData({ to: "", subject: "", body: "" });
              setShowCompose(true);
            }}
          >
            <Send size={18} />
            <span>Compose</span>
          </button>

          <button
            style={{
              ...styles.navItem,
              ...(view === "inbox" ? styles.navItemActive : {}),
              border: "none",
              width: "100%",
              textAlign: "left",
            }}
            onClick={() => setView("inbox")}
          >
            <Inbox size={18} />
            <span>Inbox</span>
          </button>
          <button
            style={{
              ...styles.navItem,
              ...(view === "sent" ? styles.navItemActive : {}),
              border: "none",
              width: "100%",
              textAlign: "left",
            }}
            onClick={() => setView("sent")}
          >
            <Send size={18} />
            <span>Sent</span>
          </button>
          <button
            style={{
              ...styles.navItem,
              ...(view === "search" ? styles.navItemActive : {}),
              background: view === "search" ? "#f3f4f6" : "none",
              border: "none",
              width: "100%",
              textAlign: "left",
            }}
            onClick={() => {
              console.log("Sidebar Search clicked");
              setView("search");
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
          >
            <Search size={18} />
            <span>Search</span>
          </button>
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
        {view === "inbox" || view === "sent" ? (
          <>
            {/* EMAIL LIST */}
            <section style={styles.listSection}>
              <div style={styles.sectionHeader}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
                    {view === "inbox" ? "Inbox" : "Sent"}
                  </h2>
                  {selectedEmails.length > 0 && (
                    <div style={styles.bulkActionBar}>
                      <span style={styles.bulkActionText}>
                        {selectedEmails.length} selected
                      </span>
                      <button
                        style={styles.bulkActionButton}
                        onClick={() => handleBulkAction("archive")}
                      >
                        Archive
                      </button>
                      <button
                        style={{ ...styles.bulkActionButton, color: "#ef4444" }}
                        onClick={() => handleBulkAction("delete")}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <div style={styles.searchBar}>
                  <Search
                    size={16}
                    style={{ ...styles.searchIcon, cursor: "pointer" }}
                    onClick={askInbox}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Ask anything about your emails..."
                    style={styles.searchInput}
                    value={query}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
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

              <div style={styles.categoryFilters}>
                {[
                  "All",
                  "Important",
                  "Promotions",
                  "Social",
                  "Newsletters",
                ].map((cat) => (
                  <button
                    key={cat}
                    style={{
                      ...styles.categoryBtn,
                      ...(activeCategory === cat
                        ? styles.categoryBtnActive
                        : {}),
                    }}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
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
                    onClick={() => {
                      setAiAnswer("");
                      setSearchResults([]);
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div style={styles.emailList} onScroll={handleScroll}>
                {filteredEmails.length > 0 && (
                  <div style={styles.selectAllContainer}>
                    <input
                      type="checkbox"
                      checked={
                        selectedEmails.length === filteredEmails.length &&
                        filteredEmails.length > 0
                      }
                      onChange={toggleSelectAll}
                      style={styles.checkbox}
                    />
                    <span style={styles.selectAllText}>Select All</span>
                  </div>
                )}
                {filteredEmails.length === 0 ? (
                  <div style={styles.emptyState}>
                    No emails found in this category.
                  </div>
                ) : (
                  <>
                    {filteredEmails.map((email) => (
                      <div
                        key={email._id}
                        style={{
                          ...styles.emailItem,
                          ...(selectedEmail?._id === email._id
                            ? styles.emailItemActive
                            : {}),
                          ...(selectedEmails.includes(email.messageId)
                            ? styles.emailItemSelected
                            : {}),
                        }}
                        onClick={() => {
                          setSelectedEmail(email);
                          setAiReply(null);
                        }}
                      >
                        <div style={styles.emailItemHeader}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedEmails.includes(email.messageId)}
                              onChange={(e) =>
                                toggleEmailSelection(email.messageId, e)
                              }
                              onClick={(e) => e.stopPropagation()}
                              style={styles.checkbox}
                            />
                            <span style={styles.emailFrom}>
                              {email.from?.split("<")[0] || email.from}
                            </span>
                          </div>
                          <span style={styles.emailDate}>
                            {new Date(email.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={styles.emailSubject}>
                          {email.category &&
                            email.category !== "Uncategorized" && (
                              <span style={styles.categoryTag}>
                                {email.category}
                              </span>
                            )}
                          {email.subject}
                        </div>
                        <div style={styles.emailSnippet}>
                          {email.body
                            ?.substring(0, 100)
                            .replace(/<[^>]*>/g, "")}
                          ...
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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <h1 style={styles.detailSubject}>
                        {selectedEmail.subject}
                      </h1>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {selectedEmail.from?.includes(userEmail) && (
                          <button
                            style={styles.resendButton}
                            onClick={() => {
                              setComposeData({
                                to: selectedEmail.to || "",
                                subject: selectedEmail.subject,
                                body: selectedEmail.body,
                              });
                              setShowCompose(true);
                            }}
                          >
                            <RefreshCw size={14} />
                            Resend
                          </button>
                        )}
                        {selectedEmail.html && (
                          <button
                            style={styles.toggleTextButton}
                            onClick={() => setShowPlainText(!showPlainText)}
                          >
                            {showPlainText
                              ? "Show Rich View"
                              : "Show Plain Text"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={styles.detailMeta}>
                      <div style={styles.metaRow}>
                        <span style={styles.metaLabel}>From:</span>
                        <span style={styles.metaValue}>
                          {selectedEmail.from}
                        </span>
                      </div>
                      <div style={styles.metaRow}>
                        <span style={styles.metaLabel}>Date:</span>
                        <span style={styles.metaValue}>
                          {new Date(selectedEmail.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.detailBody}>
                    {selectedEmail.html && !showPlainText ? (
                      <iframe
                        title="Email Content"
                        srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="UTF-8">
                          <style>
                            body { 
                              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                              line-height: 1.6; 
                              color: #27272a;
                              margin: 0;
                              padding: 20px;
                            }
                            img { max-width: 100%; height: auto; display: block; }
                            a { color: #8b5cf6; }
                            * { box-sizing: border-box; }
                          </style>
                        </head>
                        <body>${selectedEmail.html}</body>
                      </html>
                    `}
                        style={styles.iframe}
                        onLoad={(e) => {
                          const iframe = e.target;
                          try {
                            const height =
                              iframe.contentWindow.document.documentElement
                                .scrollHeight;
                            iframe.style.height = height + 50 + "px";
                          } catch (err) {
                            console.error(
                              "Iframe height adjustment failed:",
                              err,
                            );
                            iframe.style.height = "800px";
                          }
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          padding: "20px",
                          backgroundColor: "#f9fafb",
                          borderRadius: "8px",
                          fontSize: "14px",
                        }}
                      >
                        {selectedEmail.body}
                      </div>
                    )}
                  </div>

                  {selectedEmail.attachments &&
                    selectedEmail.attachments.length > 0 && (
                      <div style={styles.attachmentsSection}>
                        <div style={styles.attachmentsHeader}>
                          <ChevronRight size={16} />
                          <span>
                            Attachments ({selectedEmail.attachments.length})
                          </span>
                        </div>
                        <div style={styles.attachmentsList}>
                          {selectedEmail.attachments.map((att) => (
                            <div
                              key={att.attachmentId}
                              style={styles.attachmentItem}
                              onClick={() =>
                                downloadAttachment(
                                  selectedEmail.messageId,
                                  att.attachmentId,
                                  att.filename,
                                )
                              }
                            >
                              <Mail size={14} />
                              <span style={styles.attachmentName}>
                                {att.filename}
                              </span>
                              <span style={styles.attachmentSize}>
                                ({(att.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  <div style={styles.aiReplySection}>
                    <div style={styles.aiReplyHeader}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
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
                          <button
                            style={styles.copyButton}
                            onClick={() =>
                              saveDraft(
                                aiReply.replyTo,
                                aiReply.subject,
                                aiReply.reply,
                              )
                            }
                            disabled={isSavingDraft}
                          >
                            {isSavingDraft ? "Saving..." : "Save as Draft"}
                          </button>
                          <button
                            style={styles.sendButton}
                            onClick={() =>
                              sendEmail(
                                aiReply.replyTo,
                                aiReply.subject,
                                aiReply.reply,
                              )
                            }
                            disabled={isSendingEmail}
                          >
                            <Send size={14} />
                            {isSendingEmail ? "Sending..." : "Send Reply"}
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
          </>
        ) : (
          <section style={styles.searchViewSection}>
            <div
              style={{
                ...styles.searchContainer,
                ...(searchResults.length > 0
                  ? styles.searchContainerResults
                  : {}),
              }}
            >
              <h1 style={styles.searchViewTitle}>Semantic Search</h1>
              <div style={styles.searchBarLarge}>
                <Search size={20} style={styles.searchIcon} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Ask anything about your emails..."
                  style={styles.searchInputLarge}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && askInbox()}
                />
                <button
                  style={styles.searchViewButton}
                  onClick={askInbox}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <RefreshCw size={18} className="spin" />
                  ) : (
                    "Search"
                  )}
                </button>
              </div>
            </div>

            {aiAnswer && (
              <div style={styles.aiAnswerLarge}>
                <div style={styles.aiAnswerHeader}>
                  <Sparkles size={18} color="#8b5cf6" />
                  <span style={{ fontSize: "16px" }}>InboxIQ Answer</span>
                </div>
                <p style={styles.aiAnswerTextLarge}>{aiAnswer}</p>
              </div>
            )}

            <div style={styles.searchResultsGrid}>
              {searchResults.map((email) => (
                <div key={email._id} style={styles.searchResultCard}>
                  <div style={styles.searchResultHeader}>
                    <div style={styles.searchResultMeta}>
                      <span style={styles.searchResultFrom}>
                        {email.from?.split("<")[0] || email.from}
                      </span>
                      <span style={styles.searchResultDate}>
                        {new Date(email.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 style={styles.searchResultSubject}>{email.subject}</h3>
                  </div>
                  <p style={styles.searchResultSnippet}>
                    {email.body?.substring(0, 200).replace(/<[^>]*>/g, "")}...
                  </p>
                  <div style={styles.searchResultActions}>
                    <button
                      style={styles.viewEmailButton}
                      onClick={() => {
                        setSelectedEmail(email);
                        setView("inbox");
                      }}
                    >
                      View Full Email
                    </button>
                    <button
                      style={styles.replySearchButton}
                      onClick={() => {
                        setSelectedEmail(email);
                        setView("inbox");
                        setTimeout(() => generateReply(), 500);
                      }}
                    >
                      AI Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* COMPOSE MODAL */}
      {showCompose && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>New Message</h3>
              <button
                style={styles.closeModal}
                onClick={() => setShowCompose(false)}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <input
                type="text"
                placeholder="To"
                style={styles.modalInput}
                value={composeData.to}
                onChange={(e) =>
                  setComposeData({ ...composeData, to: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Subject"
                style={styles.modalInput}
                value={composeData.subject}
                onChange={(e) =>
                  setComposeData({ ...composeData, subject: e.target.value })
                }
              />
              <textarea
                placeholder="Message..."
                style={styles.modalTextarea}
                value={composeData.body}
                onChange={(e) =>
                  setComposeData({ ...composeData, body: e.target.value })
                }
              />
            </div>
            <div style={styles.modalFooter}>
              <button
                style={{ ...styles.copyButton, marginRight: "auto" }}
                onClick={() =>
                  saveDraft(
                    composeData.to,
                    composeData.subject,
                    composeData.body,
                  )
                }
                disabled={isSavingDraft}
              >
                {isSavingDraft ? "Saving..." : "Save as Draft"}
              </button>
              <button
                style={styles.modalSendButton}
                onClick={() =>
                  sendEmail(
                    composeData.to,
                    composeData.subject,
                    composeData.body,
                  )
                }
                disabled={isSendingEmail}
              >
                {isSendingEmail ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

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
  composeButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "12px",
    backgroundColor: "#18181b",
    color: "white",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "24px",
    transition: "all 0.2s",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
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
    background: "none",
    border: "none",
  },
  navItemActive: {
    backgroundColor: "#f3f4f6",
    color: "#18181b",
    fontWeight: "600",
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
    flex: 1,
  },
  toggleTextButton: {
    padding: "6px 12px",
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    marginLeft: "16px",
  },
  resendButton: {
    padding: "6px 12px",
    backgroundColor: "#18181b",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    marginLeft: "12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  bulkActionBar: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#f3f4f6",
    padding: "6px 12px",
    borderRadius: "8px",
  },
  bulkActionText: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#4b5563",
  },
  bulkActionButton: {
    background: "none",
    border: "none",
    fontSize: "12px",
    fontWeight: "700",
    color: "#18181b",
    cursor: "pointer",
    padding: "4px 8px",
  },
  categoryFilters: {
    display: "flex",
    gap: "8px",
    padding: "0 20px 16px 20px",
    borderBottom: "1px solid #f3f4f6",
    overflowX: "auto",
  },
  categoryBtn: {
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  categoryBtnActive: {
    backgroundColor: "#18181b",
    color: "white",
  },
  categoryTag: {
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "#e5e7eb",
    color: "#4b5563",
    marginRight: "8px",
    display: "inline-block",
  },
  selectAllContainer: {
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    borderBottom: "1px solid #f3f4f6",
    backgroundColor: "#f9fafb",
  },
  selectAllText: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#6b7280",
  },
  checkbox: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
  },
  emailItemSelected: {
    backgroundColor: "#f0f9ff",
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
  },
  iframe: {
    width: "100%",
    border: "none",
    overflow: "hidden",
  },
  attachmentsSection: {
    margin: "20px 0",
    padding: "16px",
    backgroundColor: "#f9fafb",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
  },
  attachmentsHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: "12px",
  },
  attachmentsList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  attachmentItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  attachmentName: {
    fontWeight: "500",
    color: "#18181b",
    maxWidth: "150px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  attachmentSize: {
    color: "#9ca3af",
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
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "white",
    width: "100%",
    maxWidth: "500px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
  modalHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
  },
  closeModal: {
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    color: "#9ca3af",
  },
  modalBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  modalInput: {
    padding: "10px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
  },
  modalTextarea: {
    padding: "10px",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    fontSize: "14px",
    minHeight: "200px",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
  },
  modalFooter: {
    padding: "16px 20px",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "flex-end",
  },
  modalSendButton: {
    padding: "8px 24px",
    backgroundColor: "#18181b",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  searchViewSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "40px",
    overflowY: "auto",
    backgroundColor: "#f9fafb",
  },
  searchContainer: {
    maxWidth: "800px",
    margin: "100px auto 40px",
    width: "100%",
    textAlign: "center",
    transition: "margin 0.3s ease",
  },
  searchContainerResults: {
    margin: "0 auto 40px",
  },
  searchViewTitle: {
    fontSize: "32px",
    fontWeight: "800",
    marginBottom: "24px",
    color: "#18181b",
  },
  searchBarLarge: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "8px 16px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e5e7eb",
  },
  searchInputLarge: {
    flex: 1,
    border: "none",
    padding: "16px",
    fontSize: "16px",
    outline: "none",
  },
  searchViewButton: {
    padding: "12px 24px",
    backgroundColor: "#8b5cf6",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  aiAnswerLarge: {
    maxWidth: "800px",
    margin: "0 auto 40px",
    width: "100%",
    padding: "24px",
    backgroundColor: "white",
    borderRadius: "16px",
    border: "1px solid #ddd6fe",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  },
  aiAnswerTextLarge: {
    fontSize: "15px",
    lineHeight: "1.7",
    color: "#1e1b4b",
    margin: "12px 0 0 0",
  },
  searchResultsGrid: {
    maxWidth: "1000px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))",
    gap: "24px",
    paddingBottom: "40px",
  },
  searchResultCard: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    transition: "transform 0.2s",
  },
  searchResultHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  searchResultMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchResultFrom: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#8b5cf6",
  },
  searchResultDate: {
    fontSize: "12px",
    color: "#9ca3af",
  },
  searchResultSubject: {
    fontSize: "18px",
    fontWeight: "700",
    margin: 0,
    color: "#18181b",
  },
  searchResultSnippet: {
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#4b5563",
    margin: 0,
  },
  searchResultActions: {
    marginTop: "auto",
    display: "flex",
    gap: "12px",
  },
  viewEmailButton: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#f3f4f6",
    color: "#18181b",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  replySearchButton: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#18181b",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};
