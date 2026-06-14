import { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { createPost } from '../../utils/api';
import Avatar from '../Avatar';

export default function CreatePost({ onPostCreated }) {
  const { currentUser } = useApp();
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef();

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
    setExpanded(true);
  };

  const removeImage = (i) => {
    setImages(imgs => imgs.filter((_, idx) => idx !== i));
    setPreviews(ps => ps.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption.trim() && images.length === 0) return;
    setLoading(true);
    try {
      await createPost({ userId: currentUser._id, caption, images });
      setCaption('');
      setImages([]);
      setPreviews([]);
      setExpanded(false);
      onPostCreated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4 border-brd hover:border-accent/20 transition-colors duration-300">
      <div className="flex gap-3">
        <Avatar user={currentUser} size={10} />
        <div className="flex-1">
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            onFocus={() => setExpanded(true)}
            placeholder="What's on your mind?"
            rows={expanded ? 3 : 1}
            className="w-full resize-none bg-bg border border-brd rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-all"
          />

          {previews.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {previews.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p} className="w-20 h-20 object-cover rounded-xl ring-1 ring-accent/20" alt="" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {expanded && (
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="flex items-center gap-2 text-white/30 hover:text-accent text-sm font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add Photos
              </button>
              <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />
              <button
                onClick={handleSubmit}
                disabled={loading || (!caption.trim() && images.length === 0)}
                className="btn-primary text-sm px-6 py-2"
              >
                {loading ? 'Posting...' : 'Share'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
