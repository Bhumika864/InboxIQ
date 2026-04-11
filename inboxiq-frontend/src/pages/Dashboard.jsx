// import React, { useEffect, useState, useCallback, useRef } from "react";
// import axios from "axios";
// import {
//   Inbox,
//   Search,
//   RefreshCw,
//   LogOut,
//   Mail,
//   User,
//   Send,
//   Star,
//   ChevronRight,
//   MessageSquareText,
//   Sparkles,
// } from "lucide-react";

// const API_BASE_URL = "http://localhost:5000";

// export default function Dashboard() {
//   const [emails, setEmails] = useState([]);
//   const [selectedEmail, setSelectedEmail] = useState(null);
//   const [selectedEmails, setSelectedEmails] = useState([]);
//   const [activeCategory, setActiveCategory] = useState("All");
//   const [query, setQuery] = useState("");
//   const [isSyncing, setIsSyncing] = useState(false);
//   const [aiAnswer, setAiAnswer] = useState("");
//   const [aiReply, setAiReply] = useState(null);
//   const [replyTone, setReplyTone] = useState("formal");
//   const [isGeneratingReply, setIsGeneratingReply] = useState(false);
//   const [isSendingEmail, setIsSendingEmail] = useState(false);
//   const [isSavingDraft, setIsSavingDraft] = useState(false);
//   const [isSearching, setIsSearching] = useState(false);
//   const [_isSearchFocused, setIsSearchFocused] = useState(false);
//   const [view, setView] = useState("inbox"); // 'inbox' or 'search'
//   const [searchResults, setSearchResults] = useState([]);
//   const [showPlainText, setShowPlainText] = useState(false);
//   const [showCompose, setShowCompose] = useState(false);
//   const [composeData, setComposeData] = useState({
//     to: "",
//     subject: "",
//     body: "",
//   });
//   const [page, setPage] = useState(1);
//   const [hasMore, setHasMore] = useState(true);
//   const [isLoadingMore, setIsLoadingMore] = useState(false);
//   const [threadEmails, setThreadEmails] = useState([]);

//   const sanitizeEmailHtml = (html) => {
//     if (!html) return "";
//     // Some email HTML includes malformed meta tags that cause iframe console parse errors.
//     return String(html).replace(/<meta\b[^>]*>/gi, "");
//   };

//   const searchInputRef = useRef(null);

//   const [userEmail] = useState(localStorage.getItem("email"));
//   const [token] = useState(localStorage.getItem("token"));

//   const axiosConfig = {
//     headers: { Authorization: `Bearer ${token}` },
//   };

//   const fetchEmails = useCallback(
//     async (pageNum = 1, shouldAppend = false) => {
//       if (!userEmail || !token) return;
//       if (shouldAppend) setIsLoadingMore(true);

//       try {
//         const res = await axios.get(
//           `${API_BASE_URL}/email/list/${userEmail}?page=${pageNum}&limit=20`,
//           axiosConfig,
//         );

//         if (res.data.length < 20) {
//           setHasMore(false);
//         } else {
//           setHasMore(true);
//         }

//         if (shouldAppend) {
//           setEmails((prev) => {
//             const combined = [...prev, ...res.data];
//             // Filter out duplicates by _id
//             const unique = combined.filter(
//               (email, index, self) =>
//                 index === self.findIndex((e) => e._id === email._id),
//             );
//             return unique;
//           });
//         } else {
//           setEmails(res.data);
//         }
//       } catch (err) {
//         console.error("Fetch emails failed", err);
//       } finally {
//         setIsLoadingMore(false);
//       }
//     },
//     [userEmail, token],
//   );

//   const syncEmails = async () => {
//     if (!userEmail || !token) return;
//     setIsSyncing(true);
//     try {
//       await axios.get(`${API_BASE_URL}/email/sync/${userEmail}`, axiosConfig);
//       setPage(1);
//       fetchEmails(1, false);
//     } catch (err) {
//       console.error("Sync failed", err);
//     } finally {
//       setIsSyncing(false);
//     }
//   };

//   const loadMoreEmails = () => {
//     if (hasMore && !isLoadingMore) {
//       const nextPage = page + 1;
//       setPage(nextPage);
//       fetchEmails(nextPage, true);
//     }
//   };

//   const handleScroll = (e) => {
//     const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
//     // Load more when user is 100px from the bottom
//     if (scrollHeight - scrollTop <= clientHeight + 100) {
//       loadMoreEmails();
//     }
//   };

//   const askInbox = async () => {
//     if (!query || !userEmail || !token) {
//       console.log("askInbox skipped: query, email or token missing", {
//         query,
//         userEmail,
//         token: !!token,
//       });
//       return;
//     }
//     setIsSearching(true);
//     setAiAnswer("");
//     setSearchResults([]);
//     try {
//       console.log("Asking InboxIQ about:", query);
//       const res = await axios.post(
//         `${API_BASE_URL}/email/ask`,
//         {
//           email: userEmail,
//           question: query,
//         },
//         axiosConfig,
//       );
//       console.log("Answer received:", res.data.answer);
//       setAiAnswer(res.data.answer);
//       const uniqueResults = (res.data.matchedEmails || []).filter(
//         (email, index, self) =>
//           index === self.findIndex((e) => e._id === email._id),
//       );
//       setSearchResults(uniqueResults);
//     } catch (err) {
//       console.error("Ask failed", err);
//       alert(
//         "Something went wrong with the search. Please check your connection or try again.",
//       );
//     } finally {
//       setIsSearching(false);
//     }
//   };

//   const generateReply = async () => {
//     if (!selectedEmail) return;
//     setIsGeneratingReply(true);
//     setAiReply(null);
//     try {
//       const res = await axios.post(
//         `${API_BASE_URL}/email/reply`,
//         {
//           messageId: selectedEmail.messageId,
//           tone: replyTone,
//         },
//         axiosConfig,
//       );
//       setAiReply(res.data);
//     } catch (err) {
//       console.error("Reply generation failed", err);
//     } finally {
//       setIsGeneratingReply(false);
//     }
//   };

//   const sendEmail = async (to, subject, body) => {
//     if (!to || !subject || !body || !userEmail || !token) return;
//     setIsSendingEmail(true);
//     try {
//       await axios.post(
//         `${API_BASE_URL}/email/send`,
//         {
//           email: userEmail,
//           to,
//           subject,
//           body,
//         },
//         axiosConfig,
//       );
//       alert("Email sent successfully!");
//       setShowCompose(false);
//       setComposeData({ to: "", subject: "", body: "" });
//       fetchEmails(1, false);
//     } catch (err) {
//       console.error("Send email failed", err);
//       alert("Failed to send email. Please try again.");
//     } finally {
//       setIsSendingEmail(false);
//     }
//   };

//   const saveDraft = async (to, subject, body) => {
//     if (!to || !subject || !body || !userEmail || !token) return;
//     setIsSavingDraft(true);
//     try {
//       await axios.post(
//         `${API_BASE_URL}/email/draft`,
//         {
//           email: userEmail,
//           to,
//           subject,
//           body,
//         },
//         axiosConfig,
//       );
//       alert("Draft saved to Gmail!");
//       setShowCompose(false);
//       setComposeData({ to: "", subject: "", body: "" });
//     } catch (err) {
//       console.error("Save draft failed", err);
//       alert("Failed to save draft. Please try again.");
//     } finally {
//       setIsSavingDraft(false);
//     }
//   };

//   const downloadAttachment = async (messageId, attachmentId, filename) => {
//     try {
//       const res = await axios.get(
//         `${API_BASE_URL}/email/attachment/${messageId}/${attachmentId}?email=${userEmail}`,
//         axiosConfig,
//       );

//       // Gmail uses URL-safe base64
//       const base64Data = res.data.data.replace(/-/g, "+").replace(/_/g, "/");
//       const binaryData = atob(base64Data);
//       const arrayBuffer = new Uint8Array(binaryData.length);
//       for (let i = 0; i < binaryData.length; i++) {
//         arrayBuffer[i] = binaryData.charCodeAt(i);
//       }

//       const blob = new Blob([arrayBuffer]);
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement("a");
//       link.href = url;
//       link.setAttribute("download", filename);
//       document.body.appendChild(link);
//       link.click();
//       link.remove();
//     } catch (err) {
//       console.error("Download failed", err);
//       alert("Failed to download attachment.");
//     }
//   };

//   const fetchThread = async (threadId) => {
//     if (!threadId || !userEmail || !token) return;
//     try {
//       const res = await axios.get(
//         `${API_BASE_URL}/email/thread/${threadId}?email=${encodeURIComponent(userEmail)}`,
//         axiosConfig,
//       );
//       const uniqueThread = (res.data || []).filter(
//         (email, index, self) =>
//           index === self.findIndex((e) => e._id === email._id),
//       );
//       setThreadEmails(uniqueThread);
//     } catch (err) {
//       console.error("Fetch thread failed", err);
//       setThreadEmails([]);
//     }
//   };

//   const openEmail = (email) => {
//     setSelectedEmail(email);
//     setAiReply(null);
//     fetchThread(email.threadId);
//   };

//   const markReadStatus = async (email, isRead) => {
//     if (!userEmail || !token || !email?.messageId) return;
//     try {
//       await axios.post(
//         `${API_BASE_URL}/email/mark-read`,
//         { email: userEmail, messageId: email.messageId, isRead },
//         axiosConfig,
//       );

//       setEmails((prev) =>
//         prev.map((item) =>
//           item.messageId === email.messageId ? { ...item, isRead } : item,
//         ),
//       );
//       if (selectedEmail?.messageId === email.messageId) {
//         setSelectedEmail((prev) => ({ ...prev, isRead }));
//       }
//       setThreadEmails((prev) =>
//         prev.map((item) =>
//           item.messageId === email.messageId ? { ...item, isRead } : item,
//         ),
//       );
//     } catch (err) {
//       console.error("Mark read failed", err);
//     }
//   };

//   const markStarStatus = async (email, isStarred) => {
//     if (!userEmail || !token || !email?.messageId) return;
//     try {
//       await axios.post(
//         `${API_BASE_URL}/email/mark-star`,
//         { email: userEmail, messageId: email.messageId, isStarred },
//         axiosConfig,
//       );

//       setEmails((prev) =>
//         prev.map((item) =>
//           item.messageId === email.messageId ? { ...item, isStarred } : item,
//         ),
//       );
//       if (selectedEmail?.messageId === email.messageId) {
//         setSelectedEmail((prev) => ({ ...prev, isStarred }));
//       }
//       setThreadEmails((prev) =>
//         prev.map((item) =>
//           item.messageId === email.messageId ? { ...item, isStarred } : item,
//         ),
//       );
//     } catch (err) {
//       console.error("Mark star failed", err);
//     }
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("email");
//     window.location.href = "/login";
//   };

//   const filteredEmails = emails.filter((e) => {
//     // First filter by section (Inbox vs Sent)
//     if (view === "inbox" && e.isSent) return false;
//     if (view === "sent" && !e.isSent) return false;

//     // Then filter by category
//     if (activeCategory === "All") return true;
//     return e.category === activeCategory;
//   });

//   const handleBulkAction = async (action) => {
//     if (!selectedEmails.length || !userEmail || !token) return;
//     try {
//       await axios.post(
//         `${API_BASE_URL}/email/bulk-action`,
//         {
//           email: userEmail,
//           action,
//           messageIds: selectedEmails,
//         },
//         axiosConfig,
//       );

//       // Remove from local state
//       setEmails((prev) =>
//         prev.filter((e) => !selectedEmails.includes(e.messageId)),
//       );
//       setSelectedEmails([]);
//       if (selectedEmail && selectedEmails.includes(selectedEmail.messageId)) {
//         setSelectedEmail(null);
//       }
//       alert(`Successfully ${action}d ${selectedEmails.length} emails.`);
//     } catch (err) {
//       console.error(`Bulk ${action} failed`, err);
//       alert(`Failed to ${action} emails.`);
//     }
//   };

//   const toggleEmailSelection = (messageId, e) => {
//     e.stopPropagation();
//     setSelectedEmails((prev) =>
//       prev.includes(messageId)
//         ? prev.filter((id) => id !== messageId)
//         : [...prev, messageId],
//     );
//   };

//   const toggleSelectAll = () => {
//     if (
//       selectedEmails.length === filteredEmails.length &&
//       filteredEmails.length > 0
//     ) {
//       setSelectedEmails([]);
//     } else {
//       setSelectedEmails(filteredEmails.map((e) => e.messageId));
//     }
//   };

//   useEffect(() => {
//     if (userEmail && token) {
//       fetchEmails();
//     }
//   }, [fetchEmails, userEmail, token]);

//   useEffect(() => {
//     if (selectedEmail?.threadId) {
//       fetchThread(selectedEmail.threadId);
//     } else {
//       setThreadEmails([]);
//     }
//   }, [selectedEmail?.threadId]);

//   return (
//     <div style={styles.container}>
//       {/* SIDEBAR */}
//       <aside style={styles.sidebar}>
//         <div style={styles.sidebarHeader}>
//           <div style={styles.logo}>InboxIQ</div>
//         </div>

//         <nav style={styles.nav}>
//           <button
//             style={styles.composeButton}
//             onClick={() => {
//               setComposeData({ to: "", subject: "", body: "" });
//               setShowCompose(true);
//             }}
//           >
//             <Send size={18} />
//             <span>Compose</span>
//           </button>

//           <button
//             style={{
//               ...styles.navItem,
//               ...(view === "inbox" ? styles.navItemActive : {}),
//               border: "none",
//               width: "100%",
//               textAlign: "left",
//             }}
//             onClick={() => setView("inbox")}
//           >
//             <Inbox size={18} />
//             <span>Inbox</span>
//           </button>
//           <button
//             style={{
//               ...styles.navItem,
//               ...(view === "sent" ? styles.navItemActive : {}),
//               border: "none",
//               width: "100%",
//               textAlign: "left",
//             }}
//             onClick={() => setView("sent")}
//           >
//             <Send size={18} />
//             <span>Sent</span>
//           </button>
//           <button
//             style={{
//               ...styles.navItem,
//               ...(view === "search" ? styles.navItemActive : {}),
//               backgroundColor: view === "search" ? "#f3f4f6" : "transparent",
//               border: "none",
//               width: "100%",
//               textAlign: "left",
//             }}
//             onClick={() => {
//               setView("search");
//               setTimeout(() => searchInputRef.current?.focus(), 100);
//             }}
//           >
//             <Search size={18} />
//             <span>Search</span>
//           </button>
//         </nav>

//         <div style={styles.sidebarFooter}>
//           <button
//             style={styles.syncButton}
//             onClick={syncEmails}
//             disabled={isSyncing}
//           >
//             <RefreshCw size={16} className={isSyncing ? "spin" : ""} />
//             {isSyncing ? "Syncing..." : "Sync Emails"}
//           </button>

//           <div style={styles.userProfile}>
//             <div style={styles.userAvatar}>
//               <User size={16} />
//             </div>
//             <div style={styles.userInfo}>
//               <div style={styles.userName}>{userEmail?.split("@")[0]}</div>
//               <div style={styles.userStatus}>Online</div>
//             </div>
//             <LogOut
//               size={16}
//               style={styles.logoutIcon}
//               onClick={handleLogout}
//             />
//           </div>
//         </div>
//       </aside>

//       {/* MAIN CONTENT */}
//       <main style={styles.main}>
//         {view === "inbox" || view === "sent" ? (
//           <>
//             {/* EMAIL LIST */}
//             <section style={styles.listSection}>
//               <div style={styles.sectionHeader}>
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "space-between",
//                     alignItems: "center",
//                     marginBottom: "16px",
//                   }}
//                 >
//                   <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
//                     {view === "inbox" ? "Inbox" : "Sent"}
//                   </h2>
//                   {selectedEmails.length > 0 && (
//                     <div style={styles.bulkActionBar}>
//                       <span style={styles.bulkActionText}>
//                         {selectedEmails.length} selected
//                       </span>
//                       <button
//                         style={styles.bulkActionButton}
//                         onClick={() => handleBulkAction("archive")}
//                       >
//                         Archive
//                       </button>
//                       <button
//                         style={{ ...styles.bulkActionButton, color: "#ef4444" }}
//                         onClick={() => handleBulkAction("delete")}
//                       >
//                         Delete
//                       </button>
//                     </div>
//                   )}
//                 </div>
//                 <div style={styles.searchBar}>
//                   <Search
//                     size={16}
//                     style={{ ...styles.searchIcon, cursor: "pointer" }}
//                     onClick={askInbox}
//                   />
//                   <input
//                     ref={searchInputRef}
//                     type="text"
//                     placeholder="Ask anything about your emails..."
//                     style={styles.searchInput}
//                     value={query}
//                     onFocus={() => setIsSearchFocused(true)}
//                     onBlur={() => setIsSearchFocused(false)}
//                     onChange={(e) => setQuery(e.target.value)}
//                     onKeyPress={(e) => e.key === "Enter" && askInbox()}
//                   />
//                   {isSearching && (
//                     <RefreshCw
//                       size={14}
//                       className="spin"
//                       style={{ marginRight: 8 }}
//                     />
//                   )}
//                 </div>
//               </div>

//               <div style={styles.categoryFilters}>
//                 {[
//                   "All",
//                   "Important",
//                   "Promotions",
//                   "Social",
//                   "Newsletters",
//                 ].map((cat) => (
//                   <button
//                     key={cat}
//                     style={{
//                       ...styles.categoryBtn,
//                       ...(activeCategory === cat
//                         ? styles.categoryBtnActive
//                         : {}),
//                     }}
//                     onClick={() => setActiveCategory(cat)}
//                   >
//                     {cat}
//                   </button>
//                 ))}
//               </div>

//               {aiAnswer && (
//                 <div style={styles.aiAnswerCard}>
//                   <div style={styles.aiAnswerHeader}>
//                     <Sparkles size={16} color="#8b5cf6" />
//                     <span>InboxIQ Answer</span>
//                   </div>
//                   <p style={styles.aiAnswerText}>{aiAnswer}</p>
//                   <button
//                     style={styles.closeAiAnswer}
//                     onClick={() => {
//                       setAiAnswer("");
//                       setSearchResults([]);
//                     }}
//                   >
//                     Dismiss
//                   </button>
//                 </div>
//               )}

//               <div style={styles.emailList} onScroll={handleScroll}>
//                 {filteredEmails.length > 0 && (
//                   <div style={styles.selectAllContainer}>
//                     <input
//                       type="checkbox"
//                       checked={
//                         selectedEmails.length === filteredEmails.length &&
//                         filteredEmails.length > 0
//                       }
//                       onChange={toggleSelectAll}
//                       style={styles.checkbox}
//                     />
//                     <span style={styles.selectAllText}>Select All</span>
//                   </div>
//                 )}
//                 {filteredEmails.length === 0 ? (
//                   <div style={styles.emptyState}>
//                     No emails found in this category.
//                   </div>
//                 ) : (
//                   <>
//                     {filteredEmails.map((email) => (
//                       <div
//                         key={email._id}
//                         style={{
//                           ...styles.emailItem,
//                           ...(selectedEmail?._id === email._id
//                             ? styles.emailItemActive
//                             : {}),
//                           ...(selectedEmails.includes(email.messageId)
//                             ? styles.emailItemSelected
//                             : {}),
//                         }}
//                         onClick={() => openEmail(email)}
//                       >
//                         <div style={styles.emailItemHeader}>
//                           <div
//                             style={{
//                               display: "flex",
//                               alignItems: "center",
//                               gap: "8px",
//                             }}
//                           >
//                             <input
//                               type="checkbox"
//                               checked={selectedEmails.includes(email.messageId)}
//                               onChange={(e) =>
//                                 toggleEmailSelection(email.messageId, e)
//                               }
//                               onClick={(e) => e.stopPropagation()}
//                               style={styles.checkbox}
//                             />
//                             <button
//                               style={styles.iconActionButton}
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 markStarStatus(email, !email.isStarred);
//                               }}
//                               title={email.isStarred ? "Unstar" : "Star"}
//                             >
//                               <Star
//                                 size={14}
//                                 color={email.isStarred ? "#f59e0b" : "#9ca3af"}
//                                 fill={email.isStarred ? "#f59e0b" : "none"}
//                               />
//                             </button>
//                             <span
//                               style={{
//                                 ...styles.emailFrom,
//                                 ...(email.isRead ? {} : styles.unreadText),
//                               }}
//                             >
//                               {email.from?.split("<")[0] || email.from}
//                             </span>
//                           </div>
//                           <span style={styles.emailDate}>
//                             {new Date(email.createdAt).toLocaleDateString()}
//                           </span>
//                         </div>
//                         <div
//                           style={{
//                             ...styles.emailSubject,
//                             ...(email.isRead ? {} : styles.unreadText),
//                           }}
//                         >
//                           {email.category &&
//                             email.category !== "Uncategorized" && (
//                               <span style={styles.categoryTag}>
//                                 {email.category}
//                               </span>
//                             )}
//                           {email.subject}
//                         </div>
//                         <div style={styles.emailSnippet}>
//                           {(email.snippet || email.body || "")
//                             ?.substring(0, 100)
//                             .replace(/<[^>]*>/g, "")}
//                           ...
//                         </div>
//                       </div>
//                     ))}
//                     {isLoadingMore && (
//                       <div style={{ ...styles.emptyState, padding: "20px" }}>
//                         <RefreshCw size={16} className="spin" />
//                       </div>
//                     )}
//                     {!hasMore && emails.length > 0 && (
//                       <div style={{ ...styles.emptyState, padding: "20px" }}>
//                         End of inbox
//                       </div>
//                     )}
//                   </>
//                 )}
//               </div>
//             </section>

//             {/* EMAIL DETAIL */}
//             <section style={styles.detailSection}>
//               {selectedEmail ? (
//                 <div style={styles.detailContainer}>
//                   <div style={styles.detailHeader}>
//                     <div
//                       style={{
//                         display: "flex",
//                         justifyContent: "space-between",
//                         alignItems: "flex-start",
//                       }}
//                     >
//                       <h1 style={styles.detailSubject}>
//                         {selectedEmail.subject}
//                       </h1>
//                       <div style={{ display: "flex", gap: "8px" }}>
//                         <button
//                           style={styles.toggleTextButton}
//                           onClick={() =>
//                             markReadStatus(selectedEmail, !selectedEmail.isRead)
//                           }
//                         >
//                           Mark as {selectedEmail.isRead ? "Unread" : "Read"}
//                         </button>
//                         <button
//                           style={styles.toggleTextButton}
//                           onClick={() =>
//                             markStarStatus(
//                               selectedEmail,
//                               !selectedEmail.isStarred,
//                             )
//                           }
//                         >
//                           {selectedEmail.isStarred ? "Unstar" : "Star"}
//                         </button>
//                         {selectedEmail.from?.includes(userEmail) && (
//                           <button
//                             style={styles.resendButton}
//                             onClick={() => {
//                               setComposeData({
//                                 to: selectedEmail.to || "",
//                                 subject: selectedEmail.subject,
//                                 body: selectedEmail.body,
//                               });
//                               setShowCompose(true);
//                             }}
//                           >
//                             <RefreshCw size={14} />
//                             Resend
//                           </button>
//                         )}
//                         {selectedEmail.html && (
//                           <button
//                             style={styles.toggleTextButton}
//                             onClick={() => setShowPlainText(!showPlainText)}
//                           >
//                             {showPlainText
//                               ? "Show Rich View"
//                               : "Show Plain Text"}
//                           </button>
//                         )}
//                       </div>
//                     </div>
//                     <div style={styles.detailMeta}>
//                       <div style={styles.metaRow}>
//                         <span style={styles.metaLabel}>From:</span>
//                         <span style={styles.metaValue}>
//                           {selectedEmail.from}
//                         </span>
//                       </div>
//                       <div style={styles.metaRow}>
//                         <span style={styles.metaLabel}>Date:</span>
//                         <span style={styles.metaValue}>
//                           {new Date(selectedEmail.createdAt).toLocaleString()}
//                         </span>
//                       </div>
//                     </div>
//                   </div>

//                   {threadEmails.length > 1 && (
//                     <div style={styles.threadSection}>
//                       <div style={styles.threadHeader}>
//                         Conversation ({threadEmails.length} messages)
//                       </div>
//                       <div style={styles.threadList}>
//                         {threadEmails.map((threadMail) => (
//                           <button
//                             key={threadMail.messageId}
//                             style={{
//                               ...styles.threadItem,
//                               ...(selectedEmail.messageId ===
//                               threadMail.messageId
//                                 ? styles.threadItemActive
//                                 : {}),
//                             }}
//                             onClick={() => setSelectedEmail(threadMail)}
//                           >
//                             <span style={styles.threadFrom}>
//                               {threadMail.from?.split("<")[0] ||
//                                 threadMail.from}
//                             </span>
//                             <span style={styles.threadDate}>
//                               {new Date(threadMail.createdAt).toLocaleString()}
//                             </span>
//                           </button>
//                         ))}
//                       </div>
//                     </div>
//                   )}

//                   <div style={styles.detailBody}>
//                     {selectedEmail.html && !showPlainText ? (
//                       <iframe
//                         title="Email Content"
//                         srcDoc={`
//                       <!DOCTYPE html>
//                       <html>
//                         <head>
//                           <meta charset="UTF-8">
//                           <style>
//                             body {
//                               font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
//                               line-height: 1.6;
//                               color: #27272a;
//                               margin: 0;
//                               padding: 20px;
//                             }
//                             img { max-width: 100%; height: auto; display: block; }
//                             a { color: #8b5cf6; }
//                             * { box-sizing: border-box; }
//                           </style>
//                         </head>
//                         <body>${sanitizeEmailHtml(selectedEmail.html)}</body>
//                       </html>
//                     `}
//                         style={styles.iframe}
//                         onLoad={(e) => {
//                           const iframe = e.target;
//                           try {
//                             const height =
//                               iframe.contentWindow.document.documentElement
//                                 .scrollHeight;
//                             iframe.style.height = height + 50 + "px";
//                           } catch (err) {
//                             console.error(
//                               "Iframe height adjustment failed:",
//                               err,
//                             );
//                             iframe.style.height = "800px";
//                           }
//                         }}
//                       />
//                     ) : (
//                       <div
//                         style={{
//                           whiteSpace: "pre-wrap",
//                           padding: "20px",
//                           backgroundColor: "#f9fafb",
//                           borderRadius: "8px",
//                           fontSize: "14px",
//                         }}
//                       >
//                         {selectedEmail.body}
//                       </div>
//                     )}
//                   </div>

//                   {selectedEmail.attachments &&
//                     selectedEmail.attachments.length > 0 && (
//                       <div style={styles.attachmentsSection}>
//                         <div style={styles.attachmentsHeader}>
//                           <ChevronRight size={16} />
//                           <span>
//                             Attachments ({selectedEmail.attachments.length})
//                           </span>
//                         </div>
//                         <div style={styles.attachmentsList}>
//                           {selectedEmail.attachments.map((att) => (
//                             <div
//                               key={att.attachmentId}
//                               style={styles.attachmentItem}
//                               onClick={() =>
//                                 downloadAttachment(
//                                   selectedEmail.messageId,
//                                   att.attachmentId,
//                                   att.filename,
//                                 )
//                               }
//                             >
//                               <Mail size={14} />
//                               <span style={styles.attachmentName}>
//                                 {att.filename}
//                               </span>
//                               <span style={styles.attachmentSize}>
//                                 ({(att.size / 1024).toFixed(1)} KB)
//                               </span>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     )}

//                   <div style={styles.aiReplySection}>
//                     <div style={styles.aiReplyHeader}>
//                       <div
//                         style={{
//                           display: "flex",
//                           alignItems: "center",
//                           gap: 8,
//                         }}
//                       >
//                         <MessageSquareText size={18} color="#8b5cf6" />
//                         <span style={{ fontWeight: 600 }}>AI Smart Reply</span>
//                       </div>
//                       <div style={styles.toneSelector}>
//                         <select
//                           value={replyTone}
//                           onChange={(e) => setReplyTone(e.target.value)}
//                           style={styles.select}
//                         >
//                           <option value="formal">Formal</option>
//                           <option value="casual">Casual</option>
//                           <option value="short">Short</option>
//                           <option value="detailed">Detailed</option>
//                         </select>
//                         <button
//                           style={styles.generateButton}
//                           onClick={generateReply}
//                           disabled={isGeneratingReply}
//                         >
//                           {isGeneratingReply ? "Generating..." : "Generate"}
//                         </button>
//                       </div>
//                     </div>

//                     {aiReply && (
//                       <div style={styles.aiReplyContent}>
//                         <div style={styles.replyDraftHeader}>Draft Reply</div>
//                         <pre style={styles.replyText}>{aiReply.reply}</pre>
//                         <div style={styles.replyActions}>
//                           <button
//                             style={styles.copyButton}
//                             onClick={() =>
//                               navigator.clipboard.writeText(aiReply.reply)
//                             }
//                           >
//                             Copy to Clipboard
//                           </button>
//                           <button
//                             style={styles.copyButton}
//                             onClick={() =>
//                               saveDraft(
//                                 aiReply.replyTo,
//                                 aiReply.subject,
//                                 aiReply.reply,
//                               )
//                             }
//                             disabled={isSavingDraft}
//                           >
//                             {isSavingDraft ? "Saving..." : "Save as Draft"}
//                           </button>
//                           <button
//                             style={styles.sendButton}
//                             onClick={() =>
//                               sendEmail(
//                                 aiReply.replyTo,
//                                 aiReply.subject,
//                                 aiReply.reply,
//                               )
//                             }
//                             disabled={isSendingEmail}
//                           >
//                             <Send size={14} />
//                             {isSendingEmail ? "Sending..." : "Send Reply"}
//                           </button>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               ) : (
//                 <div style={styles.detailPlaceholder}>
//                   <Mail size={48} color="#e4e4e7" />
//                   <p>Select an email to view details</p>
//                 </div>
//               )}
//             </section>
//           </>
//         ) : (
//           <section style={styles.searchViewSection}>
//             <div
//               style={{
//                 ...styles.searchContainer,
//                 ...(searchResults.length > 0
//                   ? styles.searchContainerResults
//                   : {}),
//               }}
//             >
//               <h1 style={styles.searchViewTitle}>Semantic Search</h1>
//               <div style={styles.searchBarLarge}>
//                 <Search size={20} style={styles.searchIcon} />
//                 <input
//                   ref={searchInputRef}
//                   type="text"
//                   placeholder="Ask anything about your emails..."
//                   style={styles.searchInputLarge}
//                   value={query}
//                   onChange={(e) => setQuery(e.target.value)}
//                   onKeyPress={(e) => e.key === "Enter" && askInbox()}
//                 />
//                 <button
//                   style={styles.searchViewButton}
//                   onClick={askInbox}
//                   disabled={isSearching}
//                 >
//                   {isSearching ? (
//                     <RefreshCw size={18} className="spin" />
//                   ) : (
//                     "Search"
//                   )}
//                 </button>
//               </div>
//             </div>

//             {aiAnswer && (
//               <div style={styles.aiAnswerLarge}>
//                 <div style={styles.aiAnswerHeader}>
//                   <Sparkles size={18} color="#8b5cf6" />
//                   <span style={{ fontSize: "16px" }}>InboxIQ Answer</span>
//                 </div>
//                 <p style={styles.aiAnswerTextLarge}>{aiAnswer}</p>
//               </div>
//             )}

//             <div style={styles.searchResultsGrid}>
//               {searchResults.map((email) => (
//                 <div key={email._id} style={styles.searchResultCard}>
//                   <div style={styles.searchResultHeader}>
//                     <div style={styles.searchResultMeta}>
//                       <span style={styles.searchResultFrom}>
//                         {email.from?.split("<")[0] || email.from}
//                       </span>
//                       <span style={styles.searchResultDate}>
//                         {new Date(email.createdAt).toLocaleDateString()}
//                       </span>
//                     </div>
//                     <h3 style={styles.searchResultSubject}>{email.subject}</h3>
//                   </div>
//                   <p style={styles.searchResultSnippet}>
//                     {email.body?.substring(0, 200).replace(/<[^>]*>/g, "")}...
//                   </p>
//                   <div style={styles.searchResultActions}>
//                     <button
//                       style={styles.viewEmailButton}
//                       onClick={() => {
//                         setSelectedEmail(email);
//                         setView("inbox");
//                       }}
//                     >
//                       View Full Email
//                     </button>
//                     <button
//                       style={styles.replySearchButton}
//                       onClick={() => {
//                         setSelectedEmail(email);
//                         setView("inbox");
//                         setTimeout(() => generateReply(), 500);
//                       }}
//                     >
//                       AI Reply
//                     </button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </section>
//         )}
//       </main>

//       {/* COMPOSE MODAL */}
//       {showCompose && (
//         <div style={styles.modalOverlay}>
//           <div style={styles.modalContent}>
//             <div style={styles.modalHeader}>
//               <h3 style={styles.modalTitle}>New Message</h3>
//               <button
//                 style={styles.closeModal}
//                 onClick={() => setShowCompose(false)}
//               >
//                 ✕
//               </button>
//             </div>
//             <div style={styles.modalBody}>
//               <input
//                 type="text"
//                 placeholder="To"
//                 style={styles.modalInput}
//                 value={composeData.to}
//                 onChange={(e) =>
//                   setComposeData({ ...composeData, to: e.target.value })
//                 }
//               />
//               <input
//                 type="text"
//                 placeholder="Subject"
//                 style={styles.modalInput}
//                 value={composeData.subject}
//                 onChange={(e) =>
//                   setComposeData({ ...composeData, subject: e.target.value })
//                 }
//               />
//               <textarea
//                 placeholder="Message..."
//                 style={styles.modalTextarea}
//                 value={composeData.body}
//                 onChange={(e) =>
//                   setComposeData({ ...composeData, body: e.target.value })
//                 }
//               />
//             </div>
//             <div style={styles.modalFooter}>
//               <button
//                 style={{ ...styles.copyButton, marginRight: "auto" }}
//                 onClick={() =>
//                   saveDraft(
//                     composeData.to,
//                     composeData.subject,
//                     composeData.body,
//                   )
//                 }
//                 disabled={isSavingDraft}
//               >
//                 {isSavingDraft ? "Saving..." : "Save as Draft"}
//               </button>
//               <button
//                 style={styles.modalSendButton}
//                 onClick={() =>
//                   sendEmail(
//                     composeData.to,
//                     composeData.subject,
//                     composeData.body,
//                   )
//                 }
//                 disabled={isSendingEmail}
//               >
//                 {isSendingEmail ? "Sending..." : "Send"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       <style>{`
//         @keyframes spin {
//           from { transform: rotate(0deg); }
//           to { transform: rotate(360deg); }
//         }
//         .spin {
//           animation: spin 1s linear infinite;
//         }
//       `}</style>
//     </div>
//   );
// }

// const styles = {
//   container: {
//     display: "flex",
//     height: "100vh",
//     width: "100vw",
//     backgroundColor: "#ffffff",
//     color: "#18181b",
//     fontFamily: "'Inter', -apple-system, sans-serif",
//     overflow: "hidden",
//   },
//   sidebar: {
//     width: "240px",
//     backgroundColor: "#f9fafb",
//     borderRight: "1px solid #e5e7eb",
//     display: "flex",
//     flexDirection: "column",
//     padding: "16px",
//   },
//   sidebarHeader: {
//     marginBottom: "24px",
//     padding: "0 8px",
//   },
//   logo: {
//     fontSize: "18px",
//     fontWeight: "bold",
//     color: "#18181b",
//     letterSpacing: "-0.02em",
//   },
//   nav: {
//     flex: 1,
//   },
//   composeButton: {
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: "10px",
//     padding: "12px",
//     backgroundColor: "#18181b",
//     color: "white",
//     borderRadius: "12px",
//     fontSize: "14px",
//     fontWeight: "600",
//     cursor: "pointer",
//     marginBottom: "24px",
//     transition: "all 0.2s",
//     boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
//   },
//   navItem: {
//     display: "flex",
//     alignItems: "center",
//     gap: "12px",
//     padding: "10px 12px",
//     borderRadius: "8px",
//     fontSize: "14px",
//     fontWeight: "500",
//     color: "#4b5563",
//     cursor: "pointer",
//     transition: "all 0.2s",
//     marginBottom: "4px",
//     background: "none",
//     border: "none",
//   },
//   navItemActive: {
//     backgroundColor: "#f3f4f6",
//     color: "#18181b",
//     fontWeight: "600",
//   },
//   sidebarFooter: {
//     marginTop: "auto",
//   },
//   syncButton: {
//     width: "100%",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: "8px",
//     padding: "10px",
//     backgroundColor: "white",
//     border: "1px solid #e5e7eb",
//     borderRadius: "8px",
//     fontSize: "13px",
//     fontWeight: "600",
//     cursor: "pointer",
//     marginBottom: "16px",
//     transition: "all 0.2s",
//   },
//   userProfile: {
//     display: "flex",
//     alignItems: "center",
//     gap: "10px",
//     padding: "12px 8px",
//     borderTop: "1px solid #e5e7eb",
//   },
//   userAvatar: {
//     width: "32px",
//     height: "32px",
//     borderRadius: "50%",
//     backgroundColor: "#e5e7eb",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   userInfo: {
//     flex: 1,
//   },
//   userName: {
//     fontSize: "13px",
//     fontWeight: "600",
//   },
//   userStatus: {
//     fontSize: "11px",
//     color: "#10b981",
//   },
//   logoutIcon: {
//     color: "#9ca3af",
//     cursor: "pointer",
//   },
//   main: {
//     flex: 1,
//     display: "flex",
//     overflow: "hidden",
//   },
//   listSection: {
//     width: "380px",
//     borderRight: "1px solid #e5e7eb",
//     display: "flex",
//     flexDirection: "column",
//     backgroundColor: "white",
//   },
//   sectionHeader: {
//     padding: "20px",
//     borderBottom: "1px solid #f3f4f6",
//   },
//   sectionTitle: {
//     fontSize: "20px",
//     fontWeight: "700",
//     margin: "0 0 16px 0",
//   },
//   searchBar: {
//     position: "relative",
//     display: "flex",
//     alignItems: "center",
//     backgroundColor: "#f3f4f6",
//     borderRadius: "8px",
//     padding: "0 10px",
//   },
//   searchIcon: {
//     color: "#9ca3af",
//   },
//   searchInput: {
//     flex: 1,
//     border: "none",
//     backgroundColor: "transparent",
//     padding: "10px",
//     fontSize: "13px",
//     outline: "none",
//   },
//   aiAnswerCard: {
//     margin: "12px 20px",
//     padding: "12px",
//     backgroundColor: "#f5f3ff",
//     border: "1px solid #ddd6fe",
//     borderRadius: "10px",
//     position: "relative",
//   },
//   aiAnswerHeader: {
//     display: "flex",
//     alignItems: "center",
//     gap: "6px",
//     fontSize: "12px",
//     fontWeight: "700",
//     color: "#7c3aed",
//     marginBottom: "6px",
//   },
//   aiAnswerText: {
//     fontSize: "13px",
//     lineHeight: "1.5",
//     color: "#4c1d95",
//     margin: 0,
//   },
//   closeAiAnswer: {
//     marginTop: "8px",
//     fontSize: "11px",
//     color: "#7c3aed",
//     background: "none",
//     border: "none",
//     padding: 0,
//     cursor: "pointer",
//     fontWeight: "600",
//   },
//   emailList: {
//     flex: 1,
//     overflowY: "auto",
//   },
//   emailItem: {
//     padding: "16px 20px",
//     borderBottom: "1px solid #f3f4f6",
//     cursor: "pointer",
//     transition: "background-color 0.2s",
//   },
//   emailItemActive: {
//     backgroundColor: "#f8fafc",
//     borderLeft: "3px solid #18181b",
//   },
//   emailItemHeader: {
//     display: "flex",
//     justifyContent: "space-between",
//     marginBottom: "4px",
//   },
//   emailFrom: {
//     fontSize: "13px",
//     fontWeight: "600",
//     color: "#18181b",
//   },
//   unreadText: {
//     fontWeight: "700",
//     color: "#111827",
//   },
//   iconActionButton: {
//     display: "inline-flex",
//     alignItems: "center",
//     justifyContent: "center",
//     background: "none",
//     border: "none",
//     cursor: "pointer",
//     padding: 0,
//   },
//   emailDate: {
//     fontSize: "11px",
//     color: "#9ca3af",
//   },
//   emailSubject: {
//     fontSize: "13px",
//     fontWeight: "500",
//     color: "#3f3f46",
//     marginBottom: "4px",
//     whiteSpace: "nowrap",
//     overflow: "hidden",
//     textOverflow: "ellipsis",
//   },
//   emailSnippet: {
//     fontSize: "12px",
//     color: "#71717a",
//     lineHeight: "1.4",
//   },
//   emptyState: {
//     padding: "40px",
//     textAlign: "center",
//     color: "#9ca3af",
//     fontSize: "14px",
//   },
//   detailSection: {
//     flex: 1,
//     backgroundColor: "white",
//     display: "flex",
//     flexDirection: "column",
//     overflowY: "auto",
//   },
//   detailPlaceholder: {
//     flex: 1,
//     display: "flex",
//     flexDirection: "column",
//     alignItems: "center",
//     justifyContent: "center",
//     color: "#9ca3af",
//     gap: "12px",
//   },
//   detailContainer: {
//     padding: "40px",
//     maxWidth: "800px",
//     margin: "0 auto",
//     width: "100%",
//   },
//   detailHeader: {
//     marginBottom: "32px",
//     borderBottom: "1px solid #f3f4f6",
//     paddingBottom: "24px",
//   },
//   detailSubject: {
//     fontSize: "28px",
//     fontWeight: "800",
//     margin: "0 0 20px 0",
//     letterSpacing: "-0.02em",
//     flex: 1,
//   },
//   toggleTextButton: {
//     padding: "6px 12px",
//     backgroundColor: "white",
//     border: "1px solid #e5e7eb",
//     borderRadius: "6px",
//     fontSize: "12px",
//     fontWeight: "600",
//     cursor: "pointer",
//     marginLeft: "16px",
//   },
//   resendButton: {
//     padding: "6px 12px",
//     backgroundColor: "#18181b",
//     color: "white",
//     border: "none",
//     borderRadius: "6px",
//     fontSize: "12px",
//     fontWeight: "600",
//     cursor: "pointer",
//     marginLeft: "12px",
//     display: "flex",
//     alignItems: "center",
//     gap: "6px",
//   },
//   bulkActionBar: {
//     display: "flex",
//     alignItems: "center",
//     gap: "12px",
//     backgroundColor: "#f3f4f6",
//     padding: "6px 12px",
//     borderRadius: "8px",
//   },
//   bulkActionText: {
//     fontSize: "12px",
//     fontWeight: "600",
//     color: "#4b5563",
//   },
//   bulkActionButton: {
//     background: "none",
//     border: "none",
//     fontSize: "12px",
//     fontWeight: "700",
//     color: "#18181b",
//     cursor: "pointer",
//     padding: "4px 8px",
//   },
//   categoryFilters: {
//     display: "flex",
//     gap: "8px",
//     padding: "0 20px 16px 20px",
//     borderBottom: "1px solid #f3f4f6",
//     overflowX: "auto",
//   },
//   categoryBtn: {
//     padding: "6px 12px",
//     borderRadius: "20px",
//     fontSize: "12px",
//     fontWeight: "600",
//     color: "#6b7280",
//     backgroundColor: "#f3f4f6",
//     border: "none",
//     cursor: "pointer",
//     whiteSpace: "nowrap",
//     transition: "all 0.2s",
//   },
//   categoryBtnActive: {
//     backgroundColor: "#18181b",
//     color: "white",
//   },
//   categoryTag: {
//     fontSize: "10px",
//     fontWeight: "700",
//     textTransform: "uppercase",
//     padding: "2px 6px",
//     borderRadius: "4px",
//     backgroundColor: "#e5e7eb",
//     color: "#4b5563",
//     marginRight: "8px",
//     display: "inline-block",
//   },
//   selectAllContainer: {
//     padding: "12px 20px",
//     display: "flex",
//     alignItems: "center",
//     gap: "10px",
//     borderBottom: "1px solid #f3f4f6",
//     backgroundColor: "#f9fafb",
//   },
//   selectAllText: {
//     fontSize: "12px",
//     fontWeight: "600",
//     color: "#6b7280",
//   },
//   checkbox: {
//     width: "16px",
//     height: "16px",
//     cursor: "pointer",
//   },
//   emailItemSelected: {
//     backgroundColor: "#f0f9ff",
//   },
//   detailMeta: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "8px",
//   },
//   metaRow: {
//     display: "flex",
//     gap: "8px",
//     fontSize: "13px",
//   },
//   metaLabel: {
//     color: "#71717a",
//     width: "45px",
//   },
//   metaValue: {
//     color: "#18181b",
//     fontWeight: "500",
//   },
//   detailBody: {
//     fontSize: "15px",
//     lineHeight: "1.6",
//     color: "#27272a",
//     marginBottom: "40px",
//   },
//   threadSection: {
//     marginBottom: "20px",
//     padding: "12px",
//     border: "1px solid #e5e7eb",
//     borderRadius: "10px",
//     backgroundColor: "#fafafa",
//   },
//   threadHeader: {
//     fontSize: "12px",
//     fontWeight: "700",
//     color: "#4b5563",
//     marginBottom: "8px",
//   },
//   threadList: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "6px",
//   },
//   threadItem: {
//     border: "1px solid #e5e7eb",
//     backgroundColor: "white",
//     borderRadius: "8px",
//     padding: "8px 10px",
//     textAlign: "left",
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     cursor: "pointer",
//   },
//   threadItemActive: {
//     border: "1px solid #18181b",
//     backgroundColor: "#f3f4f6",
//   },
//   threadFrom: {
//     fontSize: "12px",
//     color: "#111827",
//     fontWeight: "600",
//   },
//   threadDate: {
//     fontSize: "11px",
//     color: "#6b7280",
//   },
//   iframe: {
//     width: "100%",
//     border: "none",
//     overflow: "hidden",
//   },
//   attachmentsSection: {
//     margin: "20px 0",
//     padding: "16px",
//     backgroundColor: "#f9fafb",
//     borderRadius: "12px",
//     border: "1px solid #e5e7eb",
//   },
//   attachmentsHeader: {
//     display: "flex",
//     alignItems: "center",
//     gap: "8px",
//     fontSize: "13px",
//     fontWeight: "600",
//     color: "#4b5563",
//     marginBottom: "12px",
//   },
//   attachmentsList: {
//     display: "flex",
//     flexWrap: "wrap",
//     gap: "10px",
//   },
//   attachmentItem: {
//     display: "flex",
//     alignItems: "center",
//     gap: "8px",
//     padding: "8px 12px",
//     backgroundColor: "white",
//     border: "1px solid #e5e7eb",
//     borderRadius: "8px",
//     fontSize: "12px",
//     cursor: "pointer",
//     transition: "all 0.2s",
//   },
//   attachmentName: {
//     fontWeight: "500",
//     color: "#18181b",
//     maxWidth: "150px",
//     whiteSpace: "nowrap",
//     overflow: "hidden",
//     textOverflow: "ellipsis",
//   },
//   attachmentSize: {
//     color: "#9ca3af",
//   },
//   aiReplySection: {
//     border: "1px solid #e5e7eb",
//     borderRadius: "12px",
//     overflow: "hidden",
//   },
//   aiReplyHeader: {
//     padding: "16px",
//     backgroundColor: "#f9fafb",
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     borderBottom: "1px solid #e5e7eb",
//   },
//   toneSelector: {
//     display: "flex",
//     gap: "8px",
//   },
//   select: {
//     padding: "6px 10px",
//     borderRadius: "6px",
//     border: "1px solid #d1d5db",
//     fontSize: "12px",
//     backgroundColor: "white",
//   },
//   generateButton: {
//     padding: "6px 12px",
//     backgroundColor: "#18181b",
//     color: "white",
//     border: "none",
//     borderRadius: "6px",
//     fontSize: "12px",
//     fontWeight: "600",
//     cursor: "pointer",
//   },
//   aiReplyContent: {
//     padding: "20px",
//   },
//   replyDraftHeader: {
//     fontSize: "11px",
//     fontWeight: "700",
//     color: "#9ca3af",
//     textTransform: "uppercase",
//     marginBottom: "12px",
//     letterSpacing: "0.05em",
//   },
//   replyText: {
//     fontSize: "14px",
//     lineHeight: "1.6",
//     color: "#18181b",
//     backgroundColor: "#fdfdfd",
//     padding: "16px",
//     borderRadius: "8px",
//     border: "1px solid #f3f4f6",
//     margin: "0 0 20px 0",
//     fontFamily: "inherit",
//     whiteSpace: "pre-wrap",
//   },
//   replyActions: {
//     display: "flex",
//     justifyContent: "flex-end",
//     gap: "12px",
//   },
//   copyButton: {
//     padding: "8px 16px",
//     backgroundColor: "white",
//     border: "1px solid #e5e7eb",
//     borderRadius: "6px",
//     fontSize: "13px",
//     fontWeight: "600",
//     cursor: "pointer",
//   },
//   sendButton: {
//     display: "flex",
//     alignItems: "center",
//     gap: "8px",
//     padding: "8px 16px",
//     backgroundColor: "#8b5cf6",
//     color: "white",
//     border: "none",
//     borderRadius: "6px",
//     fontSize: "13px",
//     fontWeight: "600",
//     cursor: "pointer",
//   },
//   modalOverlay: {
//     position: "fixed",
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: "rgba(0, 0, 0, 0.5)",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     zIndex: 1000,
//   },
//   modalContent: {
//     backgroundColor: "white",
//     width: "100%",
//     maxWidth: "500px",
//     borderRadius: "12px",
//     display: "flex",
//     flexDirection: "column",
//     boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
//   },
//   modalHeader: {
//     padding: "16px 20px",
//     borderBottom: "1px solid #e5e7eb",
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   modalTitle: {
//     margin: 0,
//     fontSize: "16px",
//     fontWeight: "600",
//   },
//   closeModal: {
//     background: "none",
//     border: "none",
//     fontSize: "18px",
//     cursor: "pointer",
//     color: "#9ca3af",
//   },
//   modalBody: {
//     padding: "20px",
//     display: "flex",
//     flexDirection: "column",
//     gap: "12px",
//   },
//   modalInput: {
//     padding: "10px",
//     border: "1px solid #e5e7eb",
//     borderRadius: "6px",
//     fontSize: "14px",
//     outline: "none",
//   },
//   modalTextarea: {
//     padding: "10px",
//     border: "1px solid #e5e7eb",
//     borderRadius: "6px",
//     fontSize: "14px",
//     minHeight: "200px",
//     resize: "none",
//     outline: "none",
//     fontFamily: "inherit",
//   },
//   modalFooter: {
//     padding: "16px 20px",
//     borderTop: "1px solid #e5e7eb",
//     display: "flex",
//     justifyContent: "flex-end",
//   },
//   modalSendButton: {
//     padding: "8px 24px",
//     backgroundColor: "#18181b",
//     color: "white",
//     border: "none",
//     borderRadius: "6px",
//     fontSize: "14px",
//     fontWeight: "600",
//     cursor: "pointer",
//   },
//   searchViewSection: {
//     flex: 1,
//     display: "flex",
//     flexDirection: "column",
//     padding: "40px",
//     overflowY: "auto",
//     backgroundColor: "#f9fafb",
//   },
//   searchContainer: {
//     maxWidth: "800px",
//     margin: "100px auto 40px",
//     width: "100%",
//     textAlign: "center",
//     transition: "margin 0.3s ease",
//   },
//   searchContainerResults: {
//     margin: "0 auto 40px",
//   },
//   searchViewTitle: {
//     fontSize: "32px",
//     fontWeight: "800",
//     marginBottom: "24px",
//     color: "#18181b",
//   },
//   searchBarLarge: {
//     display: "flex",
//     alignItems: "center",
//     backgroundColor: "white",
//     borderRadius: "16px",
//     padding: "8px 16px",
//     boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
//     border: "1px solid #e5e7eb",
//   },
//   searchInputLarge: {
//     flex: 1,
//     border: "none",
//     padding: "16px",
//     fontSize: "16px",
//     outline: "none",
//   },
//   searchViewButton: {
//     padding: "12px 24px",
//     backgroundColor: "#8b5cf6",
//     color: "white",
//     border: "none",
//     borderRadius: "10px",
//     fontSize: "15px",
//     fontWeight: "600",
//     cursor: "pointer",
//     transition: "background-color 0.2s",
//   },
//   aiAnswerLarge: {
//     maxWidth: "800px",
//     margin: "0 auto 40px",
//     width: "100%",
//     padding: "24px",
//     backgroundColor: "white",
//     borderRadius: "16px",
//     border: "1px solid #ddd6fe",
//     boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
//   },
//   aiAnswerTextLarge: {
//     fontSize: "15px",
//     lineHeight: "1.7",
//     color: "#1e1b4b",
//     margin: "12px 0 0 0",
//   },
//   searchResultsGrid: {
//     maxWidth: "1000px",
//     margin: "0 auto",
//     display: "grid",
//     gridTemplateColumns: "repeat(auto-fill, minmax(450px, 1fr))",
//     gap: "24px",
//     paddingBottom: "40px",
//   },
//   searchResultCard: {
//     backgroundColor: "white",
//     padding: "24px",
//     borderRadius: "16px",
//     border: "1px solid #e5e7eb",
//     display: "flex",
//     flexDirection: "column",
//     gap: "16px",
//     boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
//     transition: "transform 0.2s",
//   },
//   searchResultHeader: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "8px",
//   },
//   searchResultMeta: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   searchResultFrom: {
//     fontSize: "13px",
//     fontWeight: "600",
//     color: "#8b5cf6",
//   },
//   searchResultDate: {
//     fontSize: "12px",
//     color: "#9ca3af",
//   },
//   searchResultSubject: {
//     fontSize: "18px",
//     fontWeight: "700",
//     margin: 0,
//     color: "#18181b",
//   },
//   searchResultSnippet: {
//     fontSize: "14px",
//     lineHeight: "1.5",
//     color: "#4b5563",
//     margin: 0,
//   },
//   searchResultActions: {
//     marginTop: "auto",
//     display: "flex",
//     gap: "12px",
//   },
//   viewEmailButton: {
//     flex: 1,
//     padding: "10px",
//     backgroundColor: "#f3f4f6",
//     color: "#18181b",
//     border: "none",
//     borderRadius: "8px",
//     fontSize: "13px",
//     fontWeight: "600",
//     cursor: "pointer",
//   },
//   replySearchButton: {
//     flex: 1,
//     padding: "10px",
//     backgroundColor: "#18181b",
//     color: "white",
//     border: "none",
//     borderRadius: "8px",
//     fontSize: "13px",
//     fontWeight: "600",
//     cursor: "pointer",
//   },
// };

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
  Star,
  ChevronRight,
  MessageSquareText,
  Sparkles,
  X,
  Paperclip,
  Archive,
  Trash2,
  RotateCcw,
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
  const [_isSearchFocused, setIsSearchFocused] = useState(false);
  const [view, setView] = useState("inbox");
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
  const [threadEmails, setThreadEmails] = useState([]);

  const sanitizeEmailHtml = (html) => {
    if (!html) return "";
    return String(html).replace(/<meta\b[^>]*>/gi, "");
  };

  const searchInputRef = useRef(null);
  const [userEmail] = useState(localStorage.getItem("email"));
  const [token] = useState(localStorage.getItem("token"));

  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

  const fetchEmails = useCallback(
    async (pageNum = 1, shouldAppend = false) => {
      if (!userEmail || !token) return;
      if (shouldAppend) setIsLoadingMore(true);
      try {
        const res = await axios.get(
          `${API_BASE_URL}/email/list/${userEmail}?page=${pageNum}&limit=20`,
          axiosConfig,
        );
        setHasMore(res.data.length >= 20);
        if (shouldAppend) {
          setEmails((prev) => {
            const combined = [...prev, ...res.data];
            return combined.filter(
              (e, i, s) => i === s.findIndex((x) => x._id === e._id),
            );
          });
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
    if (scrollHeight - scrollTop <= clientHeight + 100) loadMoreEmails();
  };

  const askInbox = async () => {
    if (!query || !userEmail || !token) return;
    setIsSearching(true);
    setAiAnswer("");
    setSearchResults([]);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/email/ask`,
        { email: userEmail, question: query },
        axiosConfig,
      );
      setAiAnswer(res.data.answer);
      const uniqueResults = (res.data.matchedEmails || []).filter(
        (email, index, self) =>
          index === self.findIndex((e) => e._id === email._id),
      );
      setSearchResults(uniqueResults);
    } catch (err) {
      console.error("Ask failed", err);
      alert("Something went wrong. Please try again.");
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
        { messageId: selectedEmail.messageId, tone: replyTone },
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
        { email: userEmail, to, subject, body },
        axiosConfig,
      );
      alert("Email sent successfully!");
      setShowCompose(false);
      setComposeData({ to: "", subject: "", body: "" });
      fetchEmails(1, false);
    } catch (err) {
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
        { email: userEmail, to, subject, body },
        axiosConfig,
      );
      alert("Draft saved to Gmail!");
      setShowCompose(false);
      setComposeData({ to: "", subject: "", body: "" });
    } catch (err) {
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
      const base64Data = res.data.data.replace(/-/g, "+").replace(/_/g, "/");
      const binaryData = atob(base64Data);
      const arrayBuffer = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++)
        arrayBuffer[i] = binaryData.charCodeAt(i);
      const blob = new Blob([arrayBuffer]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download attachment.");
    }
  };

  const fetchThread = async (threadId) => {
    if (!threadId || !userEmail || !token) return;
    try {
      const res = await axios.get(
        `${API_BASE_URL}/email/thread/${threadId}?email=${encodeURIComponent(userEmail)}`,
        axiosConfig,
      );
      const uniqueThread = (res.data || []).filter(
        (email, index, self) =>
          index === self.findIndex((e) => e._id === email._id),
      );
      setThreadEmails(uniqueThread);
    } catch (err) {
      console.error("Fetch thread failed", err);
      setThreadEmails([]);
    }
  };

  const openEmail = (email) => {
    setSelectedEmail(email);
    setAiReply(null);
    fetchThread(email.threadId);
  };

  const markReadStatus = async (email, isRead) => {
    if (!userEmail || !token || !email?.messageId) return;
    try {
      await axios.post(
        `${API_BASE_URL}/email/mark-read`,
        { email: userEmail, messageId: email.messageId, isRead },
        axiosConfig,
      );
      setEmails((prev) =>
        prev.map((item) =>
          item.messageId === email.messageId ? { ...item, isRead } : item,
        ),
      );
      if (selectedEmail?.messageId === email.messageId)
        setSelectedEmail((prev) => ({ ...prev, isRead }));
      setThreadEmails((prev) =>
        prev.map((item) =>
          item.messageId === email.messageId ? { ...item, isRead } : item,
        ),
      );
    } catch (err) {
      console.error("Mark read failed", err);
    }
  };

  const markStarStatus = async (email, isStarred) => {
    if (!userEmail || !token || !email?.messageId) return;
    try {
      await axios.post(
        `${API_BASE_URL}/email/mark-star`,
        { email: userEmail, messageId: email.messageId, isStarred },
        axiosConfig,
      );
      setEmails((prev) =>
        prev.map((item) =>
          item.messageId === email.messageId ? { ...item, isStarred } : item,
        ),
      );
      if (selectedEmail?.messageId === email.messageId)
        setSelectedEmail((prev) => ({ ...prev, isStarred }));
      setThreadEmails((prev) =>
        prev.map((item) =>
          item.messageId === email.messageId ? { ...item, isStarred } : item,
        ),
      );
    } catch (err) {
      console.error("Mark star failed", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    window.location.href = "/login";
  };

  const filteredEmails = emails.filter((e) => {
    const labelIds = e.labelIds || [];
    const isInInbox = labelIds.includes("INBOX");
    const isInTrash = labelIds.includes("TRASH");

    if (view === "inbox") {
      // Inbox: not sent, in INBOX label, not trash
      if (e.isSent || !isInInbox || isInTrash) return false;
    } else if (view === "sent") {
      if (!e.isSent || isInTrash) return false;
    } else if (view === "archive") {
      // Archived: not in inbox, not trash, not sent (removed INBOX label)
      if (isInInbox || isInTrash || e.isSent) return false;
    } else if (view === "bin") {
      // Bin/Trash: has TRASH label
      if (!isInTrash) return false;
    }

    if (view === "archive" || view === "bin") return true;
    if (activeCategory === "All") return true;
    return e.category === activeCategory;
  });

  const handleBulkAction = async (action) => {
    if (!selectedEmails.length || !userEmail || !token) return;
    try {
      await axios.post(
        `${API_BASE_URL}/email/bulk-action`,
        { email: userEmail, action, messageIds: selectedEmails },
        axiosConfig,
      );
      // Update local state based on action
      if (action === "delete") {
        // Move to trash: update labelIds locally
        setEmails((prev) =>
          prev.map((e) =>
            selectedEmails.includes(e.messageId)
              ? { ...e, labelIds: [...(e.labelIds || []).filter((l) => l !== "INBOX"), "TRASH"] }
              : e
          )
        );
      } else if (action === "archive") {
        setEmails((prev) =>
          prev.map((e) =>
            selectedEmails.includes(e.messageId)
              ? { ...e, labelIds: (e.labelIds || []).filter((l) => l !== "INBOX") }
              : e
          )
        );
      } else if (action === "restore") {
        setEmails((prev) =>
          prev.map((e) =>
            selectedEmails.includes(e.messageId)
              ? { ...e, labelIds: [...(e.labelIds || []).filter((l) => l !== "TRASH"), "INBOX"] }
              : e
          )
        );
      }
      setSelectedEmails([]);
      if (selectedEmail && selectedEmails.includes(selectedEmail.messageId))
        setSelectedEmail(null);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || `Failed to ${action} emails.`;
      alert(msg);
    }
  };

  const handleSingleAction = async (action, messageId) => {
    if (!userEmail || !token || !messageId) return;
    try {
      await axios.post(
        `${API_BASE_URL}/email/bulk-action`,
        { email: userEmail, action, messageIds: [messageId] },
        axiosConfig,
      );
      if (action === "delete") {
        setEmails((prev) =>
          prev.map((e) =>
            e.messageId === messageId
              ? { ...e, labelIds: [...(e.labelIds || []).filter((l) => l !== "INBOX"), "TRASH"] }
              : e
          )
        );
      } else if (action === "archive") {
        setEmails((prev) =>
          prev.map((e) =>
            e.messageId === messageId
              ? { ...e, labelIds: (e.labelIds || []).filter((l) => l !== "INBOX") }
              : e
          )
        );
      } else if (action === "restore") {
        setEmails((prev) =>
          prev.map((e) =>
            e.messageId === messageId
              ? { ...e, labelIds: [...(e.labelIds || []).filter((l) => l !== "TRASH"), "INBOX"] }
              : e
          )
        );
      }
      setSelectedEmail(null);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || `Failed to ${action} email.`;
      alert(msg);
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
    if (userEmail && token) fetchEmails();
  }, [fetchEmails, userEmail, token]);

  useEffect(() => {
    if (selectedEmail?.threadId) fetchThread(selectedEmail.threadId);
    else setThreadEmails([]);
  }, [selectedEmail?.threadId]);

  const categoryColors = {
    Important: { bg: "rgba(239,68,68,0.12)", text: "#f87171" },
    Promotions: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
    Social: { bg: "rgba(16,185,129,0.12)", text: "#34d399" },
    Newsletters: { bg: "rgba(245,158,11,0.12)", text: "#fbbf24" },
  };

  return (
    <div style={s.root}>
      {/* ── SIDEBAR ── */}
      <aside style={s.sidebar}>
        <div style={s.sidebarTop}>
          <div style={s.logoRow}>
            <div style={s.logoMark}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect
                  x="1"
                  y="1"
                  width="6"
                  height="6"
                  rx="1.5"
                  fill="#f59e0b"
                />
                <rect
                  x="11"
                  y="1"
                  width="6"
                  height="6"
                  rx="1.5"
                  fill="#f59e0b"
                  opacity="0.5"
                />
                <rect
                  x="1"
                  y="11"
                  width="6"
                  height="6"
                  rx="1.5"
                  fill="#f59e0b"
                  opacity="0.5"
                />
                <rect
                  x="11"
                  y="11"
                  width="6"
                  height="6"
                  rx="1.5"
                  fill="#f59e0b"
                  opacity="0.3"
                />
              </svg>
            </div>
            <span style={s.logoText}>InboxIQ</span>
          </div>

          <button
            style={s.composeBtn}
            onClick={() => {
              setComposeData({ to: "", subject: "", body: "" });
              setShowCompose(true);
            }}
          >
            <Send size={14} />
            Compose
          </button>

          <nav style={s.nav}>
            {[
              { id: "inbox", label: "Inbox", icon: <Inbox size={16} /> },
              { id: "sent", label: "Sent", icon: <Send size={16} /> },
              { id: "archive", label: "Archive", icon: <Archive size={16} /> },
              { id: "bin", label: "Bin", icon: <Trash2 size={16} /> },
              { id: "search", label: "Search", icon: <Search size={16} /> },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                style={{ ...s.navBtn, ...(view === id ? s.navBtnActive : {}), ...(id === "bin" ? s.navBtnBin : {}) }}
                onClick={() => {
                  setView(id);
                  setSelectedEmail(null);
                  setSelectedEmails([]);
                  if (id === "search")
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
              >
                {icon}
                {label}
                {view === id && <span style={s.navIndicator} />}
              </button>
            ))}
          </nav>
        </div>

        <div style={s.sidebarBottom}>
          <button style={s.syncBtn} onClick={syncEmails} disabled={isSyncing}>
            <RefreshCw size={14} className={isSyncing ? "spin" : ""} />
            {isSyncing ? "Syncing…" : "Sync"}
          </button>

          <div style={s.userRow}>
            <div style={s.avatar}>
              <User size={13} color="#f59e0b" />
            </div>
            <div style={s.userMeta}>
              <span style={s.userName}>{userEmail?.split("@")[0]}</span>
              <span style={s.userStatus}>● Online</span>
            </div>
            <button style={s.logoutBtn} onClick={handleLogout} title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main style={s.main}>
        {view === "inbox" || view === "sent" || view === "archive" || view === "bin" ? (
          <>
            {/* EMAIL LIST */}
            <section style={s.listPane}>
              {/* Header */}
              <div style={s.listHeader}>
                <div style={s.listTitleRow}>
                  <h2 style={s.listTitle}>
                    {view === "inbox" ? "Inbox" : view === "sent" ? "Sent" : view === "archive" ? "Archive" : "Bin"}
                  </h2>
                  {selectedEmails.length > 0 && (
                    <div style={s.bulkBar}>
                      <span style={s.bulkCount}>
                        {selectedEmails.length} selected
                      </span>
                      {(view === "inbox" || view === "sent") && (
                        <button
                          style={s.bulkBtn}
                          onClick={() => handleBulkAction("archive")}
                        >
                          Archive
                        </button>
                      )}
                      {(view === "archive" || view === "bin") && (
                        <button
                          style={{ ...s.bulkBtn, color: "#34d399" }}
                          onClick={() => handleBulkAction("restore")}
                        >
                          Restore
                        </button>
                      )}
                      {view !== "bin" && (
                        <button
                          style={{ ...s.bulkBtn, color: "#f87171" }}
                          onClick={() => handleBulkAction("delete")}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Search bar */}
                <div style={s.searchBar}>
                  <Search
                    size={14}
                    style={{
                      color: "#475569",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                    onClick={askInbox}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Ask anything about your emails…"
                    style={s.searchInput}
                    value={query}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && askInbox()}
                  />
                  {isSearching && (
                    <RefreshCw
                      size={12}
                      className="spin"
                      style={{ color: "#f59e0b" }}
                    />
                  )}
                </div>

                {/* Category filters — only for inbox/sent */}
                {(view === "inbox" || view === "sent") && (
                <div style={s.filters}>
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
                        ...s.filterBtn,
                        ...(activeCategory === cat ? s.filterBtnActive : {}),
                      }}
                      onClick={() => setActiveCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                )}
              </div>

              {/* AI Answer card */}
              {aiAnswer && (
                <div style={s.aiCard}>
                  <div style={s.aiCardHeader}>
                    <Sparkles size={14} color="#f59e0b" />
                    <span style={s.aiCardLabel}>InboxIQ Answer</span>
                    <button
                      style={s.aiCardDismiss}
                      onClick={() => {
                        setAiAnswer("");
                        setSearchResults([]);
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <p style={s.aiCardText}>{aiAnswer}</p>
                </div>
              )}

              {/* Email list */}
              <div style={s.emailList} onScroll={handleScroll}>
                {filteredEmails.length > 0 && (
                  <div style={s.selectAllRow}>
                    <input
                      type="checkbox"
                      checked={
                        selectedEmails.length === filteredEmails.length &&
                        filteredEmails.length > 0
                      }
                      onChange={toggleSelectAll}
                      style={s.checkbox}
                    />
                    <span style={s.selectAllLabel}>Select All</span>
                  </div>
                )}

                {filteredEmails.length === 0 ? (
                  <div style={s.emptyState}>
                    {view === "archive" ? <Archive size={32} color="#1e293b" /> : view === "bin" ? <Trash2 size={32} color="#1e293b" /> : <Mail size={32} color="#1e293b" />}
                    <p>
                      {view === "archive" ? "No archived emails" : view === "bin" ? "Bin is empty" : "No emails in this category"}
                    </p>
                  </div>
                ) : (
                  filteredEmails.map((email) => (
                    <div
                      key={email._id}
                      style={{
                        ...s.emailItem,
                        ...(selectedEmail?._id === email._id
                          ? s.emailItemActive
                          : {}),
                        ...(selectedEmails.includes(email.messageId)
                          ? s.emailItemSelected
                          : {}),
                      }}
                      onClick={() => openEmail(email)}
                    >
                      <div style={s.emailItemTop}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedEmails.includes(email.messageId)}
                            onChange={(e) =>
                              toggleEmailSelection(email.messageId, e)
                            }
                            onClick={(e) => e.stopPropagation()}
                            style={s.checkbox}
                          />
                          <button
                            style={s.starBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              markStarStatus(email, !email.isStarred);
                            }}
                          >
                            <Star
                              size={13}
                              color={email.isStarred ? "#f59e0b" : "#334155"}
                              fill={email.isStarred ? "#f59e0b" : "none"}
                            />
                          </button>
                          <span
                            style={{
                              ...s.emailFrom,
                              ...(!email.isRead ? s.unread : {}),
                            }}
                          >
                            {email.from?.split("<")[0]?.trim() || email.from}
                          </span>
                        </div>
                        <span style={s.emailDate}>
                          {new Date(email.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div style={s.emailSubjectRow}>
                        {email.category &&
                          email.category !== "Uncategorized" && (
                            <span
                              style={{
                                ...s.catTag,
                                backgroundColor:
                                  categoryColors[email.category]?.bg ||
                                  "rgba(100,116,139,0.12)",
                                color:
                                  categoryColors[email.category]?.text ||
                                  "#94a3b8",
                              }}
                            >
                              {email.category}
                            </span>
                          )}
                        <span
                          style={{
                            ...s.emailSubject,
                            ...(!email.isRead ? s.unread : {}),
                          }}
                        >
                          {email.subject}
                        </span>
                      </div>

                      <div style={s.emailSnippet}>
                        {(email.snippet || email.body || "")
                          .substring(0, 100)
                          .replace(/<[^>]*>/g, "")}
                        …
                      </div>
                    </div>
                  ))
                )}

                {isLoadingMore && (
                  <div style={s.loadingMore}>
                    <RefreshCw size={14} className="spin" color="#475569" />
                  </div>
                )}
                {!hasMore && emails.length > 0 && (
                  <div style={s.endLabel}>— End of {view} —</div>
                )}
              </div>
            </section>

            {/* EMAIL DETAIL */}
            <section style={s.detailPane}>
              {selectedEmail ? (
                <div style={s.detailScroll}>
                  {/* Detail header */}
                  <div style={s.detailHeader}>
                    <h1 style={s.detailSubject}>{selectedEmail.subject}</h1>
                    <div style={s.detailActions}>
                      {view !== "bin" && (
                        <button
                          style={s.ghostBtn}
                          onClick={() =>
                            markReadStatus(selectedEmail, !selectedEmail.isRead)
                          }
                        >
                          {selectedEmail.isRead ? "Mark Unread" : "Mark Read"}
                        </button>
                      )}
                      {view !== "bin" && (
                        <button
                          style={s.ghostBtn}
                          onClick={() =>
                            markStarStatus(
                              selectedEmail,
                              !selectedEmail.isStarred,
                            )
                          }
                        >
                          {selectedEmail.isStarred ? "Unstar" : "Star"}
                        </button>
                      )}
                      {/* Archive button — only in inbox/sent */}
                      {(view === "inbox" || view === "sent") && (
                        <button
                          style={s.ghostBtn}
                          onClick={() => handleSingleAction("archive", selectedEmail.messageId)}
                          title="Archive"
                        >
                          <Archive size={12} /> Archive
                        </button>
                      )}
                      {/* Move to bin — inbox, sent, archive */}
                      {view !== "bin" && (
                        <button
                          style={{ ...s.ghostBtn, color: "#f87171" }}
                          onClick={() => handleSingleAction("delete", selectedEmail.messageId)}
                          title="Move to Bin"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                      {/* Restore from archive or bin */}
                      {(view === "archive" || view === "bin") && (
                        <button
                          style={{ ...s.ghostBtn, color: "#34d399" }}
                          onClick={() => handleSingleAction("restore", selectedEmail.messageId)}
                          title="Restore to Inbox"
                        >
                          <RotateCcw size={12} /> Restore
                        </button>
                      )}
                      {selectedEmail.from?.includes(userEmail) && view !== "bin" && (
                        <button
                          style={s.ghostBtn}
                          onClick={() => {
                            setComposeData({
                              to: selectedEmail.to || "",
                              subject: selectedEmail.subject,
                              body: selectedEmail.body,
                            });
                            setShowCompose(true);
                          }}
                        >
                          <RefreshCw size={12} /> Resend
                        </button>
                      )}
                      {selectedEmail.html && (
                        <button
                          style={s.ghostBtn}
                          onClick={() => setShowPlainText(!showPlainText)}
                        >
                          {showPlainText ? "Rich View" : "Plain Text"}
                        </button>
                      )}
                    </div>

                    <div style={s.metaBox}>
                      <div style={s.metaRow}>
                        <span style={s.metaKey}>From</span>
                        <span style={s.metaVal}>{selectedEmail.from}</span>
                      </div>
                      <div style={s.metaRow}>
                        <span style={s.metaKey}>Date</span>
                        <span style={s.metaVal}>
                          {new Date(selectedEmail.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thread */}
                  {threadEmails.length > 1 && (
                    <div style={s.threadBox}>
                      <div style={s.threadLabel}>
                        <MessageSquareText size={13} color="#f59e0b" />
                        Conversation · {threadEmails.length} messages
                      </div>
                      {threadEmails.map((tm) => (
                        <button
                          key={tm.messageId}
                          style={{
                            ...s.threadItem,
                            ...(selectedEmail.messageId === tm.messageId
                              ? s.threadItemActive
                              : {}),
                          }}
                          onClick={() => setSelectedEmail(tm)}
                        >
                          <span style={s.threadFrom}>
                            {tm.from?.split("<")[0]?.trim() || tm.from}
                          </span>
                          <span style={s.threadDate}>
                            {new Date(tm.createdAt).toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Body */}
                  <div style={s.bodyBox}>
                    {selectedEmail.html && !showPlainText ? (
                      <iframe
                        title="Email Content"
                        srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
                          body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#e2e8f0;background:#0f1525;margin:0;padding:20px;}
                          img{max-width:100%;height:auto;}a{color:#f59e0b;}*{box-sizing:border-box;}
                        </style></head><body>${sanitizeEmailHtml(selectedEmail.html)}</body></html>`}
                        style={s.iframe}
                        onLoad={(e) => {
                          try {
                            const h =
                              e.target.contentWindow.document.documentElement
                                .scrollHeight;
                            e.target.style.height = h + 50 + "px";
                          } catch {
                            e.target.style.height = "800px";
                          }
                        }}
                      />
                    ) : (
                      <pre style={s.plainBody}>{selectedEmail.body}</pre>
                    )}
                  </div>

                  {/* Attachments */}
                  {selectedEmail.attachments?.length > 0 && (
                    <div style={s.attachBox}>
                      <div style={s.attachHeader}>
                        <Paperclip size={13} color="#94a3b8" />
                        <span>
                          Attachments ({selectedEmail.attachments.length})
                        </span>
                      </div>
                      <div style={s.attachList}>
                        {selectedEmail.attachments.map((att) => (
                          <div
                            key={att.attachmentId}
                            style={s.attachItem}
                            onClick={() =>
                              downloadAttachment(
                                selectedEmail.messageId,
                                att.attachmentId,
                                att.filename,
                              )
                            }
                          >
                            <Mail size={12} color="#94a3b8" />
                            <span style={s.attachName}>{att.filename}</span>
                            <span style={s.attachSize}>
                              ({(att.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Reply */}
                  <div style={s.aiReplyBox}>
                    <div style={s.aiReplyHeader}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Sparkles size={15} color="#f59e0b" />
                        <span style={s.aiReplyTitle}>AI Smart Reply</span>
                      </div>
                      <div style={s.toneRow}>
                        <select
                          value={replyTone}
                          onChange={(e) => setReplyTone(e.target.value)}
                          style={s.toneSelect}
                        >
                          <option value="formal">Formal</option>
                          <option value="casual">Casual</option>
                          <option value="short">Short</option>
                          <option value="detailed">Detailed</option>
                        </select>
                        <button
                          style={s.generateBtn}
                          onClick={generateReply}
                          disabled={isGeneratingReply}
                        >
                          {isGeneratingReply ? (
                            <RefreshCw size={13} className="spin" />
                          ) : (
                            <Sparkles size={13} />
                          )}
                          {isGeneratingReply ? "Generating…" : "Generate"}
                        </button>
                      </div>
                    </div>

                    {aiReply && (
                      <div style={s.aiReplyContent}>
                        <div style={s.draftLabel}>Draft Reply</div>
                        <pre style={s.draftText}>{aiReply.reply}</pre>
                        <div style={s.draftActions}>
                          <button
                            style={s.actionBtn}
                            onClick={() =>
                              navigator.clipboard.writeText(aiReply.reply)
                            }
                          >
                            Copy
                          </button>
                          <button
                            style={s.actionBtn}
                            onClick={() =>
                              saveDraft(
                                aiReply.replyTo,
                                aiReply.subject,
                                aiReply.reply,
                              )
                            }
                            disabled={isSavingDraft}
                          >
                            {isSavingDraft ? "Saving…" : "Save Draft"}
                          </button>
                          <button
                            style={s.sendBtn}
                            onClick={() =>
                              sendEmail(
                                aiReply.replyTo,
                                aiReply.subject,
                                aiReply.reply,
                              )
                            }
                            disabled={isSendingEmail}
                          >
                            <Send size={13} />
                            {isSendingEmail ? "Sending…" : "Send Reply"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={s.detailEmpty}>
                  <div style={s.detailEmptyIcon}>
                    <Mail size={28} color="#f59e0b" opacity="0.6" />
                  </div>
                  <p style={s.detailEmptyText}>Select an email to read</p>
                  <p style={s.detailEmptyMuted}>
                    Your conversations will appear here
                  </p>
                </div>
              )}
            </section>
          </>
        ) : (
          /* SEARCH VIEW */
          <section style={s.searchPane}>
            <div style={s.searchHero}>
              <div style={s.searchHeroIcon}>
                <Sparkles size={24} color="#f59e0b" />
              </div>
              <h1 style={s.searchHeroTitle}>Semantic Search</h1>
              <p style={s.searchHeroSub}>
                Ask anything about your emails in plain language
              </p>
              <div style={s.searchBarLarge}>
                <Search size={18} color="#475569" style={{ flexShrink: 0 }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="e.g. 'Did anyone send me a contract last month?'"
                  style={s.searchInputLarge}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && askInbox()}
                />
                <button
                  style={s.searchHeroBtn}
                  onClick={askInbox}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <RefreshCw size={16} className="spin" />
                  ) : (
                    "Search"
                  )}
                </button>
              </div>
            </div>

            {aiAnswer && (
              <div style={s.aiAnswerLarge}>
                <div style={s.aiAnswerLargeHeader}>
                  <Sparkles size={16} color="#f59e0b" />
                  <span>InboxIQ Answer</span>
                </div>
                <p style={s.aiAnswerLargeText}>{aiAnswer}</p>
              </div>
            )}

            <div style={s.searchGrid}>
              {searchResults.map((email) => (
                <div key={email._id} style={s.searchCard}>
                  <div style={s.searchCardHeader}>
                    <span style={s.searchCardFrom}>
                      {email.from?.split("<")[0]?.trim() || email.from}
                    </span>
                    <span style={s.searchCardDate}>
                      {new Date(email.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 style={s.searchCardSubject}>{email.subject}</h3>
                  <p style={s.searchCardSnippet}>
                    {email.body?.substring(0, 200).replace(/<[^>]*>/g, "")}…
                  </p>
                  <div style={s.searchCardActions}>
                    <button
                      style={s.searchViewBtn}
                      onClick={() => {
                        setSelectedEmail(email);
                        setView("inbox");
                      }}
                    >
                      View Email
                    </button>
                    <button
                      style={s.searchReplyBtn}
                      onClick={() => {
                        setSelectedEmail(email);
                        setView("inbox");
                        setTimeout(generateReply, 500);
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
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <span style={s.modalTitle}>New Message</span>
              <button
                style={s.modalClose}
                onClick={() => setShowCompose(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div style={s.modalBody}>
              <input
                type="text"
                placeholder="To"
                style={s.modalInput}
                value={composeData.to}
                onChange={(e) =>
                  setComposeData({ ...composeData, to: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Subject"
                style={s.modalInput}
                value={composeData.subject}
                onChange={(e) =>
                  setComposeData({ ...composeData, subject: e.target.value })
                }
              />
              <textarea
                placeholder="Message…"
                style={s.modalTextarea}
                value={composeData.body}
                onChange={(e) =>
                  setComposeData({ ...composeData, body: e.target.value })
                }
              />
            </div>
            <div style={s.modalFooter}>
              <button
                style={s.modalDraftBtn}
                onClick={() =>
                  saveDraft(
                    composeData.to,
                    composeData.subject,
                    composeData.body,
                  )
                }
                disabled={isSavingDraft}
              >
                {isSavingDraft ? "Saving…" : "Save Draft"}
              </button>
              <button
                style={s.modalSendBtn}
                onClick={() =>
                  sendEmail(
                    composeData.to,
                    composeData.subject,
                    composeData.body,
                  )
                }
                disabled={isSendingEmail}
              >
                <Send size={14} />
                {isSendingEmail ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }

        input[type="checkbox"] {
          accent-color: #f59e0b;
          width: 14px;
          height: 14px;
          cursor: pointer;
        }

        select option {
          background: #0f1525;
          color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}

/* ─── STYLES ─── */
const C = {
  bg: "#080c18",
  sidebar: "#0a0e1a",
  panel: "#0d1221",
  surface: "#0f1525",
  border: "rgba(255,255,255,0.05)",
  borderHi: "rgba(245,158,11,0.2)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.1)",
  text: "#e2e8f0",
  textMid: "#94a3b8",
  textDim: "#475569",
  textFaint: "#334155",
};

const s = {
  root: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    backgroundColor: C.bg,
    fontFamily: "'Sora', sans-serif",
    color: C.text,
  },

  /* SIDEBAR */
  sidebar: {
    width: "220px",
    flexShrink: 0,
    backgroundColor: C.sidebar,
    borderRight: `1px solid ${C.border}`,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "24px 16px",
  },
  sidebarTop: { display: "flex", flexDirection: "column", gap: "24px" },
  sidebarBottom: { display: "flex", flexDirection: "column", gap: "12px" },

  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    paddingLeft: "4px",
  },
  logoMark: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: C.amberDim,
    border: `1px solid ${C.borderHi}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: "17px",
    fontWeight: "700",
    color: C.text,
    letterSpacing: "-0.3px",
  },

  composeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px",
    borderRadius: "10px",
    backgroundColor: C.amber,
    border: "none",
    color: "#0a0e1a",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },

  nav: { display: "flex", flexDirection: "column", gap: "2px" },
  navBtn: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "8px",
    backgroundColor: "transparent",
    border: "none",
    color: C.textMid,
    fontSize: "13px",
    fontWeight: "500",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    position: "relative",
    transition: "all 0.15s",
  },
  navBtnActive: {
    backgroundColor: C.amberDim,
    color: C.amber,
    border: `1px solid ${C.borderHi}`,
  },
  navBtnBin: {
    color: "rgba(248,113,113,0.7)",
  },
  navIndicator: {
    position: "absolute",
    right: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: C.amber,
  },

  syncBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    padding: "8px 12px",
    borderRadius: "8px",
    backgroundColor: "transparent",
    border: `1px solid ${C.border}`,
    color: C.textDim,
    fontSize: "12px",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 8px",
    borderRadius: "8px",
    backgroundColor: C.amberDim,
    border: `1px solid ${C.border}`,
  },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    backgroundColor: "rgba(245,158,11,0.15)",
    border: `1px solid ${C.borderHi}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userMeta: { flex: 1, overflow: "hidden" },
  userName: {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    color: C.text,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  userStatus: {
    display: "block",
    fontSize: "10px",
    color: "#34d399",
    fontFamily: "'JetBrains Mono', monospace",
  },
  logoutBtn: {
    background: "none",
    border: "none",
    color: C.textDim,
    cursor: "pointer",
    padding: "2px",
    display: "flex",
    alignItems: "center",
  },

  /* MAIN */
  main: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
    backgroundColor: C.panel,
  },

  /* LIST PANE */
  listPane: {
    width: "340px",
    flexShrink: 0,
    borderRight: `1px solid ${C.border}`,
    display: "flex",
    flexDirection: "column",
    backgroundColor: C.surface,
  },
  listHeader: {
    padding: "20px 16px 0",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  listTitleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: C.text,
    letterSpacing: "-0.3px",
  },

  bulkBar: { display: "flex", alignItems: "center", gap: "8px" },
  bulkCount: {
    fontSize: "11px",
    color: C.textMid,
    fontFamily: "'JetBrains Mono', monospace",
  },
  bulkBtn: {
    padding: "4px 10px",
    borderRadius: "6px",
    backgroundColor: "rgba(255,255,255,0.04)",
    border: `1px solid ${C.border}`,
    color: C.textMid,
    fontSize: "11px",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
  },

  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "0 12px",
    borderRadius: "8px",
    backgroundColor: C.panel,
    border: `1px solid ${C.border}`,
    height: "38px",
  },
  searchInput: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    color: C.text,
    fontSize: "13px",
    fontFamily: "'Sora', sans-serif",
  },

  filters: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    paddingBottom: "12px",
    borderBottom: `1px solid ${C.border}`,
  },
  filterBtn: {
    padding: "4px 12px",
    borderRadius: "20px",
    backgroundColor: "transparent",
    border: `1px solid ${C.border}`,
    color: C.textDim,
    fontSize: "11px",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  filterBtnActive: {
    backgroundColor: C.amberDim,
    border: `1px solid ${C.borderHi}`,
    color: C.amber,
  },

  aiCard: {
    margin: "12px 16px 0",
    padding: "12px",
    borderRadius: "10px",
    backgroundColor: "rgba(245,158,11,0.06)",
    border: `1px solid rgba(245,158,11,0.15)`,
    animation: "fadeIn 0.3s ease",
  },
  aiCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  aiCardLabel: { fontSize: "12px", fontWeight: "600", color: C.amber, flex: 1 },
  aiCardDismiss: {
    background: "none",
    border: "none",
    color: C.textDim,
    cursor: "pointer",
    display: "flex",
  },
  aiCardText: { fontSize: "13px", color: C.text, lineHeight: "1.6" },

  emailList: { flex: 1, overflowY: "auto", padding: "8px 0" },

  selectAllRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
  },
  selectAllLabel: { fontSize: "11px", color: C.textDim },
  checkbox: { accentColor: C.amber },

  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    height: "200px",
    color: C.textFaint,
    fontSize: "13px",
  },
  loadingMore: { display: "flex", justifyContent: "center", padding: "16px" },
  endLabel: {
    textAlign: "center",
    padding: "16px",
    fontSize: "11px",
    color: C.textFaint,
    fontFamily: "'JetBrains Mono', monospace",
  },

  emailItem: {
    padding: "14px 16px",
    borderBottom: `1px solid ${C.border}`,
    cursor: "pointer",
    transition: "background 0.1s",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  emailItemActive: {
    backgroundColor: "rgba(245,158,11,0.06)",
    borderLeft: `2px solid ${C.amber}`,
  },
  emailItemSelected: { backgroundColor: "rgba(245,158,11,0.04)" },

  emailItemTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emailFrom: {
    fontSize: "13px",
    fontWeight: "500",
    color: C.textMid,
    maxWidth: "140px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  unread: { color: C.text, fontWeight: "600" },
  emailDate: {
    fontSize: "11px",
    color: C.textDim,
    fontFamily: "'JetBrains Mono', monospace",
    flexShrink: 0,
  },

  starBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },

  emailSubjectRow: { display: "flex", alignItems: "center", gap: "8px" },
  emailSubject: {
    fontSize: "13px",
    color: C.textMid,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  catTag: {
    flexShrink: 0,
    fontSize: "10px",
    fontWeight: "600",
    padding: "2px 7px",
    borderRadius: "20px",
    fontFamily: "'JetBrains Mono', monospace",
  },

  emailSnippet: {
    fontSize: "12px",
    color: C.textFaint,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  /* DETAIL PANE */
  detailPane: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  detailScroll: { flex: 1, overflowY: "auto", padding: "0" },

  detailEmpty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    height: "100%",
  },
  detailEmptyIcon: {
    width: "64px",
    height: "64px",
    borderRadius: "16px",
    backgroundColor: C.amberDim,
    border: `1px solid ${C.borderHi}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  detailEmptyText: { fontSize: "16px", fontWeight: "600", color: C.textMid },
  detailEmptyMuted: { fontSize: "13px", color: C.textDim },

  detailHeader: {
    padding: "24px 28px 20px",
    borderBottom: `1px solid ${C.border}`,
    backgroundColor: C.surface,
    flexShrink: 0,
  },
  detailSubject: {
    fontSize: "18px",
    fontWeight: "700",
    color: C.text,
    letterSpacing: "-0.3px",
    lineHeight: "1.3",
    marginBottom: "14px",
  },
  detailActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },
  ghostBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 12px",
    borderRadius: "6px",
    backgroundColor: "transparent",
    border: `1px solid ${C.border}`,
    color: C.textMid,
    fontSize: "12px",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  metaBox: { display: "flex", flexDirection: "column", gap: "6px" },
  metaRow: { display: "flex", gap: "12px", alignItems: "flex-start" },
  metaKey: {
    fontSize: "11px",
    color: C.textDim,
    fontFamily: "'JetBrains Mono', monospace",
    width: "36px",
    flexShrink: 0,
    paddingTop: "1px",
  },
  metaVal: { fontSize: "13px", color: C.textMid, wordBreak: "break-all" },

  threadBox: {
    margin: "20px 28px",
    borderRadius: "10px",
    backgroundColor: C.panel,
    border: `1px solid ${C.border}`,
    overflow: "hidden",
  },
  threadLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    fontSize: "12px",
    fontWeight: "600",
    color: C.textMid,
    borderBottom: `1px solid ${C.border}`,
    backgroundColor: C.surface,
  },
  threadItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    width: "100%",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: `1px solid ${C.border}`,
    cursor: "pointer",
    fontFamily: "'Sora', sans-serif",
  },
  threadItemActive: { backgroundColor: C.amberDim },
  threadFrom: { fontSize: "12px", color: C.text, fontWeight: "500" },
  threadDate: {
    fontSize: "11px",
    color: C.textDim,
    fontFamily: "'JetBrains Mono', monospace",
  },

  bodyBox: { padding: "20px 28px" },
  plainBody: {
    whiteSpace: "pre-wrap",
    fontSize: "13px",
    color: C.text,
    lineHeight: "1.7",
    padding: "20px",
    backgroundColor: C.panel,
    borderRadius: "10px",
    border: `1px solid ${C.border}`,
    fontFamily: "'JetBrains Mono', monospace",
  },
  iframe: {
    width: "100%",
    border: "none",
    borderRadius: "10px",
    minHeight: "300px",
    display: "block",
  },

  attachBox: {
    margin: "0 28px 20px",
    borderRadius: "10px",
    border: `1px solid ${C.border}`,
    overflow: "hidden",
  },
  attachHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    fontSize: "12px",
    fontWeight: "600",
    color: C.textMid,
    backgroundColor: C.surface,
    borderBottom: `1px solid ${C.border}`,
  },
  attachList: { padding: "8px" },
  attachItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background 0.1s",
  },
  attachName: { fontSize: "12px", color: C.text, flex: 1 },
  attachSize: {
    fontSize: "11px",
    color: C.textDim,
    fontFamily: "'JetBrains Mono', monospace",
  },

  aiReplyBox: {
    margin: "0 28px 28px",
    borderRadius: "12px",
    border: `1px solid rgba(245,158,11,0.15)`,
    backgroundColor: "rgba(245,158,11,0.03)",
    overflow: "hidden",
  },
  aiReplyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: `1px solid rgba(245,158,11,0.1)`,
    flexWrap: "wrap",
    gap: "10px",
  },
  aiReplyTitle: { fontSize: "13px", fontWeight: "600", color: C.text },
  toneRow: { display: "flex", alignItems: "center", gap: "8px" },
  toneSelect: {
    padding: "6px 10px",
    borderRadius: "6px",
    backgroundColor: C.panel,
    border: `1px solid ${C.border}`,
    color: C.textMid,
    fontSize: "12px",
    fontFamily: "'Sora', sans-serif",
    outline: "none",
    cursor: "pointer",
  },
  generateBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 14px",
    borderRadius: "6px",
    backgroundColor: C.amber,
    border: "none",
    color: "#0a0e1a",
    fontSize: "12px",
    fontWeight: "600",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
  },

  aiReplyContent: { padding: "16px" },
  draftLabel: {
    fontSize: "11px",
    color: C.amber,
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: "10px",
    fontWeight: "600",
  },
  draftText: {
    whiteSpace: "pre-wrap",
    fontSize: "13px",
    color: C.text,
    lineHeight: "1.7",
    padding: "14px",
    backgroundColor: C.panel,
    borderRadius: "8px",
    border: `1px solid ${C.border}`,
    fontFamily: "'JetBrains Mono', monospace",
    marginBottom: "12px",
  },
  draftActions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  actionBtn: {
    padding: "7px 14px",
    borderRadius: "6px",
    backgroundColor: "transparent",
    border: `1px solid ${C.border}`,
    color: C.textMid,
    fontSize: "12px",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
  },
  sendBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 16px",
    borderRadius: "6px",
    backgroundColor: C.amber,
    border: "none",
    color: "#0a0e1a",
    fontSize: "12px",
    fontWeight: "600",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
    marginLeft: "auto",
  },

  /* SEARCH PANE */
  searchPane: { flex: 1, overflowY: "auto", padding: "40px 32px" },
  searchHero: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    marginBottom: "32px",
  },
  searchHeroIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "14px",
    backgroundColor: C.amberDim,
    border: `1px solid ${C.borderHi}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  searchHeroTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: C.text,
    letterSpacing: "-0.5px",
  },
  searchHeroSub: { fontSize: "14px", color: C.textDim, marginBottom: "8px" },
  searchBarLarge: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "0 16px",
    borderRadius: "12px",
    backgroundColor: C.surface,
    border: `1px solid ${C.border}`,
    height: "52px",
    width: "100%",
    maxWidth: "600px",
  },
  searchInputLarge: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    color: C.text,
    fontSize: "15px",
    fontFamily: "'Sora', sans-serif",
  },
  searchHeroBtn: {
    padding: "8px 20px",
    borderRadius: "8px",
    backgroundColor: C.amber,
    border: "none",
    color: "#0a0e1a",
    fontSize: "14px",
    fontWeight: "600",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
    flexShrink: 0,
  },

  aiAnswerLarge: {
    padding: "20px 24px",
    borderRadius: "12px",
    backgroundColor: "rgba(245,158,11,0.06)",
    border: `1px solid rgba(245,158,11,0.15)`,
    marginBottom: "28px",
    animation: "fadeIn 0.3s ease",
  },
  aiAnswerLargeHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  aiAnswerLargeText: { fontSize: "14px", color: C.text, lineHeight: "1.7" },

  searchGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "16px",
  },
  searchCard: {
    padding: "20px",
    borderRadius: "12px",
    backgroundColor: C.surface,
    border: `1px solid ${C.border}`,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    transition: "border-color 0.2s",
  },
  searchCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchCardFrom: { fontSize: "12px", fontWeight: "600", color: C.amber },
  searchCardDate: {
    fontSize: "11px",
    color: C.textDim,
    fontFamily: "'JetBrains Mono', monospace",
  },
  searchCardSubject: {
    fontSize: "14px",
    fontWeight: "600",
    color: C.text,
    lineHeight: "1.4",
  },
  searchCardSnippet: {
    fontSize: "12px",
    color: C.textMid,
    lineHeight: "1.6",
    flex: 1,
  },
  searchCardActions: { display: "flex", gap: "8px", marginTop: "4px" },
  searchViewBtn: {
    flex: 1,
    padding: "8px",
    borderRadius: "6px",
    backgroundColor: "transparent",
    border: `1px solid ${C.border}`,
    color: C.textMid,
    fontSize: "12px",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
  },
  searchReplyBtn: {
    flex: 1,
    padding: "8px",
    borderRadius: "6px",
    backgroundColor: C.amberDim,
    border: `1px solid ${C.borderHi}`,
    color: C.amber,
    fontSize: "12px",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
  },

  /* COMPOSE MODAL */
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    width: "520px",
    borderRadius: "16px",
    backgroundColor: C.surface,
    border: `1px solid ${C.border}`,
    boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
    overflow: "hidden",
    animation: "fadeIn 0.25s ease",
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 20px",
    borderBottom: `1px solid ${C.border}`,
  },
  modalTitle: { fontSize: "15px", fontWeight: "600", color: C.text },
  modalClose: {
    background: "none",
    border: "none",
    color: C.textDim,
    cursor: "pointer",
    display: "flex",
    padding: "2px",
  },
  modalBody: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  modalInput: {
    padding: "10px 14px",
    borderRadius: "8px",
    backgroundColor: C.panel,
    border: `1px solid ${C.border}`,
    color: C.text,
    fontSize: "13px",
    fontFamily: "'Sora', sans-serif",
    outline: "none",
  },
  modalTextarea: {
    padding: "10px 14px",
    borderRadius: "8px",
    backgroundColor: C.panel,
    border: `1px solid ${C.border}`,
    color: C.text,
    fontSize: "13px",
    fontFamily: "'Sora', sans-serif",
    outline: "none",
    resize: "vertical",
    minHeight: "200px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  modalFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "14px 20px",
    borderTop: `1px solid ${C.border}`,
  },
  modalDraftBtn: {
    padding: "9px 18px",
    borderRadius: "8px",
    backgroundColor: "transparent",
    border: `1px solid ${C.border}`,
    color: C.textMid,
    fontSize: "13px",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
  },
  modalSendBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 20px",
    borderRadius: "8px",
    backgroundColor: C.amber,
    border: "none",
    color: "#0a0e1a",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "'Sora', sans-serif",
    cursor: "pointer",
  },
};
