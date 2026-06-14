import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { likePost, commentPost, editPost, deletePost, deleteComment, replyComment, deleteReply } from '../../utils/api';
import Avatar from '../Avatar';

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PostMenu({ onEdit, onDelete, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full right-0 mt-1 z-30 bg-card border border-brd rounded-xl shadow-xl min-w-[140px] py-1 animate-fade-in">
      <button onClick={() => { onEdit(); onClose(); }}
        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors">
        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit caption
      </button>
      <button onClick={() => { onDelete(); onClose(); }}
        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2.5 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete post
      </button>
    </div>
  );
}

/* ── Comment + replies ─────────────────────────────────────────── */
function CommentItem({ comment, postId, postOwnerId, currentUser, onPostUpdated }) {
  const navigate = useNavigate();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  const [sending, setSending] = useState(false);

  const myId = String(currentUser._id);
  const isCommentOwner = String(comment.user?._id || comment.user) === myId;
  const isPostOwner = String(postOwnerId) === myId;
  const canDelete = isCommentOwner || isPostOwner;
  const replies = comment.replies || [];

  const goTo = (user) => {
    const id = user?.username || user?._id;
    if (id) navigate(`/user/${id}`);
  };

  const handleDeleteComment = async () => {
    try {
      const res = await deleteComment(postId, String(comment._id), myId);
      onPostUpdated(res.data);
    } catch (err) {
      alert(err?.response?.data?.error || 'Could not delete comment');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await replyComment(postId, String(comment._id), myId, replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
      setShowReplies(true);
      onPostUpdated(res.data);
    } catch (err) {
      alert(err?.response?.data?.error || 'Could not send reply');
    }
    setSending(false);
  };

  const handleDeleteReply = async (replyId) => {
    try {
      const res = await deleteReply(postId, String(comment._id), String(replyId), myId);
      onPostUpdated(res.data);
    } catch (err) {
      alert(err?.response?.data?.error || 'Could not delete reply');
    }
  };

  return (
    <div>
      {/* Comment bubble */}
      <div className="flex items-start gap-2">
        <button onClick={() => goTo(comment.user)} className="flex-shrink-0 mt-0.5">
          <Avatar user={comment.user} size={7} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="bg-bg rounded-xl px-3 py-2 border border-brd">
            <button onClick={() => goTo(comment.user)}
              className="font-bold text-xs text-accent hover:underline mr-1">
              {comment.user?.displayName}
            </button>
            <span className="text-xs text-white/70">{comment.text}</span>
          </div>
          <div className="flex items-center gap-3 px-1 mt-1">
            <span className="text-[10px] text-white/20">{timeAgo(comment.createdAt)}</span>
            <button onClick={() => { setShowReplyInput(v => !v); setReplyText(''); }}
              className="text-[10px] text-white/40 hover:text-accent transition-colors font-semibold">
              Reply
            </button>
            {replies.length > 0 && (
              <button onClick={() => setShowReplies(v => !v)}
                className="text-[10px] text-white/40 hover:text-accent transition-colors font-semibold">
                {showReplies ? 'Hide' : `${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}`}
              </button>
            )}
          </div>
        </div>
        {canDelete && (
          <button onClick={handleDeleteComment}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 active:text-red-400 transition-colors mt-0.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Reply input */}
      {showReplyInput && (
        <form onSubmit={handleReply} className="flex items-center gap-2 ml-9 mt-1.5">
          <Avatar user={currentUser} size={6} />
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder={`Reply to ${comment.user?.displayName}…`}
            autoFocus
            className="flex-1 text-xs bg-bg rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent/40 border border-brd text-white placeholder-white/20"
          />
          <button type="submit" disabled={!replyText.trim() || sending}
            className="text-accent text-xs font-bold disabled:opacity-30 px-1 transition-opacity">
            {sending ? '…' : 'Send'}
          </button>
          <button type="button" onClick={() => { setShowReplyInput(false); setReplyText(''); }}
            className="text-white/30 text-xs px-1">✕</button>
        </form>
      )}

      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className="ml-9 mt-1.5 space-y-1.5 border-l-2 border-white/5 pl-3">
          {replies.map((reply, ri) => {
            const isReplyOwner = String(reply.user?._id || reply.user) === myId;
            const canDelReply = isReplyOwner || isPostOwner;
            return (
              <div key={reply._id || ri} className="flex items-start gap-2">
                <button onClick={() => goTo(reply.user)} className="flex-shrink-0 mt-0.5">
                  <Avatar user={reply.user} size={6} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="bg-bg rounded-xl px-3 py-1.5 border border-brd">
                    <button onClick={() => goTo(reply.user)}
                      className="font-bold text-[11px] text-accent hover:underline mr-1">
                      {reply.user?.displayName}
                    </button>
                    <span className="text-[11px] text-white/70">{reply.text}</span>
                  </div>
                  <span className="text-[10px] text-white/20 px-1">{timeAgo(reply.createdAt)}</span>
                </div>
                {canDelReply && (
                  <button onClick={() => handleDeleteReply(reply._id)}
                    className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 active:text-red-400 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Post card ─────────────────────────────────────────────────── */
export default function PostCard({ post: initialPost, onUpdate }) {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  // Keep local copy so operations update immediately without waiting for parent refetch
  const [post, setPost] = useState(initialPost);
  useEffect(() => { setPost(initialPost); }, [initialPost]);

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [imgIndex, setImgIndex] = useState(0);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const myId = String(currentUser._id);
  const isLiked = post.likes?.map(String).includes(myId);
  const isOwner = String(post.user?._id || post.user) === myId;
  const postOwnerId = post.user?._id || post.user;

  if (deleted) return null;

  const goToProfile = () => {
    const id = post.user?.username || post.user?._id;
    if (id) navigate(`/user/${id}`);
  };

  // Called by CommentItem with the full updated post from the server
  const handlePostUpdated = (updatedPost) => {
    setPost(updatedPost);
    onUpdate?.();
  };

  const handleLike = async () => {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 600);
    try {
      const res = await likePost(post._id, myId);
      setPost(p => ({ ...p, likes: res.data.likes }));
      onUpdate?.();
    } catch {}
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await commentPost(post._id, myId, commentText.trim());
      setPost(res.data);
      setCommentText('');
      setShowComments(true);
      onUpdate?.();
    } catch {}
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await editPost(post._id, myId, editCaption);
      setPost(res.data);
      setEditing(false);
      onUpdate?.();
    } catch {}
  };

  const handleDelete = async () => {
    try {
      await deletePost(post._id, myId);
      setDeleted(true);
      onUpdate?.();
    } catch {}
  };

  return (
    <div className="card relative overflow-hidden border-brd hover:border-accent/10 transition-all duration-300 animate-fade-in"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={goToProfile} className="flex-shrink-0">
          <Avatar user={post.user} size={10} />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={goToProfile} className="font-bold text-sm text-white hover:text-accent transition-colors block truncate">
            {post.user?.displayName}
          </button>
          <p className="text-xs text-white/30">{timeAgo(post.createdAt)}</p>
        </div>
        {isOwner && (
          <div className="relative">
            <button onClick={() => setShowMenu(v => !v)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white/20 hover:text-white hover:bg-white/5 transition-all">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {showMenu && (
              <PostMenu
                onEdit={() => { setEditing(true); setEditCaption(post.caption || ''); }}
                onDelete={() => setShowDeleteConfirm(true)}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* Edit caption */}
      {editing && (
        <form onSubmit={handleEdit} className="px-4 pb-3">
          <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)}
            rows={3} className="w-full input resize-none text-sm mb-2" autoFocus />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-xs px-4 py-1.5">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-xs px-4 py-1.5">Cancel</button>
          </div>
        </form>
      )}

      {/* Caption */}
      {!editing && post.caption && (
        <div className="px-4 pb-3">
          <p className="text-sm text-white/80 leading-relaxed">
            <button onClick={goToProfile} className="font-bold text-white hover:text-accent transition-colors mr-1">
              {post.user?.displayName}
            </button>
            {post.caption}
          </p>
        </div>
      )}

      {/* Images */}
      {post.images?.length > 0 && (
        <div className="relative bg-bg/50">
          <img src={post.images[imgIndex]} className="w-full max-h-96 object-contain" alt="Post" />
          {post.images.length > 1 && (
            <>
              {imgIndex > 0 && (
                <button onClick={() => setImgIndex(i => i - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-bg/80 border border-brd text-white flex items-center justify-center">‹</button>
              )}
              {imgIndex < post.images.length - 1 && (
                <button onClick={() => setImgIndex(i => i + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-bg/80 border border-brd text-white flex items-center justify-center">›</button>
              )}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {post.images.map((_, i) => (
                  <div key={i} className={`rounded-full transition-all ${i === imgIndex ? 'w-4 h-1.5 bg-accent' : 'w-1.5 h-1.5 bg-white/30'}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center gap-5 mb-3">
          <button onClick={handleLike}
            className={`flex items-center gap-2 transition-all duration-200 ${isLiked ? 'text-red-400' : 'text-white/40 hover:text-red-400'} ${likeAnim ? 'scale-125' : ''}`}>
            <svg className="w-6 h-6" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-sm font-semibold">{post.likes?.length || 0}</span>
          </button>
          <button onClick={() => setShowComments(v => !v)}
            className={`flex items-center gap-2 transition-colors ${showComments ? 'text-accent' : 'text-white/40 hover:text-accent'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-semibold">{post.comments?.length || 0}</span>
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="space-y-3 mb-3">
            {post.comments?.length === 0 && (
              <p className="text-xs text-white/20 text-center py-2">No comments yet</p>
            )}
            {post.comments?.map((c, i) => (
              <CommentItem
                key={c._id || i}
                comment={c}
                postId={post._id}
                postOwnerId={postOwnerId}
                currentUser={currentUser}
                onPostUpdated={handlePostUpdated}
              />
            ))}
          </div>
        )}

        {/* Add comment */}
        <form onSubmit={handleComment} className="flex items-center gap-2">
          <Avatar user={currentUser} size={7} />
          <input value={commentText} onChange={e => setCommentText(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 text-sm bg-bg rounded-full px-4 py-2 focus:outline-none focus:ring-1 focus:ring-accent/40 border border-brd text-white placeholder-white/20 transition-all" />
          <button type="submit" disabled={!commentText.trim()}
            className="text-accent font-bold text-sm disabled:opacity-20 transition-colors">Post</button>
        </form>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-20 p-4 rounded-2xl">
          <div className="card p-5 w-full max-w-xs border-brd shadow-xl">
            <div className="text-3xl mb-3 text-center">🗑️</div>
            <h3 className="font-black text-white text-center mb-1">Delete Post?</h3>
            <p className="text-white/40 text-xs text-center mb-4">This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn-secondary py-2 text-sm">Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 py-2 text-sm rounded-xl font-bold"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
